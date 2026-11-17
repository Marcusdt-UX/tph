<?php
/**
 * TPH Secure Upload: public upload endpoint.
 *
 * Flow (all bodies are ciphertext produced in the browser):
 *   POST ?action=start            JSON {code, fileCount}        -> {id, token, label}
 *   POST ?action=chunk&id&f&seq   raw encrypted bytes (<= 4 MB) -> {ok}
 *   POST ?action=meta&id          raw encrypted note/file list  -> {ok}
 *   POST ?action=finish&id                                       -> {ok}
 * The per-upload token travels in the X-SU-Token header.
 */

declare(strict_types=1);
require __DIR__ . '/lib.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') su_fail('POST only', 405);

$action = (string)($_GET['action'] ?? '');
$data   = su_data_dir();

if ($action === 'start') {
    su_cleanup_stale();
    $req = json_decode((string)file_get_contents('php://input'), true) ?: [];
    $code = (string)($req['code'] ?? '');
    $count = (int)($req['fileCount'] ?? 0);

    if (!su_rate_ok('bad-code', SU_BAD_CODE_LIMIT, false)) {
        su_fail('Too many attempts. Try again in an hour or contact TPH.', 429);
    }
    $codes = su_codes();
    $hash = su_code_hash($code);
    if ($code === '' || !isset($codes[$hash])) {
        su_rate_ok('bad-code', SU_BAD_CODE_LIMIT);   // record the miss
        su_fail('That upload code was not recognized. Double check it or contact TPH.', 403);
    }
    if ($count < 1 || $count > SU_MAX_FILES) su_fail('Choose between 1 and ' . SU_MAX_FILES . ' files.');
    if (!su_rate_ok('start', SU_START_LIMIT)) su_fail('Too many uploads this hour. Try again later.', 429);

    $id = bin2hex(random_bytes(16));
    $token = bin2hex(random_bytes(24));
    $dir = "$data/incoming/$id";
    mkdir($dir, 0700, true);
    $state = [
        'token'     => hash('sha256', $token),
        'code'      => $hash,
        'slug'      => $codes[$hash]['slug'],
        'label'     => $codes[$hash]['label'] ?? $codes[$hash]['slug'],
        'fileCount' => $count,
        'next'      => array_fill(0, $count, 0),
        'bytes'     => 0,
        'created'   => time(),
    ];
    file_put_contents("$dir/state.json", json_encode($state), LOCK_EX);
    su_json(['ok' => true, 'id' => $id, 'token' => $token, 'label' => $state['label']]);
}

// Every other action works on an existing upload.
$id = (string)($_GET['id'] ?? '');
if (!su_valid_id($id)) su_fail('Bad upload id');
$dir = "$data/incoming/$id";
if (!is_dir($dir)) su_fail('Upload not found or expired', 404);

$lock = fopen("$dir/state.json", 'c+');
flock($lock, LOCK_EX);
$state = json_decode((string)stream_get_contents($lock), true);
if (!$state || !hash_equals($state['token'], hash('sha256', (string)($_SERVER['HTTP_X_SU_TOKEN'] ?? '')))) {
    su_fail('Not authorized', 403);
}
function su_save_state($lock, array $state): void {
    ftruncate($lock, 0);
    rewind($lock);
    fwrite($lock, json_encode($state));
    fflush($lock);
}

switch ($action) {
    case 'chunk':
        $f = (int)($_GET['f'] ?? -1);
        $seq = (int)($_GET['seq'] ?? -1);
        if ($f < 0 || $f >= $state['fileCount']) su_fail('Bad file index');
        if ($seq !== $state['next'][$f]) {
            // Already have this chunk (a retry after a dropped response): accept quietly.
            if ($seq === $state['next'][$f] - 1) su_json(['ok' => true, 'dup' => true]);
            su_fail('Chunk out of order', 409);
        }
        $body = su_read_body(SU_MAX_CHUNK_BYTES);
        if ($body === '') su_fail('Empty chunk');
        if ($state['bytes'] + strlen($body) > SU_MAX_BATCH_BYTES) su_fail('Upload is larger than the 2 GB limit', 413);
        if (file_put_contents("$dir/f$f.pgp", $body, FILE_APPEND | LOCK_EX) === false) su_fail('Server could not save the chunk', 500);
        $state['next'][$f]++;
        $state['bytes'] += strlen($body);
        su_save_state($lock, $state);
        su_json(['ok' => true]);

    case 'meta':
        $body = su_read_body(SU_MAX_META_BYTES);
        if (strpos($body, '-----BEGIN PGP MESSAGE-----') !== 0) su_fail('Note must be encrypted');
        file_put_contents("$dir/meta.pgp", $body, LOCK_EX);
        su_json(['ok' => true]);

    case 'finish':
        if (!is_file("$dir/meta.pgp")) su_fail('Missing details');
        $sizes = [];
        for ($i = 0; $i < $state['fileCount']; $i++) {
            if (!is_file("$dir/f$i.pgp") || filesize("$dir/f$i.pgp") === 0) su_fail("File " . ($i + 1) . " did not finish uploading");
            $sizes[] = filesize("$dir/f$i.pgp");
        }
        $info = [
            'id'        => $id,
            'slug'      => $state['slug'],
            'label'     => $state['label'],
            'fileCount' => $state['fileCount'],
            'bytes'     => array_sum($sizes),
            'received'  => time(),
        ];
        file_put_contents("$dir/info.json", json_encode($info));
        flock($lock, LOCK_UN);
        fclose($lock);
        if (!rename($dir, "$data/ready/$id")) su_fail('Server could not file the upload', 500);

        if (defined('SU_NOTIFY_EMAIL') && SU_NOTIFY_EMAIL) {
            $mb = number_format($info['bytes'] / 1048576, 1);
            @mail(
                SU_NOTIFY_EMAIL,
                "New secure upload: {$info['label']}",
                "{$info['label']} sent {$info['fileCount']} file(s), {$mb} MB encrypted.\n\n" .
                "Contents are encrypted. Your PC will pull them into Proton Drive on its next run.\n",
                "From: TPH Secure Upload <noreply@thomaspublishinghouse.com>\r\nContent-Type: text/plain; charset=utf-8"
            );
        }
        su_json(['ok' => true]);

    default:
        su_fail('Unknown action');
}
