# Estratégia de SEO Programático e Ranqueamento Dinâmico — Maré Certa

Este documento detalha a arquitetura e o passo a passo técnico para transformar o **Maré Certa** em uma autoridade orgânica no Google, capturando o tráfego de mais de **200.000 buscas mensais** identificadas para termos de tábua da maré e pesca no Brasil.

---

## 1. Diagnóstico do Volume e Oportunidade de Mercado

Com base na pesquisa de palavras-chave realizada, o público pesquisa com **alta intenção geográfica** e a concorrência possui baixa dificuldade de SEO (SD < 30):

| Palavra-Chave | Volume Mensal | Dificuldade (SD) | Intenção |
| :--- | :--- | :--- | :--- |
| **tabua da mare** (termo raiz) | 49.500 | 27 (Baixo) | Geral / Informacional |
| **tabua de mare recife** | 27.100 | Baixo | Local (PE) |
| **tabua de mare salvador** | 22.200 | Baixo | Local (BA) |
| **tabua de mare natal** | 14.800 | Baixo | Local (RN) |
| **tábua da maré em joão pessoa** | 12.100 | Baixo | Local (PB) |
| **tabua da mare porto de galinhas** | 6.600 | Baixo | Turismo / Praia |
| **tábua da maré joão pessoa** | 3.600 | Baixo | Local (PB) |
| **tábua da maré cabedelo** | 2.900 | Baixo | Porto / Pesca |
| **tábua da maré maragogi** | 2.900 | Baixo | Turismo / Pesca |
| **tábua da maré maceió** | 2.400 | Baixo | Local (AL) |
| **tabua de mare vitoria** | 2.400 | Baixo | Local (ES) |
| **tabua de maré hoje / para amanhã** | 4.000+ | Baixo | Temporalidade Imediata |
| **Outros 350+ municípios costeiros** | 100.000+ | Muito Baixo | Cauda Longa (*Long-tail*) |

> **Conclusão:** O Google não posiciona sites que têm apenas uma página inicial (`index.html`) para buscas como *"tábua de maré recife"*. Ele busca e prioriza URLs dedicadas, com título e conteúdo contextualizados para cada localidade.

---

## 2. Arquitetura de SEO Programático (*Programmatic SEO*)

A estratégia consiste em criar centenas de páginas otimizadas a partir de um único template inteligente alimentado por uma base de dados de localidades.

### 2.1. Estrutura Canônica de URLs
Adotaremos URLs amigáveis, curtas e sem parâmetros feios:
* `seusite.com.br/tabua-da-mare/joao-pessoa-pb/`
* `seusite.com.br/tabua-da-mare/cabedelo-pb/`
* `seusite.com.br/tabua-da-mare/recife-pe/`
* `seusite.com.br/tabua-da-mare/salvador-ba/`
* `seusite.com.br/tabua-da-mare/natal-rn/`
* `seusite.com.br/tabua-da-mare/porto-de-galinhas-pe/`

### 2.2. Base de Dados de Localidades (`src/data/spots-seo.json`)
Cada cidade/porto terá um registro no catálogo com metadados para SEO:
```json
{
  "slug": "recife-pe",
  "nome": "Recife",
  "uf": "PE",
  "portoReferencia": "Porto do Recife",
  "lat": -8.0543,
  "lng": -34.8813,
  "praiasPrincipais": ["Boa Viagem", "Pina", "Brasília Teimosa"],
  "peixesComuns": ["Camurupim", "Robalo", "Xaréu", "Pampo"],
  "tituloCustom": "Tábua da Maré Recife PE Hoje - Horários e Previsão de Pesca",
  "descricaoCustom": "Tábua da maré oficial em Recife (PE) hoje. Veja horários de preamar, baixa-mar, vento, altura de ondas e as melhores janelas para pesca."
}
```

---

## 3. Templates Dinâmicos de On-Page SEO

Para cada página gerada, o gerador preencherá automaticamente os elementos mais valorizados pelos algoritmos de busca:

### 3.1. `<title>` e `<meta name="description">`
* **Padrão do Title (máx. 60 caracteres):**
  `Tábua da Maré [Cidade] [UF] Hoje e Janelas de Pesca | Maré Certa`
* **Padrão da Meta Description (máx. 155 caracteres):**
  `Confira a tábua da maré em [Cidade] ([UF]) atualizada hoje. Gráfico horário, vento, ondas, fase lunar e horários ideais para pesca de praia e costeira.`

