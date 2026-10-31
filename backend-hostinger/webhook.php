<?php
/**
 * Maré Certa — Webhook Oficial do Mercado Pago
 * Endpoint: POST/GET /backend-hostinger/webhook.php
 * Recebe avisos de pagamentos aprovados e ativa o PRO automaticamente no Firebase.
 */

require_once __DIR__ . '/config.php';

$rawBody = file_get_contents('php://input');
$body = json_decode($rawBody, true) ?: [];

// O Mercado Pago pode enviar o ID na query string ou no corpo JSON
$paymentId = $_GET['data_id'] 
    ?? $_GET['id'] 
    ?? ($body['data']['id'] ?? ($body['id'] ?? null));

$type = $_GET['type'] ?? ($body['type'] ?? 'payment');

if (empty($paymentId)) {
    // Confirmação de recebimento para pings de teste
    sendJsonResponse(['status' => 'ignored', 'message' => 'Nenhum payment_id informado']);
}

// 1. Consulta os detalhes oficiais da transação diretamente na API do Mercado Pago
$paymentResponse = callMercadoPagoApi('/v1/payments/' . $paymentId, 'GET');

if ($paymentResponse['code'] !== 200 || empty($paymentResponse['data'])) {
    sendJsonResponse(['error' => 'Transação não localizada na API do Mercado Pago'], 404);
}

$payment = $paymentResponse['data'];
$status = $payment['status'] ?? '';
$externalReference = $payment['external_reference'] ?? '';

// 2. Se o pagamento estiver APROVADO, ativa a conta do pescador no Firebase
if ($status === 'approved') {
    $parts = explode('__', $externalReference);
    $uid = trim($parts[0] ?? '');
    $planId = trim($parts[1] ?? 'annual');

    if (empty($uid)) {
        // Tenta associar pelo e-mail do pagador caso o external_reference não tenha vindo
        $payerEmail = $payment['payer']['email'] ?? '';
        $uid = !empty($payerEmail) ? $payerEmail : 'cliente-mp-' . $paymentId;
    }

    $durationDays = ($planId === 'monthly') ? 30 : 365;
    $activatedAt = round(microtime(true) * 1000);
    $expiresAt = $activatedAt + ($durationDays * 86400 * 1000);

    // Salva a assinatura ativa no armazenamento local redundante do servidor
    $dataFile = __DIR__ . '/data/approved_subscriptions.json';
    $existing = [];
    if (file_exists($dataFile)) {
        $existing = json_decode(file_get_contents($dataFile), true) ?: [];
    }
    $existing[$uid] = [
        'uid' => $uid,
        'email' => $payment['payer']['email'] ?? '',
        'name' => $payment['payer']['first_name'] ?? 'Assinante PRO',
        'active' => true,
        'planId' => $planId,
        'durationDays' => $durationDays,
        'activatedAt' => $activatedAt,
        'expiresAt' => $expiresAt,
        'paymentId' => (string)$paymentId
    ];
    @file_put_contents($dataFile, json_encode($existing, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

    // Atualiza o perfil estendido do pescador no Firebase Realtime Database
    $profilePayload = [
        'isPro' => true,
        'proPlan' => $planId,
        'proDurationDays' => $durationDays,
        'proActivatedAt' => $activatedAt,
        'proExpiresAt' => $expiresAt,
        'proPaymentId' => (string)$paymentId
    ];
    updateFirebaseNode('mareCerta/extendedProfiles/' . $uid, $profilePayload);

    // Registra a concessão oficial para o Painel Admin e controle financeiro
    $grantPayload = [
        'key' => $uid,
        'uid' => $uid,
        'email' => $payment['payer']['email'] ?? '',
        'displayName' => $payment['payer']['first_name'] ?? 'Assinante PRO',
        'active' => true,
        'isPaidSubscription' => true,
        'planId' => $planId,
        'roleLabel' => 'Assinante PRO ' . ($planId === 'monthly' ? 'Mensal' : 'Anual') . ' (Mercado Pago)',
        'durationDays' => $durationDays,
        'grantedAt' => $activatedAt,
        'expiresAt' => $expiresAt,
        'paymentId' => (string)$paymentId
    ];
    updateFirebaseNode('mareCerta/vipGrants/' . $uid, $grantPayload);

    sendJsonResponse([
        'success' => true,
        'status' => 'approved',
        'activated_uid' => $uid,
        'planId' => $planId,
        'durationDays' => $durationDays,
        'paymentId' => $paymentId
    ]);
}

// Para pagamentos pendentes ou outros status
sendJsonResponse([
    'status' => $status,
    'message' => 'Notificação processada com sucesso. Status atual: ' . $status,
    'paymentId' => $paymentId
]);
