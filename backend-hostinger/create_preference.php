<?php
/**
 * Maré Certa — Criação de Preferência de Pagamento (Checkout Pro Oficial)
 * Endpoint: POST /backend-hostinger/create_preference.php
 */

require_once __DIR__ . '/config.php';

$rawInput = file_get_contents('php://input');
$body = json_decode($rawInput, true) ?: [];

$uid = trim($body['uid'] ?? '');
$email = trim($body['email'] ?? '');
$name = trim($body['name'] ?? 'Pescador PRO');
$planId = trim($body['planId'] ?? 'annual');
$returnUrl = trim($body['returnUrl'] ?? '');

if (empty($uid)) {
    sendJsonResponse(['error' => 'Identificador de usuário (uid) é obrigatório.'], 400);
}

if (!isset($PRO_PLANS[$planId])) {
    $planId = 'annual';
}

$plan = $PRO_PLANS[$planId];

// Define a URL base para retorno do cliente após pagar
$isLocal = empty($returnUrl) || strpos($returnUrl, 'localhost') !== false || strpos($returnUrl, '127.0.0.1') !== false;
$safeReturnBase = $isLocal ? 'https://marecerta.com.br/' : $returnUrl;

$sep = strpos($safeReturnBase, '?') !== false ? '&' : '?';
$successUrl = $safeReturnBase . $sep . 'status=approved&plan=' . $planId;
$failureUrl = $safeReturnBase . $sep . 'status=failure';
$pendingUrl = $safeReturnBase . $sep . 'status=pending';

// Identificador único atrelando o usuário ao plano
$externalReference = $uid . '__' . $planId;

// Se o token atual for do Vendedor de Teste (3806448974), usa o e-mail do Comprador de Teste oficial
$isTestSellerToken = substr(MP_ACCESS_TOKEN, -10) === '3806448974';
$payerEmail = $isTestSellerToken
    ? 'test_user_4665524128243257713@testuser.com'
    : (!empty($email) ? $email : 'cliente@marecerta.com.br');

$preferencePayload = [
    'items' => [
        [
            'id' => $plan['id'],
            'title' => $plan['title'],
            'description' => $plan['description'],
            'quantity' => 1,
            'unit_price' => (float)$plan['price'],
            'currency_id' => 'BRL'
        ]
    ],
    'payer' => [
        'email' => $payerEmail,
        'name' => $name
    ],
    'external_reference' => $externalReference,
    'back_urls' => [
        'success' => $successUrl,
        'failure' => $failureUrl,
        'pending' => $pendingUrl
    ],
    'auto_return' => 'approved',
    'statement_descriptor' => 'MARE CERTA PRO'
];

$mpResponse = callMercadoPagoApi('/checkout/preferences', 'POST', $preferencePayload);

if ($mpResponse['code'] >= 200 && $mpResponse['code'] < 300) {
    $prefData = $mpResponse['data'];
    sendJsonResponse([
        'success' => true,
        'preference_id' => $prefData['id'] ?? null,
        'init_point' => $prefData['init_point'] ?? null,
        'sandbox_init_point' => $prefData['sandbox_init_point'] ?? null,
        'plan' => $plan,
        'external_reference' => $externalReference
    ]);
} else {
    sendJsonResponse([
        'error' => 'Falha ao gerar cobrança no Mercado Pago.',
        'details' => $mpResponse['data']
    ], 500);
}