### 3.2. Dados Estruturados Schema.org (JSON-LD)
Para exibir *Rich Snippets* (perguntas frequentes e previsões direto nos resultados do Google):
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Tábua da Maré Recife PE",
  "description": "Previsão de maré e condições para pesca em Recife PE",
  "mainEntity": {
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Qual é a melhor maré para pescar em Recife?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "As melhores janelas de pesca em Recife ocorrem cerca de 2 a 3 horas antes do pico da maré cheia (preamar), momento em que os peixes predadores se aproximam da costa para se alimentar."
        }
      },
      {
        "@type": "Question",
        "name": "Qual porto fornece a maré oficial de Recife?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "A referência oficial é fornecida pelo Centro de Hidrografia da Marinha (CHM) para a estação maregráfica do Porto do Recife."
        }
      }
    ]
  }
}
</script>
```

---

## 4. Conteúdo Textual Dinâmico (Evitando Penalização de "Página Vazia")

O Google rejeita páginas que contêm apenas gráficos em JavaScript e nenhum texto HTML legível pelo rastreador (*crawler*).

Abaixo do gráfico de maré e dos cartões de pesca, cada página conterá 3 seções geradas automaticamente com variáveis dinâmicas:

1. **Resumo Operacional do Dia:**
   * *"Hoje em [Cidade] ([UF]), a maré atinge o ponto mais alto com [X.X]m às [HH:MM] e o ponto mais baixo com [Y.Y]m às [HH:MM]. O coeficiente de maré indica condições de [sizígia / quadratura]."*
2. **Dicas de Pesca para a Região de [Cidade]:**
   * Principais praias cadastradas para surfcasting e pesca de arremesso.
   * Espécies mais ativas com base na temperatura da água e época do ano (ex: pampo, robalo, pescada, betara).
3. **Seção de FAQ Contextual (Perguntas Frequentes):**
   * Como ler a tábua de maré de [Cidade]?
   * Qual a influência da fase lunar nas praias de [Cidade]?

---

## 5. Estratégia de Links Internos (*Internal Cross-Linking*)

Para o Googlebot indexar rapidamente todas as páginas sem gastar orçamento de rastreamento (*crawl budget*):

1. **Navegação por Cidades Vizinhas:**
   * No rodapé da página de **João Pessoa**, adicionar links:
     `Tábua de Maré em Cidades Próximas: [Cabedelo] | [Lucena] | [Jacumã] | [Recife] | [Natal]`
2. **Hub por Estados:**
   * `/tabua-da-mare/paraiba/` (lista todas as praias e portos da PB).
   * `/tabua-da-mare/pernambuco/` (lista Recife, Olinda, Porto de Galinhas, Tamandaré, etc.).
   * `/tabua-da-mare/rio-grande-do-norte/` (Natal, Pipa, Tibau do Sul, etc.).

---

## 6. Geração Técnica na HostGator (Static Site Generation / SSG)

Como a HostGator roda servidor web padrão (Apache com cPanel):

1. **Script de Build (`scripts/build-seo-pages.mjs`):**
   * Criamos um script Node.js que lê `spots-seo.json` e gera pastas estáticas dentro de `dist/tabua-da-mare/[slug]/index.html`.
   * Cada arquivo já nasce com o HTML, títulos, tags OpenGraph (Facebook/WhatsApp), metadados e texto base pré-renderizados no servidor.
   * Quando o visitante acessa, o carregamento é instantâneo (menos de 0.5s), garantindo nota 100 no Google PageSpeed Insights.
2. **Sitemap Dinâmico (`sitemap.xml`):**
   * Gerado automaticamente no build, listando todas as URLs com prioridade `0.9` e `<changefreq>daily</changefreq>`.
   * Submetido diretamente no **Google Search Console**.
3. **Arquivo `robots.txt`:**
   ```text
   User-agent: *
   Allow: /
   Sitemap: https://marecerta.com.br/sitemap.xml
   ```

---

## 7. Cronograma de Implementação

* **Etapa 1:** Criar `src/data/spots-seo.json` com os 20 primeiros locais de maior volume (Recife, Salvador, Natal, João Pessoa, Cabedelo, Porto de Galinhas, Maceió, Santos, etc.).
* **Etapa 2:** Desenvolver o script de geração estática de páginas com metatags e FAQ dinâmicos.
* **Etapa 3:** Criar o componente de rodapé com cross-linking entre municípios vizinhos.
* **Etapa 4:** Gerar `sitemap.xml` e `robots.txt`.
* **Etapa 5:** Enviar para o Google Search Console assim que o domínio estiver ativo na HostGator.
