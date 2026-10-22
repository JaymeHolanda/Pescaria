# Versão B (Edição Pro) · página principal

Página principal: `http://localhost:4173/`. O endereço `/versao-b.html` abre a mesma versão. A versão A foi preservada em `/versao-a.html`.

Execute `npm run build` na raiz do projeto. O script usa `base-a.html` e os módulos originais como base, gera arquivos exclusivos com sufixo B, define a B como principal e sincroniza a entrada do GitHub Pages. Confirma por hash que a base A e seus módulos foram preservados.

## Recursos da Versão B (Edição Pro)

1. **Barra de Praias & Favoritos Rápidos:** Seletor rápido de picos de pesca (*Praia do Bessa*, *Intermares*, *João Pessoa*, *Lucena*, *Costa do Conde*, *Baía da Traição*, *Ponta Negra*, *Boa Viagem*) com opção de favoritar qualquer local buscado (`localStorage`).
2. **Próxima Janela com Barra de Progresso & Lembrete:** Mostra o avanço percentual da janela ativa, sincronia solunar ("Hora de Ouro") e botão para ativar lembrete/notificação da janela.
3. **Tabela Solunar & Consultor de Equipamento (Surfcasting Advisor):**
   - Calcula os 2 **Períodos Maiores** (2h — trânsito lunar superior e inferior) e 2 **Períodos Menores** (1h — nascer e pôr da lua), além do índice de atividade solunar.
   - Recomenda automaticamente peso e formato de **chumbada** (ex.: *Pirâmide/Garra 120g–150g* vs *Oliva/Gota 65g–90g*), **chicote/pernadas** e **linha/estratégia** com base nas ondas, período e vento do dia.
4. **Gráfico Interativo de Maré:** Exibe amplitude máxima do dia (classificando Maré Viva, Moderada ou Morta), faixas das janelas de 3h, marcadores de Período Solunar Maior e tendência em tempo real (*Enchendo ↑* / *Vazando ↓*).
5. **Catálogo Interativo de Espécies, Iscas e Montagens:** Na aba *Dicas de pesca*, traz busca instantânea e filtros por zona da praia (*Beira & 1º Valão*, *Canais & Poços*, *2º Valão & Fundo*, *Estuários & Pedras*) e por isca (*Camarão*, *Tatuíra*, *Corrupto*, *Sardinha*, *Artificial*), incluindo anzol recomendado e tamanho mínimo de preservação.
6. **Comunidade, Medalhas & Gerador de Card para Stories/WhatsApp:**
   - Painel de estatísticas da comunidade e 6 medalhas desbloqueáveis (*Estreia na Areia*, *Mestre da Maré*, *Especialista Costeiro*, *Troféu de Praia*, *Explorador do Litoral*, *Lenda do Surfcasting*).
   - Atalhos rápidos de espécies no formulário de registro.
   - Gerador de **Troféu Digital em PNG (1080×1350)** via `<canvas>` para baixar ou compartilhar qualquer captura diretamente no WhatsApp e Instagram Stories.
7. **PWA & Modo Offline na Praia:** Inclui `manifest.webmanifest`, Service Worker (`sw.js`) e cache automático da última previsão no aparelho para consulta mesmo sem sinal na beira da praia.
