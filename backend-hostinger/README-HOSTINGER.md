# 🚀 Backend Maré Certa — Hostinger (cPanel / hPanel)

Este diretório contém a API oficial do Mercado Pago para processar cobranças e ativar assinaturas PRO automaticamente no Firebase Realtime Database.

---

## 📁 Arquivos Incluídos

* **`config.php`**: Credenciais da API do Mercado Pago (`MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`) e URL do Firebase.
* **`create_preference.php`**: Endpoint que cria a preferência oficial de checkout com o ID do usuário (`external_reference`).
* **`webhook.php`**: Endpoint que recebe as notificações oficiais do Mercado Pago e ativa o PRO no Firebase e no servidor em tempo real.
* **`check_subscription.php`**: Endpoint que consulta se o usuário possui assinatura ativa confirmada.
* **`local-server.js`**: Emulador local do backend em Node.js (sem precisar de PHP no Windows) integrado ao Vite.

---

## 💻 Como Rodar e Testar Localmente no Computador

Você não precisa de PHP instalado no Windows para testar! Criamos uma simulação completa integrada ao Vite:

1. **Inicie o projeto local:**
   ```bash
   npm run dev
   ```
   *(O Vite dev server em `http://localhost:4173` já roteia automaticamente as chamadas `/api/mp/*` diretamente para o backend simulado).*

2. **No site (`http://localhost:4173`):**
   - Faça login na sua conta.
   - Abra o modal do **Clube Pescador PRO**.
   - Ao clicar no botão de assinatura, a cobrança oficial é gerada pelo Mercado Pago.
   - Você verá na tela a confirmação de aguardo e um botão de teste rápido: **`⚡ Confirmar Aprovação de Teste no Firebase`**.
   - Ao clicar no botão, ele simula a notificação oficial do Mercado Pago e ativa imediatamente sua conta como PRO!

---

## 🛠️ Como Subir para a Hostinger (3 Passos Rápidos)

### Passo 1: Acessar o Gerenciador de Arquivos da Hostinger
1. Acesse o painel da sua conta na Hostinger: [hpanel.hostinger.com](https://hpanel.hostinger.com).
2. Vá em **Hospedagem** > selecione seu domínio > **Gerenciador de Arquivos (File Manager)**.
3. Entre na pasta raiz do site: **`public_html`**.

### Passo 2: Criar a pasta da API e enviar os arquivos
1. Dentro de `public_html`, crie uma pasta chamada **`api`** (ou `backend`).
2. Faça o upload dos seguintes arquivos da pasta `backend-hostinger` para dentro de `public_html/api/`:
   - `config.php`
   - `create_preference.php`
   - `webhook.php`
   - `check_subscription.php`
3. A URL da sua API na Hostinger ficará assim:
   - Preferências: `https://seusite.com.br/api/create_preference.php`
   - Webhook: `https://seusite.com.br/api/webhook.php`
   - Checagem: `https://seusite.com.br/api/check_subscription.php`

### Passo 3: Cadastrar o Webhook no Mercado Pago Developers
1. Acesse: [mercadopago.com.br/developers/panel/app](https://www.mercadopago.com.br/developers/panel/app).
2. Selecione a sua aplicação (`3736774688506968`).
3. No menu lateral, clique em **Webhooks / Notificações IPN**.
4. No campo **URL de produção**, cole:
   ```
   https://seusite.com.br/api/webhook.php
   ```
5. Marque o evento: **Pagamentos (Payments)**.
6. Clique em **Salvar**.

---

## ⚡ Como Funciona o Fluxo Automático

1. O cliente clica em assinar o plano **Anual** ou **Mensal** no site.
2. O site chama `create_preference.php`, que gera o link seguro do Mercado Pago já atrelado ao UID do cliente.
3. O cliente paga via PIX, Cartão ou Boleto.
4. O Mercado Pago avisa instantaneamente o arquivo `webhook.php`.
5. O `webhook.php` atualiza o Firebase Realtime Database (`mareCerta/extendedProfiles/${uid}`).
6. O navegador do cliente (que escuta o Firebase via WebSocket) atualiza sozinho para **👑 EDIÇÃO PRO**, sem o cliente precisar fazer nada!
