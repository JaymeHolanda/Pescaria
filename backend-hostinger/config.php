<?php
/**
 * Maré Certa — Configuração Oficial da API Mercado Pago e Firebase
 * Hospedagem: Hostinger (cPanel / hPanel)
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Credenciais da Aplicação no Mercado Pago
define('MP_ACCESS_TOKEN', 'APP_USR-3736774688506968-103020-a50140e5ee32e6aa9500e4011dde7027-3806448974');
define('MP_PUBLIC_KEY', 'APP_USR-ac76adfb-81e9-4440-96ff-1949cb948fc8');

// Banco de Dados Firebase Realtime Database
define('FIREBASE_RTDB_URL', 'https://teste-b81e2-default-rtdb.firebaseio.com');

// Planos Oficiais do Clube Pescador PRO
$PRO_PLANS = [
    'annual' => [
        'id' => 'annual',
        'title' => 'Clube Pescador PRO — Plano Anual (44% OFF)',
        'description' => 'Acesso completo de 1 ano (365 dias) ao Clube Pescador PRO',
        'price' => 99.90,
        'durationDays' => 365
    ],
    'monthly' => [
        'id' => 'monthly',
        'title' => 'Clube Pescador PRO — Plano Mensal',
        'description' => 'Acesso de 30 dias sem fidelidade ao Clube Pescador PRO',
        'price' => 14.90,
        'durationDays' => 30
    ]
];

function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function callMercadoPagoApi($endpoint, $method = 'GET', $payload = null) {
    $url = 'https://api.mercadopago.com' . $endpoint;
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_TIMEOUT, 20);

    $headers = [
        'Authorization: Bearer ' . MP_ACCESS_TOKEN,
        'Content-Type: application/json'
    ];

    if ($payload !== null) {
        $jsonPayload = json_encode($payload);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonPayload);
        $headers[] = 'Content-Length: ' . strlen($jsonPayload);
    }

    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return [
        'code' => $httpCode,
        'data' => json_decode($response, true)
    ];
}

function updateFirebaseNode($path, $payload) {
    $url = FIREBASE_RTDB_URL . '/' . ltrim($path, '/') . '.json';
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PATCH');
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return [
        'code' => $httpCode,
        'data' => json_decode($response, true)
    ];
}
