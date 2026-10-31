/**
 * Maré Certa — Servidor Local de Desenvolvimento e Simulação da API Mercado Pago
 * Roda na porta 4174 ou em conjunto com o Vite para testes no computador.
 */

import http from 'node:http';
import { URL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

export const MP_ACCESS_TOKEN = 'APP_USR-3736774688506968-103020-a50140e5ee32e6aa9500e4011dde7027-3806448974';
export const MP_PUBLIC_KEY = 'APP_USR-ac76adfb-81e9-4440-96ff-1949cb948fc8';
// Conta Compradora de Teste oficial criada na API do Mercado Pago (evita erro "Uma das partes é de teste")
export const MP_TEST_BUYER_EMAIL = 'test_user_4665524128243257713@testuser.com';
export const FIREBASE_RTDB_URL = 'https://teste-b81e2-default-rtdb.firebaseio.com';

export const PRO_PLANS = {
  annual: {
    id: 'annual',
    title: 'Clube Pescador PRO — Plano Anual (44% OFF)',
    description: 'Acesso completo de 1 ano (365 dias) ao Clube Pescador PRO',
    price: 99.90,
    durationDays: 365
  },
  monthly: {
    id: 'monthly',
    title: 'Clube Pescador PRO — Plano Mensal',
    description: 'Acesso de 30 dias sem fidelidade ao Clube Pescador PRO',
    price: 14.90,
    durationDays: 30
  }
};

export async function createMercadoPagoPreference({ uid, email, name, planId = 'annual', returnUrl = 'http://localhost:4173/', customPrice = null }) {
  const plan = PRO_PLANS[planId] || PRO_PLANS.annual;
  const externalReference = `${uid}__${plan.id}`;
  const unitPrice = customPrice && Number(customPrice) > 0 ? Number(customPrice) : Number(plan.price);

  const cleanReturnUrl = (returnUrl || '').replace(/[?&]status=[^&]*/g, '').replace(/[?&]plan=[^&]*/g, '');
  const isLocal = !cleanReturnUrl || cleanReturnUrl.includes('localhost') || cleanReturnUrl.includes('127.0.0.1');
  const safeReturnBase = isLocal ? 'https://marecerta.com.br/' : cleanReturnUrl;
  const sep = safeReturnBase.includes('?') ? '&' : '?';
  const successUrl = `${safeReturnBase}${sep}status=approved&plan=${plan.id}`;
  const failureUrl = `${safeReturnBase}${sep}status=failure`;
  const pendingUrl = `${safeReturnBase}${sep}status=pending`;

  const payload = {
    items: [
      {
        id: plan.id,
        title: customPrice ? `[TESTE R$ ${unitPrice.toFixed(2)}] ${plan.title}` : plan.title,
        description: plan.description,
        quantity: 1,
        unit_price: unitPrice,
        currency_id: 'BRL'
      }
    ],
    payer: {
      email: MP_ACCESS_TOKEN.endsWith('3806448974')
        ? MP_TEST_BUYER_EMAIL
        : (email && email.includes('@') ? email : 'cliente@marecerta.com.br'),
      name: name || 'Pescador PRO'
    },
    external_reference: externalReference,
    back_urls: {
      success: successUrl,
      failure: failureUrl,
      pending: pendingUrl
    },
    auto_return: 'approved',
    statement_descriptor: 'MARE CERTA PRO'
  };

  const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Mercado Pago Error (${response.status}): ${JSON.stringify(data)}`);
  }

  return {
    success: true,
    preference_id: data.id,
    init_point: data.init_point,
    sandbox_init_point: data.sandbox_init_point,
    plan,
    external_reference: externalReference
  };
}

export async function activateProInFirebase({ uid, email = '', displayName = 'Pescador PRO', planId = 'annual', paymentId = `mp-${Date.now()}`, durationDays = null, roleLabel = null, isFreeGrant = false }) {
  const plan = PRO_PLANS[planId] || PRO_PLANS.annual;
  const days = Number(durationDays) || plan.durationDays || (plan.id === 'annual' ? 365 : 30);
  const activatedAt = Date.now();
  const expiresAt = activatedAt + days * 86400000;
  const customRole = roleLabel || (isFreeGrant ? 'PRO Cortesia (Liberado pelo Admin)' : `Assinante PRO ${plan.id === 'monthly' ? 'Mensal' : 'Anual'} (Mercado Pago Oficial)`);

  const profilePayload = {
    isPro: true,
    proPlan: isFreeGrant ? 'vip_cortesia' : plan.id,
    proDurationDays: days,
    proActivatedAt: activatedAt,
    proExpiresAt: expiresAt,
    proPaymentId: String(paymentId)
  };

  const grantPayload = {
    key: uid,
    uid,
    email: email || '',
    displayName,
    active: true,
    isPaidSubscription: !isFreeGrant,
    isFreeGrant: Boolean(isFreeGrant),
    planId: plan.id,
    roleLabel: customRole,
    durationDays: days,
    grantedAt: activatedAt,
    expiresAt,
    paymentId: String(paymentId),
    revokedAt: null
  };

  // Salva no arquivo de assinaturas aprovadas local
  try {
    const dataDir = path.resolve('backend-hostinger/data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const dataFile = path.join(dataDir, 'approved_subscriptions.json');
    let existing = {};
    if (fs.existsSync(dataFile)) {
      try { existing = JSON.parse(fs.readFileSync(dataFile, 'utf8')) || {}; } catch {}
    }
    existing[uid] = {
      uid,
      email,
      name: displayName,
      active: true,
      planId: plan.id,
      isFreeGrant: Boolean(isFreeGrant),
      roleLabel: customRole,
      durationDays: days,
      activatedAt,
      expiresAt,
      paymentId: String(paymentId),
      revokedAt: null
    };
    fs.writeFileSync(dataFile, JSON.stringify(existing, null, 2), 'utf8');
  } catch (err) {
    console.warn('Falha ao salvar em approved_subscriptions.json local', err);
  }

  // Atualiza no Firebase Realtime Database se conectado
  let profileStatus = null;
  let grantStatus = null;
  try {
    const rtdbProfileRes = await fetch(`${FIREBASE_RTDB_URL}/mareCerta/extendedProfiles/${uid}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profilePayload)
    });
    profileStatus = rtdbProfileRes.status;

    const rtdbGrantRes = await fetch(`${FIREBASE_RTDB_URL}/mareCerta/vipGrants/${uid}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(grantPayload)
    });
    grantStatus = rtdbGrantRes.status;
  } catch (netErr) {
    // Permite que o servidor continue funcionando mesmo se offline
  }

  return {
    success: true,
    uid,
    planId: plan.id,
    durationDays,
    expiresAt,
    paymentId,
    firebaseStatus: {
      profile: profileStatus,
      grant: grantStatus
    }
  };
}

export function handleMpBackendRoutes(req, res) {
  const parsedUrl = new URL(req.url, 'http://localhost:4173');
  const pathname = parsedUrl.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return true;
  }

  // 1. Criar Preferência Oficial Mercado Pago
  if (pathname === '/api/mp/create_preference' && req.method === 'POST') {
    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', async () => {
      try {
        const body = JSON.parse(bodyStr || '{}');
        const result = await createMercadoPagoPreference(body);
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify(result));
      } catch (err) {
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 500;
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return true;
  }

  // 2. Simular Aprovação Instantânea (Atalho para Testes Locais e Painel Admin)
  if (pathname === '/api/mp/simulate_approval' && req.method === 'POST') {
    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', async () => {
      try {
        const body = JSON.parse(bodyStr || '{}');
        const result = await activateProInFirebase({
          uid: body.uid,
          email: body.email,
          displayName: body.name || body.displayName,
          planId: body.planId || 'annual',
          paymentId: body.paymentId || `sim-${Date.now()}`,
          durationDays: body.durationDays || null,
          roleLabel: body.roleLabel || null,
          isFreeGrant: Boolean(body.isFreeGrant)
        });
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify(result));
      } catch (err) {
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 500;
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return true;
  }

  // 3. Obter Mapa Centralizado de Assinaturas & Cortesias VIP
  if (pathname === '/api/mp/vip_grants' && req.method === 'GET') {
    const dataFile = path.resolve('backend-hostinger/data/approved_subscriptions.json');
    let subs = {};
    if (fs.existsSync(dataFile)) {
      try { subs = JSON.parse(fs.readFileSync(dataFile, 'utf8')) || {}; } catch {}
    }
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify(subs));
    return true;
  }

  // 4. Webhook de Notificação do Mercado Pago
  if (pathname === '/api/mp/webhook' && (req.method === 'POST' || req.method === 'GET')) {
    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', async () => {
      try {
        const body = bodyStr ? JSON.parse(bodyStr) : {};
        const paymentId = parsedUrl.searchParams.get('data.id') || parsedUrl.searchParams.get('id') || body?.data?.id || body?.id;

        if (!paymentId) {
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify({ status: 'ignored' }));
          return;
        }

        const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` }
        });
        const paymentData = await mpRes.json();

        if (paymentData.status === 'approved') {
          const parts = (paymentData.external_reference || '').split('__');
          const uid = parts[0] || paymentData.payer?.email || `mp-user-${paymentId}`;
          const planId = parts[1] || 'annual';

          await activateProInFirebase({
            uid,
            email: paymentData.payer?.email,
            displayName: paymentData.payer?.first_name,
            planId,
            paymentId
          });

          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify({ success: true, status: 'approved', uid }));
          return;
        }

        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify({ status: paymentData.status }));
      } catch (err) {
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 500;
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return true;
  }

  // 5. Checar Status de Assinatura (Arquivo Local + Consulta Direta API Mercado Pago)
  if (pathname === '/api/mp/check_subscription' && req.method === 'GET') {
    const uid = parsedUrl.searchParams.get('uid') || '';
    const email = (parsedUrl.searchParams.get('email') || '').toLowerCase();
    const dataFile = path.resolve('backend-hostinger/data/approved_subscriptions.json');

    // Se acessado direto no navegador sem parâmetros, serve como health check
    if (!uid && !email) {
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      res.end(JSON.stringify({
        status: 'online',
        message: 'Backend Mercado Pago Maré Certa está ativo e respondendo!',
        timestamp: Date.now()
      }));
      return true;
    }

    (async () => {
      let isExplicitlyRevoked = false;
      let revokedAt = null;

      if (fs.existsSync(dataFile)) {
        try {
          const subs = JSON.parse(fs.readFileSync(dataFile, 'utf8')) || {};
          let found = null;
          if (uid && subs[uid]) found = subs[uid];
          else if (email) {
            for (const item of Object.values(subs)) {
              if (item.email && item.email.toLowerCase() === email) {
                found = item;
                break;
              }
            }
          }
          if (found) {
            if (found.active === false && found.revokedAt) {
              isExplicitlyRevoked = true;
              revokedAt = found.revokedAt;
            } else if (found.active && (!found.expiresAt || found.expiresAt > Date.now())) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({
                active: true,
                planId: found.planId || 'annual',
                isFreeGrant: Boolean(found.isFreeGrant),
                roleLabel: found.roleLabel || null,
                durationDays: found.durationDays || 365,
                expiresAt: found.expiresAt,
                paymentId: found.paymentId
              }));
              return;
            }
          }
        } catch (err) {
          console.warn('Erro ao ler assinaturas:', err);
        }
      }

      // Se a conta foi explicitamente colocada como gratuita/revogada pelo admin, NÃO reativa com pagamentos antigos
      if (isExplicitlyRevoked) {
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify({ active: false, revoked: true, revokedAt }));
        return;
      }

      // Consulta direta na API do Mercado Pago caso tenha acabado de pagar no Checkout
      if (uid) {
        try {
          const mpSearchRes = await fetch('https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&limit=15', {
            headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` }
          });
          if (mpSearchRes.ok) {
            const mpSearchData = await mpSearchRes.json();
            const results = mpSearchData?.results || [];
            const match = results.find(p =>
              p.status === 'approved' &&
              typeof p.external_reference === 'string' &&
              p.external_reference.startsWith(`${uid}__`)
            );
            if (match) {
              const parts = match.external_reference.split('__');
              const planId = parts[1] || 'annual';
              const activated = await activateProInFirebase({
                uid,
                email: match.payer?.email || email,
                displayName: match.payer?.first_name || 'Assinante PRO',
                planId,
                paymentId: match.id
              });
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({
                active: true,
                planId: activated.planId,
                durationDays: activated.durationDays,
                expiresAt: activated.expiresAt,
                paymentId: match.id,
                source: 'mercadopago_live_search'
              }));
              return;
            }
          }
        } catch {}
      }

      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      res.end(JSON.stringify({ active: false }));
    })();
    return true;
  }

  // 5. Revogar Assinatura (para testes locais e painel admin)
  if (pathname === '/api/mp/revoke_subscription' && req.method === 'POST') {
    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', () => {
      try {
        const body = JSON.parse(bodyStr || '{}');
        const uid = body.uid || '';
        const email = (body.email || '').toLowerCase();
        const dataFile = path.resolve('backend-hostinger/data/approved_subscriptions.json');
        if (fs.existsSync(dataFile)) {
          const subs = JSON.parse(fs.readFileSync(dataFile, 'utf8')) || {};
          let found = false;
          for (const [k, v] of Object.entries(subs)) {
            if (k === uid || (v.email && v.email.toLowerCase() === email) || (email && k.toLowerCase() === email)) {
              subs[k].active = false;
              subs[k].revokedAt = Date.now();
              found = true;
            }
          }
          if (!found && uid) {
            subs[uid] = { uid, email, active: false, revokedAt: Date.now() };
          }
          fs.writeFileSync(dataFile, JSON.stringify(subs, null, 2), 'utf8');
        }
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, message: 'Assinatura revogada no backend.' }));
      } catch (err) {
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 500;
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return true;
  }

  return false;
}

// Inicia servidor independente se executado diretamente
if (process.argv[1] && process.argv[1].endsWith('local-server.js')) {
  const PORT = process.env.PORT || 4174;
  const server = http.createServer((req, res) => {
    const handled = handleMpBackendRoutes(req, res);
    if (!handled) {
      res.statusCode = 404;
      res.end('Not Found');
    }
  });

  server.listen(PORT, () => {
    console.log(`Backend Mercado Pago Local rodando em http://localhost:${PORT}/`);
    console.log(`- POST /api/mp/create_preference`);
    console.log(`- POST /api/mp/simulate_approval`);
    console.log(`- POST /api/mp/webhook`);
  });
}
