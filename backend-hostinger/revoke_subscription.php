<?php
/**
 * Maré Certa — Revogação de Assinatura (Backend Hostinger)
 * Endpoint: POST /backend-hostinger/revoke_subscription.php
 */

require_once __DIR__ . '/config.php';

$rawBody = file_get_contents('php://input');
$body = json_decode($rawBody, true) ?: [];

$uid = trim($body['uid'] ?? '');
$email = trim(strtolower($body['email'] ?? ''));

if (empty($uid) && empty($email)) {
    sendJsonResponse(['error' => 'Identificador (uid ou email) é obrigatório.'], 400);
}

$dataFile = __DIR__ . '/data/approved_subscriptions.json';
if (file_exists($dataFile)) {
    $subs = json_decode(file_get_contents($dataFile), true) ?: [];
    $found = false;
    foreach ($subs as $k => $item) {
        if ($k === $uid || (!empty($item['email']) && strtolower($item['email']) === $email)) {
            $subs[$k]['active'] = false;
            $subs[$k]['revokedAt'] = round(microtime(true) * 1000);
            $found = true;
        }
    }
    if (!$found && !empty($uid)) {
        $subs[$uid] = ['uid' => $uid, 'email' => $email, 'active' => false, 'revokedAt' => round(microtime(true) * 1000)];
        $found = true;
    }
    if ($found) {
        @file_put_contents($dataFile, json_encode($subs, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }
}

// Também desativa no Firebase Realtime Database
if (!empty($uid)) {
    updateFirebaseNode('mareCerta/extendedProfiles/' . $uid, ['isPro' => false, 'proPlan' => null]);
    updateFirebaseNode('mareCerta/vipGrants/' . $uid, ['active' => false, 'revokedAt' => round(microtime(true) * 1000)]);
}

sendJsonResponse(['success' => true, 'message' => 'Assinatura revogada com sucesso.']);
