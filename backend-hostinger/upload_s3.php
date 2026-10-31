<?php
/**
 * Maré Certa — Upload de Imagens para AWS S3 (Hostinger PHP)
 * Recebe JSON via POST com { dataUrl, folder, filename } e envia para o bucket pescaimages.
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Carrega variáveis do ambiente ou do arquivo .env
$envFile = __DIR__ . '/../.env';
$awsKey = getenv('AWS_ACCESS_KEY_ID');
$awsSecret = getenv('AWS_SECRET_ACCESS_KEY');
$awsRegion = getenv('AWS_REGION') ?: 'us-east-2';
$s3Bucket = getenv('S3_BUCKET') ?: 'pescaimages';

if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        $parts = explode('=', $line, 2);
        if (count($parts) === 2) {
            $k = trim($parts[0]);
            $v = trim($parts[1], " \t\n\r\0\x0B\"'");
            if ($k === 'AWS_ACCESS_KEY_ID' && !$awsKey) $awsKey = $v;
            if ($k === 'AWS_SECRET_ACCESS_KEY' && !$awsSecret) $awsSecret = $v;
            if ($k === 'AWS_REGION') $awsRegion = $v;
            if ($k === 'S3_BUCKET') $s3Bucket = $v;
        }
    }
}

if ($awsRegion === 'us-east-1' && $s3Bucket === 'pescaimages') {
    $awsRegion = 'us-east-2';
}

if (!$awsKey || !$awsSecret) {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Credenciais AWS não configuradas.']);
    exit;
}

// Rota GET: Visualização/Proxy Autenticado de Imagens do S3
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $key = $_GET['key'] ?? '';
    if (!$key && !empty($_GET['url'])) {
        $parsed = parse_url($_GET['url']);
        $key = ltrim($parsed['path'] ?? '', '/');
    }
    $key = ltrim($key, '/');
    if (!$key || strpos($key, '..') !== false) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Chave S3 ausente ou inválida.']);
        exit;
    }

    $host = "{$s3Bucket}.s3.{$awsRegion}.amazonaws.com";
    $endpoint = "https://{$host}/" . str_replace('%2F', '/', rawurlencode($key));
    $amzDate = gmdate('Ymd\THis\Z');
    $dateStamp = gmdate('Ymd');
    $payloadHash = hash('sha256', '');

    $canonicalHeaders = "host:{$host}\nx-amz-content-sha256:{$payloadHash}\nx-amz-date:{$amzDate}\n";
    $signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
    $canonicalRequest = "GET\n/" . str_replace('%2F', '/', rawurlencode($key)) . "\n\n{$canonicalHeaders}\n{$signedHeaders}\n{$payloadHash}";

    $algorithm = 'AWS4-HMAC-SHA256';
    $credentialScope = "{$dateStamp}/{$awsRegion}/s3/aws4_request";
    $stringToSign = "{$algorithm}\n{$amzDate}\n{$credentialScope}\n" . hash('sha256', $canonicalRequest);

    $kDate = hash_hmac('sha256', $dateStamp, "AWS4{$awsSecret}", true);
    $kRegion = hash_hmac('sha256', $awsRegion, $kDate, true);
    $kService = hash_hmac('sha256', 's3', $kRegion, true);
    $kSigning = hash_hmac('sha256', 'aws4_request', $kService, true);
    $signature = hash_hmac('sha256', $stringToSign, $kSigning);

    $authorization = "{$algorithm} Credential={$awsKey}/{$credentialScope}, SignedHeaders={$signedHeaders}, Signature={$signature}";

    $ch = curl_init($endpoint);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'GET');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Host: {$host}",
        "x-amz-date: {$amzDate}",
        "x-amz-content-sha256: {$payloadHash}",
        "Authorization: {$authorization}"
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE) ?: 'image/webp';
    curl_close($ch);

    if ($httpCode === 200) {
        header("Content-Type: {$contentType}");
        header("Cache-Control: public, max-age=31536000, immutable");
        echo $response;
        exit;
    }

    header('Content-Type: application/json; charset=utf-8');
    http_response_code($httpCode ?: 404);
    echo json_encode(['ok' => false, 'error' => "Imagem não encontrada (HTTP {$httpCode})."]);
    exit;
}

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Método não permitido']);
    exit;
}
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Credenciais AWS não configuradas.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$dataUrl = $input['dataUrl'] ?? '';
$folder = preg_replace('/[^a-zA-Z0-9_-]/', '', $input['folder'] ?? 'trophies');
$filename = preg_replace('/[^a-zA-Z0-9._-]/', '', $input['filename'] ?? (time() . '-' . bin2hex(random_bytes(4)) . '.webp'));

if (!$dataUrl || !preg_match('/^data:([^;]+);base64,(.+)$/', $dataUrl, $matches)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'DataURL inválido ou ausente.']);
    exit;
}

$contentType = $matches[1] ?: 'image/webp';
$body = base64_decode($matches[2]);
$key = "{$folder}/{$filename}";

// Assinatura AWS Signature V4
$host = "{$s3Bucket}.s3.{$awsRegion}.amazonaws.com";
$endpoint = "https://{$host}/" . str_replace('%2F', '/', rawurlencode($key));
$amzDate = gmdate('Ymd\THis\Z');
$dateStamp = gmdate('Ymd');
$payloadHash = hash('sha256', $body);

$canonicalHeaders = "host:{$host}\nx-amz-content-sha256:{$payloadHash}\nx-amz-date:{$amzDate}\n";
$signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
$canonicalRequest = "PUT\n/" . str_replace('%2F', '/', rawurlencode($key)) . "\n\n{$canonicalHeaders}\n{$signedHeaders}\n{$payloadHash}";

$algorithm = 'AWS4-HMAC-SHA256';
$credentialScope = "{$dateStamp}/{$awsRegion}/s3/aws4_request";
$stringToSign = "{$algorithm}\n{$amzDate}\n{$credentialScope}\n" . hash('sha256', $canonicalRequest);

$kDate = hash_hmac('sha256', $dateStamp, "AWS4{$awsSecret}", true);
$kRegion = hash_hmac('sha256', $awsRegion, $kDate, true);
$kService = hash_hmac('sha256', 's3', $kRegion, true);
$kSigning = hash_hmac('sha256', 'aws4_request', $kService, true);
$signature = hash_hmac('sha256', $stringToSign, $kSigning);

$authorization = "{$algorithm} Credential={$awsKey}/{$credentialScope}, SignedHeaders={$signedHeaders}, Signature={$signature}";

$ch = curl_init($endpoint);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Host: {$host}",
    "Content-Type: {$contentType}",
    "x-amz-date: {$amzDate}",
    "x-amz-content-sha256: {$payloadHash}",
    "Authorization: {$authorization}"
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode >= 200 && $httpCode < 300) {
    echo json_encode(['ok' => true, 'url' => $endpoint, 'key' => $key]);
} else {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => "Erro no S3 (HTTP {$httpCode}): {$response}"]);
}
