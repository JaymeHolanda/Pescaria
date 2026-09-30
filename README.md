# Maré Certa · Pescaria

Site em português com maré, janelas de pesca (3 horas antes da alta), vento, fase lunar e ranking de pescadores.

## Executar

```sh
npm ci
npm run dev
```

Acesse http://localhost:4173/ no desenvolvimento. Para publicar arquivos estáticos: `npm run build` e sirva a pasta `dist`. `npm test` valida o cálculo do ranking e as capturas. Use Node.js 20 ou superior para as versões atuais do SDK Firebase.

## Firebase

O SDK Firebase é instalado via npm e compilado com esbuild. O projeto configurado é `teste-b81e2`, usando Authentication (e-mail/senha) e Realtime Database. A configuração web é pública; não contém credenciais administrativas. Senhas são gerenciadas pelo Firebase Authentication e nunca gravadas no banco.

1. No Console Firebase, ative **Authentication → Métodos de login → E-mail/senha**.
2. Em Authentication → Configurações → Domínios autorizados, adicione os domínios usados pelo site, incluindo `localhost` para testes locais.
3. Publique `database.rules.json` na aba Regras do Realtime Database. Estas regras são para os novos nós `mareCerta/profiles` e `mareCerta/captures`. Se o projeto já tiver outras aplicações, incorpore esses nós às regras existentes; não substitua regras de outros dados sem revisar.
4. Alternativamente, usando Firebase CLI autenticado com permissão no projeto: `npx firebase-tools deploy --only database --project teste-b81e2`.

Perfis públicos guardam apenas nome e data de criação. Capturas públicas guardam UID, espécie, quantidade, peso total opcional, data e local. Só o proprietário pode cadastrar/excluir suas capturas; o ranking é calculado a partir dos registros, sem contador editável pelo usuário. E-mails ficam no Authentication. A localização da previsão permanece como preferência local no aparelho.

O ranking inclui todos os registros disponíveis e atualiza em tempo real. Capturas são autodeclaradas; não há moderação ou verificação de competição nesta versão. Analytics não é inicializado, pois não é necessário para cadastro e ranking.

## Dados ambientais

Fontes: [Open-Meteo](https://open-meteo.com/) / DWD. A curva marítima usa nível do mar em relação ao nível médio, com extremos detectados em dados horários. O percentual lunar é calculado a partir da fase fornecida pela API. As janelas representam a regra escolhida pelo produto e não garantem produtividade de pesca.
