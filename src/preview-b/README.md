# Versão B · página principal

Página principal: `http://localhost:4173/`. O endereço `/versao-b.html` abre a mesma versão. A versão A foi preservada em `/versao-a.html`.

Execute `npm run build` na raiz do projeto. O script usa `base-a.html` e os módulos originais como base, gera arquivos exclusivos com sufixo B, define a B como principal e sincroniza a entrada do GitHub Pages. Confirma por hash que a base A e seus módulos foram preservados.

Inclui contador da próxima janela no fuso da previsão, seleção do dia correspondente, gráfico com faixas de janelas e consulta por ponteiro ou teclado, transições de valores, reflexo holográfico e filtros de capturas por espécie, local e datas. O ranking usa o mesmo Firebase da versão A.

As condições marítimas são separadas em abas para cada janela. Nota, vento, rajadas e demais métricas usam apenas as amostras horárias dentro do intervalo, incluindo a data anterior quando a janela cruza meia-noite. Cada campo exige todas as amostras esperadas; lacunas aparecem como indisponíveis. A direção usa média circular. O vento médio do card vem do mesmo cálculo da aba correspondente. Dados horários do dia anterior ficam disponíveis para os cálculos sem ocupar um dos sete dias do seletor.
