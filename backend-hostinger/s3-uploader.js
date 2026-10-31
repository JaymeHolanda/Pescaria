/**
 * Maré Certa — Módulo de Upload para AWS S3 (Node.js nativo com AWS Signature V4)
 * Realiza o upload seguro de imagens (perfil, troféus e capturas) para o S3.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

function loadEnvConfig() {
  const env = {
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '',
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || '',
    AWS_REGION: process.env.AWS_REGION || 'us-east-2',
    S3_BUCKET: process.env.S3_BUCKET || 'pescaimages'
  };

  // Busca arquivo .env na raiz do projeto se não estiver em process.env
  const envPath = path.resolve('.env');
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const [k, ...v] = trimmed.split('=');
        if (k && v.length) {
          const key = k.trim();
          const val = v.join('=').trim().replace(/^['"]|['"]$/g, '');
          if (!env[key] || env[key] === 'us-east-2') env[key] = val;
        }
      });
    } catch {}
  }

  // Ajuste inteligente: se a região informada for us-east-1 mas o bucket for pescaimages, usar us-east-2
  if (env.AWS_REGION === 'us-east-1' && env.S3_BUCKET === 'pescaimages') {
    env.AWS_REGION = 'us-east-2';
  }

  return env;
}

function hmac(key, string) {
  return crypto.createHmac('sha256', key).update(string, 'utf8').digest();
}

function hash(stringOrBuffer) {
  return crypto.createHash('sha256').update(stringOrBuffer).digest('hex');
}

export async function uploadBufferToS3(key, buffer, contentType = 'image/webp') {
  const env = loadEnvConfig();
  if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('Credenciais da AWS S3 não configuradas no .env');
  }

  const region = env.AWS_REGION || 'us-east-2';
  const bucket = env.S3_BUCKET || 'pescaimages';
  const host = `${bucket}.s3.${region}.amazonaws.com`;
  const endpoint = `https://${host}/${encodeURI(key)}`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const payloadHash = hash(buffer);
  const canonicalUri = `/${encodeURIComponent(key).replace(/%2F/g, '/')}`;

  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';

  const canonicalRequest = `PUT\n${canonicalUri}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${hash(canonicalRequest)}`;

  const kDate = hmac(`AWS4${env.AWS_SECRET_ACCESS_KEY}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, 's3');
  const kSigning = hmac(kService, 'aws4_request');
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex');

  const authorizationHeader = `${algorithm} Credential=${env.AWS_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: {
      'Host': host,
      'Content-Type': contentType,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      'Authorization': authorizationHeader
    },
    body: buffer
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`S3 Error (${response.status}): ${errorText}`);
  }

  return endpoint;
}

export function handleS3BackendRoutes(req, res) {
  const urlPath = (req.url || '').split('?')[0];

  if (urlPath === '/api/s3/upload' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const dataUrl = payload.dataUrl;
        const folder = String(payload.folder || 'trophies').replace(/[^a-zA-Z0-9_-]/g, '');
        let filename = String(payload.filename || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`).replace(/[^a-zA-Z0-9._-]/g, '');

        if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Parâmetro dataUrl inválido ou ausente.' }));
          return;
        }

        const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Formato Base64 inválido.' }));
          return;
        }

        const contentType = match[1] || 'image/webp';
        const buffer = Buffer.from(match[2], 'base64');
        const s3Key = `${folder}/${filename}`;

        const publicUrl = await uploadBufferToS3(s3Key, buffer, contentType);

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ ok: true, url: publicUrl, key: s3Key }));
      } catch (err) {
        console.error('Falha no upload para AWS S3:', err.message);
        res.writeHead(500, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return true;
  }

  // Preflight CORS
  if (urlPath === '/api/s3/upload' && req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return true;
  }

  return false;
}
