<?php
/**
 * Maré Certa — Consulta de Assinatura Ativa (Backend Hostinger)
 * Endpoint: GET /backend-hostinger/check_subscription.php?uid=...&email=...
 */

require_once __DIR__ . '/config.php';

$uid = trim($_GET['uid'] ?? '');
$email = trim(strtolower($_GET['email'] ?? ''));

if (empty($uid) && empty($email)) {
    sendJsonResponse(['error' => 'Parâmetro uid ou email é obrigatório.'], 400);
}

$dataFile = __DIR__ . '/data/approved_subscriptions.json';
if (!file_exists($dataFile)) {
    sendJsonResponse(['active' => false, 'message' => 'Nenhuma assinatura registrada ainda.']);
}

$raw = file_get_contents($dataFile);
$subscriptions = json_decode($raw, true) ?: [];

$now = round(microtime(true) * 1000);
$found = null;

// Busca por UID ou Email
if (!empty($uid) && isset($subscriptions[$uid])) {
    $found = $subscriptions[$uid];
} elseif (!empty($email)) {
    foreach ($subscriptions as $sub) {
        if (!empty($sub['email']) && strtolower($sub['email']) === $email) {
            $found = $sub;
            break;
        }
    }
}

// Se explicitamente revogada, respeita e não reativa com buscas antigas
if ($found && isset($found['active']) && $found['active'] === false && !empty($found['revokedAt'])) {
    sendJsonResponse(['active' => false, 'revoked' => true, 'revokedAt' => $found['revokedAt']]);
}

if ($found && !empty($found['active']) && (!isset($found['expiresAt']) || $found['expiresAt'] > $now)) {
    sendJsonResponse([
        'active' => true,
        'planId' => $found['planId'] ?? 'annual',
        'isFreeGrant' => !empty($found['isFreeGrant']),
        'roleLabel' => $found['roleLabel'] ?? null,
        'durationDays' => $found['durationDays'] ?? 365,
        'expiresAt' => $found['expiresAt'] ?? null,
        'paymentId' => $found['paymentId'] ?? null,
        'source' => 'mercadopago_hostinger'
    ]);
}

// Caso ainda não esteja salvo localmente, consulta diretamente a API de Pagamentos do Mercado Pago
if (!empty($uid)) {
    $mpSearch = callMercadoPagoApi('/v1/payments/search?sort=date_created&criteria=desc&limit=15', 'GET');
    if ($mpSearch['code'] === 200 && !empty($mpSearch['data']['results'])) {
        foreach ($mpSearch['data']['results'] as $payment) {
            $status = $payment['status'] ?? '';
            $extRef = $payment['external_reference'] ?? '';
            if ($status === 'approved' && strpos($extRef, $uid . '__') === 0) {
                $parts = explode('__', $extRef);
                $planId = trim($parts[1] ?? 'annual');
                $durationDays = ($planId === 'monthly') ? 30 : 365;
                $activatedAt = round(microtime(true) * 1000);
                $expiresAt = $activatedAt + ($durationDays * 86400 * 1000);
                $paymentId = (string)($payment['id'] ?? '');

                $subscriptions[$uid] = [
                    'uid' => $uid,
                    'email' => $payment['payer']['email'] ?? $email,
                    'name' => $payment['payer']['first_name'] ?? 'Assinante PRO',
                    'active' => true,
                    'planId' => $planId,
                    'durationDays' => $durationDays,
                    'activatedAt' => $activatedAt,
                    'expiresAt' => $expiresAt,
                    'paymentId' => $paymentId
                ];
                @file_put_contents($dataFile, json_encode($subscriptions, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

                sendJsonResponse([
                    'active' => true,
                    'planId' => $planId,
                    'durationDays' => $durationDays,
                    'expiresAt' => $expiresAt,
                    'paymentId' => $paymentId,
                    'source' => 'mercadopago_live_search'
                ]);
            }
        }
    }
}

sendJsonResponse(['active' => false]);
