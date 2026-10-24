# Diretrizes de Segurança, Mídia e Conformidade (LGPD) — Maré Certa

Este documento reúne todas as decisões arquiteturais, boas práticas de segurança, gestão de custos de infraestrutura e conformidade legal (LGPD) para a evolução do **Maré Certa** em formato de rede social e comunidade de pescadores.

---

## 1. Armazenamento e Upload de Fotos (Feed de Capturas)

### 1.1. Proteção de Credenciais e Segurança no Upload
* **PROIBIDO:** Nunca expor chaves administrativas (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, Service Accounts ou senhas de banco de dados) no código JavaScript do navegador.
* **Se usar Amazon S3 ou Cloudflare R2:**
  * O front-end **nunca** envia credenciais diretas.
  * O upload deve ser feito obrigatoriamente através de **URLs Pré-assinadas (*Presigned URLs*)**:
    1. O cliente autenticado solicita uma permissão temporária de upload ao backend (ou Cloud Function / script PHP seguro na hospedagem).
    2. O backend valida a sessão e gera uma URL assinada válida por 5 minutos exclusiva para aquele arquivo.
    3. O navegador faz o upload via método `PUT` direto para a URL pré-assinada.
* **Se usar Firebase Storage:**
  * Integra-se nativamente com o Firebase Authentication já existente.
  * O upload é protegido via regras declarativas de segurança (*Security Rules*):
    ```text
    rules_version = '2';
    service firebase.storage {
      match /b/{bucket}/o {
        match /captures/{userId}/{imageId} {
          allow read: if true;
          allow write: if request.auth != null 
                       && request.auth.uid == userId
                       && request.resource.size < 1 * 1024 * 1024
                       && request.resource.contentType.matches('image/(jpeg|png|webp)');
        }
      }
    }
    ```

### 1.2. Otimização de Imagens e Controle de Custos (Front-end)
* **Compressão no Navegador (Obrigatória):** O celular do pescador tira fotos de 4 MB a 10 MB. Antes de qualquer upload:
  * Redimensionar a imagem para no máximo 1080px na maior dimensão.
  * Converter para o formato moderno **WebP** com qualidade entre 75% e 80%.
  * O tamanho final deve ficar entre 60 KB e 120 KB (redução de mais de 95% de banda).
* **Prevenção contra Custos de Tráfego de Saída (*Egress*):**
  * O Amazon S3 cobra após 100 GB de download mensal. Se o feed crescer para 50.000 usuários, prefira **Cloudflare R2** (zero custo de tráfego) ou coloque uma CDN (Cloudflare/CloudFront) cacheando as imagens públicas na frente do S3.
* **Não salvar fotos no disco local da HostGator:** Evita estourar o limite de *Inodes* (quantidade máxima de arquivos da cPanel) e travamento de I/O em horários de pico.

---

## 2. Conformidade com a LGPD (Lei Geral de Proteção de Dados - Lei 13.709/2018)

### 2.1. Princípio da Minimização de Dados
* Coletar apenas o estritamente necessário para o funcionamento da plataforma:
  * E-mail e senha (gerenciados pelo Firebase Auth com hash seguro).
  * Nome de exibição público / apelido do pescador.
  * Fotos e metadados das capturas (espécie, peso opcional, praia/região e data).
* **Localização Precisa:** O GPS exato do aparelho não deve ser salvo em banco sem autorização explícita; o pescador escolhe o ponto de pesca público (ex: *"Praia do Bessa"* ou *"Cabedelo"*).

### 2.2. Direitos do Titular (Direito ao Esquecimento)
* O usuário deve ter na tela de **Meu Perfil** a opção visível de:
  1. **Excluir capturas/fotos:** Remoção imediata do banco de dados e do bucket de armazenamento.
  2. **Excluir conta:** Apagar o perfil do Firebase Auth e anonimizar ou remover todos os registros associados.

### 2.3. Termos de Uso e Política de Privacidade
* Checkbox de aceite obrigatório no cadastro com link para:
  * **Política de Privacidade:** Detalhando quais dados são gravados, finalidade exclusiva para a comunidade/ranking e uso de cookies do Google AdSense.
  * **Termos de Uso:**
    * Declaração de que o usuário é titular dos direitos autorais da foto postada.
    * **Proibição expressa de fotos de pesca ilegal ou predatória** (peixes abaixo da medida mínima legal estipulada pelo IBAMA/Ministério da Pesca ou espécies ameaçadas em período de defeso).
    * Isenção de responsabilidade sobre acidentes marítimos (a previsão do mar é informativa e probabilística).

---

## 3. Resiliência de APIs e Tráfego Intenso (Pico de 50.000 Usuários)

### 3.1. Cache no Cliente (`localStorage`)
* Dados climáticos e de ondas (Open-Meteo) mudam a cada hora, não a cada segundo.
* Salvar a previsão consultada no `localStorage` do navegador com validade (TTL) de **1 a 2 horas**.
* Se o mesmo pescador abrir o site 10 vezes no mesmo dia para olhar a maré, 9 requisições serão servidas direto do cache do aparelho, zerando consumo de API.

### 3.2. Eliminação de Proxies CORS Públicos em Produção
* Em desenvolvimento, serviços como `corsproxy.io` ou `allorigins.win` são toleráveis para testes.
* Em produção com alto tráfego, esses serviços públicos bloqueiam requisições (erro 429).
* Dados anuais de maré oficiais dos portos devem ser pré-processados e servidos como arquivos estáticos locais (como já feito com `cabedelo-2026.js`), tornando a maré imune a quedas de APIs externas.

### 3.3. Moderação Comunitária de Comentários
* Ao implementar a seção de comentários nas fotos do feed:
  * Limitar tamanho do texto (ex: 280 caracteres).
  * Aplicar filtro básico de palavras ofensivas/spam.
  * Botão de "Denunciar Foto/Comentário" para revisão pelo administrador.

---
*Documento registrado na branch `desenvolvimento` em 24/10/2026.*
