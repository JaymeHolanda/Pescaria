# Plano de Implementação: Mini Rede Social PRO, Banners & Monetização — Maré Certa

Este documento registra o passo a passo técnico, as regras de negócio e as melhorias estratégicas para a transformação do **Ranking & Capturas** em uma **Mini Rede Social de Pesca** integrada ao **Mercado Pago**, **Amazon S3** e espaços publicitários (**Chumbada Oficial** + **Google AdSense**).

---

## 1. Os 5 Pontos de Melhoria Estratégicos

1. **Feed Aberto para Visualização, Exclusivo PRO para Interação (*Gatilho de Desejo*):**
   * Visitantes gratuitos podem visualizar o feed completo: fotos dos troféus, comentários de outros pescadores, contadores de curtidas/seguidores e medalhas (*achievements*).
   * Ao clicar em **"📸 Adicionar Foto do Troféu"**, **"💬 Responder / Comentar"** ou **"➕ Seguir Pescador"**, o usuário gratuito visualiza o modal de assinatura **Maré Certa PRO**.
2. **Ancoragem de Preço no Clube PRO (Mercado Pago):**
   * **Plano Anual (Recomendado):** **R$ 5,00 / mês** (cobrado R$ 60,00/ano via PIX ou Cartão — 66% de desconto).
   * **Plano Mensal:** **R$ 15,00 / mês** avulso.
3. **Selo "Pescador PRO 👑" e Integração com Conquistas (*Achievements*):**
   * Assinantes recebem o selo **PRO** ao lado do nome na tabela do ranking, nos cards do feed social e nos comentários.
   * Os cards do feed exibem as medalhas costeiras já conquistadas pelo pescador (ex: *Primeira Escama*, *Mestre da Enchente*, *Peso Pesado*).
4. **Compressão Nativa no Navegador antes do Upload (Economia de 98% no S3):**
   * O Amazon S3 não comprime fotos nativamente sem custos extras (Lambda).
   * O navegador do pescador redimensiona automaticamente a foto via HTML5 `<canvas>` para no máximo **1080px** e converte para **WebP (qualidade 0.80)** antes do envio, reduzindo fotos de 5–8 MB para **~70–110 KB**.
5. **Rastreamento de Conversão para Patrocinadores (UTM + WhatsApp):**
   * Os banners da **Chumbada Oficial** (Sidebar Direita e Rodapé) utilizam parâmetros `?utm_source=marecerta&utm_medium=banner` para comprovar o tráfego gerado pelo site na renovação mensal do patrocínio.

---

## 2. Divisão em Etapas de Execução

### Etapa 01 — Estrutura Visual, Banners, Compressão WebP e Simulador Local (Em Execução)
*Objetivo: Entregar 100% da experiência funcionando localmente (`localhost`) sem depender de chaves externas para validação imediata.*

* **1.1. Sidebar Direita na Aba "Condições de Pesca":**
  * Card **Patrocinador Oficial — Chumbada Oficial** no topo da sidebar direita (`dist/assets/chumbada-oficial-sidebar.png`).
  * Espaço dedicado logo abaixo no mesmo formato visual para **Google AdSense** (300×250 / Responsivo).
* **1.2. Banner Retangular no Rodapé (*Footer*):**
  * Inclusão do banner horizontal oficial da **Chumbada Oficial** (`dist/assets/chumbada-oficial-footer.png`) com destaque de parceiro oficial.
* **1.3. Mini Rede Social no Ranking & Capturas:**
  * Upload de **1 foto do troféu por captura** com compressão instantânea no navegador (`WebP` ≤ 1080px) e indicador da taxa de economia (ex: *"Foto otimizada: de 4.2 MB para 84 KB"*).
  * Feed em formato de rede social com:
    * Foto do troféu em destaque, espécie, quantidade, peso, praia e data.
    * Medalhas (*Achievements*) do autor exibidas no cabeçalho do post.
    * Botão **Seguir Pescador** (`➕ Seguir` / `✓ Seguindo`).
    * Botão **Curtir / Parabenizar** (`👏 Boa pesca!`).
    * Seção de **Respostas e Comentários** em cada post.
* **1.4. Paywall & Simulador Mercado Pago Local:**
  * Modal **Clube Maré Certa PRO** com escolha entre Plano Anual (R$ 5/mês · R$ 60/ano) e Plano Mensal (R$ 15/mês).
  * Modo de simulação local (Sandbox UI) permitindo alternar entre **Conta Gratuita** e **Assinante PRO** com 1 clique para testar todos os fluxos no `localhost`.

---

### Etapa 02 — Integração de Produção (Mercado Pago, AWS S3 e Hostinger)
*Objetivo: Conectar os serviços de nuvem reais após validação local da Etapa 01.*

#### Checklist do que preparar para a Etapa 02:
1. **Amazon S3 (Armazenamento de Fotos):**
   * Criar bucket na região **`us-east-1` (Norte da Virgínia)** (custo ~50% menor em dólar que `sa-east-1`).
   * Configurar política de CORS liberando `http://localhost:4173` e o domínio de produção.
   * Gerar `AWS_ACCESS_KEY_ID` e `AWS_SECRET_ACCESS_KEY` de um usuário IAM restrito ao bucket (armazenadas apenas no `.env` do servidor / endpoint de Presigned URL).
2. **Mercado Pago Developers (Checkout / PIX / Assinatura):**
   * Criar aplicação em [Mercado Pago Developers](https://www.mercadopago.com.br/developers/pt).
   * Copiar credenciais de Sandbox (`TEST_PUBLIC_KEY` e `TEST_ACCESS_TOKEN`) para testes homologados e, posteriormente, credenciais de Produção.
   * Configurar Webhook para atualizar o status `isPro: true` e `proExpiresAt` no nó `mareCerta/profiles/{uid}` do Firebase.
3. **Link Oficial da Chumbada Oficial:**
   * Definir a URL final de destino do clique nos banners (Instagram, loja virtual ou link direto de WhatsApp comercial).

---
*Documento registrado na branch `desenvolvimento` em 24/10/2026.*
