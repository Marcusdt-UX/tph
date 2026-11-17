<?php
/**
 * TPH Secure Upload: private pickup endpoint, used only by the pickup script
 * on Marcus's PC. Authenticated with the X-TPH-Token header.
 *
 *   GET  ?action=list                      -> finished uploads waiting
 *   GET  ?action=get&id=..&file=meta|f0..  -> ciphertext stream
 *   POST ?action=ack&id=..                 -> delete after a verified pull
 *   GET  ?action=codes                     -> upload codes (labels only)
 *   POST ?action=code-add   JSON {code, slug, label}
 *   POST ?action=code-remove JSON {slug}
 */

declare(strict_types=1);
require __DIR__ . '/lib.php';

$given = (string)($_SERVER['HTTP_X_TPH_TOKEN'] ?? '');
if ($given === '' || !hash_equals(SU_PICKUP_TOKEN_SHA256, hash('sha256', $given))) {
    if (!su_rate_ok('pickup-bad', 20)) su_fail('Locked out', 429);   // records the miss
    su_fail('Not authorized', 403);
}

$data   = su_data_dir();
$action = (string)($_GET['action'] ?? '');
$method = $_SERVER['REQUEST_METHOD'];

switch ($action) {
    case 'list':
        $out = [];
        foreach (glob("$data/ready/*/info.json") ?: [] as $f) {
            $info = json_decode((string)file_get_contents($f), true);
            if ($info) $out[] = $info;
        }
        usort($out, fn($a, $b) => $a['received'] <=> $b['received']);
        su_json(['ok' => true, 'uploads' => $out]);

    case 'get':
        $id = (string)($_GET['id'] ?? '');
        $file = (string)($_GET['file'] ?? '');
        if (!su_valid_id($id) || !preg_match('/^(meta|f\d{1,2})$/', $file)) su_fail('Bad request');
        $path = "$data/ready/$id/$file.pgp";
        if (!is_file($path)) su_fail('Not found', 404);
        while (ob_get_level()) ob_end_clean();
        header('Content-Type: application/octet-stream');
        header('Content-Length: ' . filesize($path));
        header('Cache-Control: no-store');
        readfile($path);
        exit;

    case 'ack':
        if ($method !== 'POST') su_fail('POST only', 405);
        $id = (string)($_GET['id'] ?? '');
        if (!su_valid_id($id) || !is_dir("$data/ready/$id")) su_fail('Not found', 404);
        su_rrmdir("$data/ready/$id");
        su_json(['ok' => true]);

    case 'codes':
        $list = [];
        foreach (su_codes() as $c) $list[] = ['slug' => $c['slug'], 'label' => $c['label'], 'created' => $c['created'] ?? null];
        su_json(['ok' => true, 'codes' => $list]);

    case 'code-add':
        if ($method !== 'POST') su_fail('POST only', 405);
        $req = json_decode((string)file_get_contents('php://input'), true) ?: [];
        $code = su_normalize_code((string)($req['code'] ?? ''));
        $slug = preg_replace('/[^a-z0-9-]/', '', strtolower((string)($req['slug'] ?? '')));
        $label = trim(strip_tags((string)($req['label'] ?? $slug)));
        if (strlen($code) < 10 || $slug === '') su_fail('Code must be at least 10 characters and slug is required');
        $codes = su_codes();
        foreach ($codes as $h => $c) if ($c['slug'] === $slug) unset($codes[$h]);   // one code per client
        $codes[su_code_hash($code)] = ['slug' => $slug, 'label' => $label ?: $slug, 'created' => time()];
        su_save_codes($codes);
        su_json(['ok' => true]);

    case 'code-remove':
        if ($method !== 'POST') su_fail('POST only', 405);
        $req = json_decode((string)file_get_contents('php://input'), true) ?: [];
        $slug = (string)($req['slug'] ?? '');
        $codes = su_codes();
        $before = count($codes);
        foreach ($codes as $h => $c) if ($c['slug'] === $slug) unset($codes[$h]);
        su_save_codes($codes);
        su_json(['ok' => true, 'removed' => $before - count($codes)]);

    default:
        su_fail('Unknown action');
}
