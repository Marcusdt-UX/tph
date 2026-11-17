<?php
/**
 * TPH Secure Upload: shared helpers.
 *
 * Everything uploaded here is already encrypted in the sender's browser with
 * the TPH Secure Uploads public key. This server only ever holds ciphertext.
 * Files live OUTSIDE public_html (one level above the web root) so they can
 * never be fetched by URL and deploys never touch them.
 */

declare(strict_types=1);

require __DIR__ . '/config.php';

const SU_MAX_FILES       = 25;
const SU_MAX_BATCH_BYTES = 2147483648;   // 2 GB of ciphertext per submission
const SU_MAX_CHUNK_BYTES = 4194304;      // 4 MB per chunk request
const SU_MAX_META_BYTES  = 131072;       // encrypted note + file list
const SU_STALE_SECONDS   = 86400;        // unfinished uploads are dropped after a day
const SU_BAD_CODE_LIMIT  = 10;           // wrong codes per IP per hour
const SU_START_LIMIT     = 30;           // submissions per IP per hour

function su_data_dir(): string {
    $root = rtrim((string)($_SERVER['DOCUMENT_ROOT'] ?? ''), '/');
    $dir  = ($root !== '' ? dirname($root) : dirname(__DIR__, 3)) . '/tph-secure-uploads';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    foreach (['incoming', 'ready', 'ratelimit'] as $sub) {
        if (!is_dir("$dir/$sub")) @mkdir("$dir/$sub", 0700, true);
    }
    // Belt and braces in case the folder ever ends up under a web root.
    if (!is_file("$dir/.htaccess")) {
        @file_put_contents("$dir/.htaccess", "Require all denied\nDeny from all\n");
    }
    return $dir;
}

function su_json($data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Robots-Tag: noindex, nofollow');
    echo json_encode($data, JSON_UNESCAPED_SLASHES);
    exit;
}

function su_fail(string $msg, int $status = 400): void {
    su_json(['ok' => false, 'error' => $msg], $status);
}

function su_client_ip(): string {
    // Cloudflare sits in front of the site.
    $ip = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    return filter_var($ip, FILTER_VALIDATE_IP) ? $ip : '0.0.0.0';
}

/** Counts hits per IP per hour for a given bucket. Returns true if under limit. */
function su_rate_ok(string $bucket, int $limit, bool $record = true): bool {
    $dir  = su_data_dir() . '/ratelimit';
    $key  = hash('sha256', SU_RATE_SALT . '|' . su_client_ip() . '|' . $bucket);
    $file = "$dir/$key.json";
    $now  = time();
    $hits = [];
    if (is_file($file)) {
        $hits = json_decode((string)file_get_contents($file), true) ?: [];
        $hits = array_values(array_filter($hits, fn($t) => $t > $now - 3600));
    }
    if (count($hits) >= $limit) return false;
    if ($record) {
        $hits[] = $now;
        file_put_contents($file, json_encode($hits), LOCK_EX);
    }
    return true;
}

function su_normalize_code(string $code): string {
    return strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $code));
}

function su_code_hash(string $code): string {
    return hash('sha256', 'tph-su|' . su_normalize_code($code));
}

function su_codes(): array {
    $file = su_data_dir() . '/codes.json';
    if (!is_file($file)) return [];
    return json_decode((string)file_get_contents($file), true) ?: [];
}

function su_save_codes(array $codes): void {
    file_put_contents(su_data_dir() . '/codes.json', json_encode($codes, JSON_PRETTY_PRINT), LOCK_EX);
}

function su_valid_id(string $id): bool {
    return (bool)preg_match('/^[a-f0-9]{32}$/', $id);
}

function su_rrmdir(string $dir): void {
    if (!is_dir($dir)) return;
    foreach (scandir($dir) as $f) {
        if ($f === '.' || $f === '..') continue;
        $p = "$dir/$f";
        is_dir($p) ? su_rrmdir($p) : @unlink($p);
    }
    @rmdir($dir);
}

function su_cleanup_stale(): void {
    $dir = su_data_dir() . '/incoming';
    foreach (glob("$dir/*", GLOB_ONLYDIR) ?: [] as $d) {
        if (filemtime($d) < time() - SU_STALE_SECONDS) su_rrmdir($d);
    }
    foreach (glob(su_data_dir() . '/ratelimit/*.json') ?: [] as $f) {
        if (filemtime($f) < time() - 7200) @unlink($f);
    }
}

function su_read_body(int $max): string {
    $len = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($len > $max) su_fail('Chunk too large', 413);
    $in = fopen('php://input', 'rb');
    $data = stream_get_contents($in, $max + 1);
    fclose($in);
    if ($data === false) su_fail('Could not read upload');
    if (strlen($data) > $max) su_fail('Chunk too large', 413);
    return $data;
}
