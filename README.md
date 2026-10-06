# Maré Certa · Pescaria

Site em português com maré, janelas de pesca (3 horas antes da alta), vento, fase lunar e ranking de pescadores.

## Executar

```sh
npm ci
npm run dev
```

Acesse http://localhost:4173/ no desenvolvimento. Para publicar arquivos estáticos: `npm run build` e sirva a pasta `dist`. `npm test` valida o cálculo do ranking e as capturas. Use Node.js 20 ou superior para as versões atuais do SDK Firebase.

## GitHub Pages

Em **Settings → Pages**, escolha **Deploy from a branch → main → /(root)**. O arquivo `index.html` na raiz abre o site, com os arquivos estáticos em `dist`, e `.nojekyll` evita o processamento como site Jekyll. Execute `npm run build` após alterações para sincronizar a página e compilar o SDK. Não escolha a pasta `docs`.

## Configurar o Firebase

O SDK Firebase é instalado via npm e compilado com esbuild. O projeto configurado é `teste-b81e2`, usando Authentication (e-mail/senha) e Realtime Database. A configuração web é pública; não contém credenciais administrativas. Senhas são gerenciadas pelo Firebase Authentication e nunca gravadas no banco.

1. No Console Firebase, ative **Authentication → Métodos de login → E-mail/senha**.
2. Em Authentication → Configurações → Domínios autorizados, adicione os domínios usados pelo site, incluindo `localhost` para testes locais.
3. Publique `database.rules.json` na aba Regras do Realtime Database. Estas regras são para os novos nós `mareCerta/profiles` e `mareCerta/captures`. Se o projeto já tiver outras aplicações, incorpore esses nós às regras existentes; não substitua regras de outros dados sem revisar.
4. Alternativamente, usando Firebase CLI autenticado com permissão no projeto: `npx firebase-tools deploy --only database --project teste-b81e2`.

No GitHub Pages, adicione `jaymeholanda.github.io` aos domínios autorizados do Authentication. Se a conta já foi criada e o banco recusou o perfil, não cadastre novamente: depois de publicar as regras, abra **Minha conta → Concluir perfil**. O site usa **Realtime Database**, não Cloud Firestore; publique as regras no serviço correto, na instância `teste-b81e2-default-rtdb`.

Perfis públicos guardam apenas nome e data de criação. Capturas públicas guardam UID, espécie, quantidade, peso total opcional, data e local. Só o proprietário pode cadastrar/excluir suas capturas; o ranking é calculado a partir dos registros, sem contador editável pelo usuário. E-mails ficam no Authentication. A localização da previsão permanece como preferência local no aparelho.

O ranking inclui todos os registros disponíveis e atualiza em tempo real. Capturas são autodeclaradas; não há moderação ou verificação de competição nesta versão. Analytics não é inicializado, pois não é necessário para cadastro e ranking.

## Dados ambientais

Fontes: [Open-Meteo](https://open-meteo.com/) / DWD. A curva marítima usa nível do mar em relação ao nível médio, com extremos detectados em dados horários. O percentual lunar é calculado a partir da fase fornecida pela API. As janelas representam a regra escolhida pelo produto e não garantem produtividade de pesca.
# Referência de maré de João Pessoa

Para locais a até 40 km da estação do Porto de Cabedelo, horários e alturas vêm da tábua anual de 2026 do CHM/Marinha, incorporada em `src/cabedelo-2026.js`. O fuso é UTC−03 e as alturas mantêm a referência local da tabela: não são profundidades da água. A curva entre os extremos usa interpolação de meia cossenoide apenas ilustrativa; as janelas usam os horários oficiais, incluindo a data anterior quando necessário. Vento e ondas continuam nas APIs Open-Meteo. Outros locais usam o modelo oceânico, identificado como estimativa relativa ao nível médio global.

Fonte: https://www.marinha.mil.br/cppb/sites/www.marinha.mil.br.cppb/files/2025-12/2026-PORTO-DE-CABEDELO.pdf

Atualização anual necessária: fora de 2026, a interface informa ausência da tábua oficial e não troca silenciosamente para outro referencial. Para extrair uma tabela do mesmo formato: `python scripts/extract-cabedelo.py caminho.pdf` (requer pypdf), revisar o JSON contra o PDF e atualizar o módulo e os testes. Cabedelo é uma referência regional, não uma previsão exata para cada praia.

