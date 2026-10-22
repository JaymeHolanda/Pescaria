import { computeAchievements } from './model.js';

const $ = id => document.getElementById(id);

export function initQuickSpeciesChips() {
  const bar = $('quickSpeciesBar');
  const form = $('captureForm');
  if (!bar || !form) return;
  bar.querySelectorAll('button[data-species]').forEach(btn => {
    btn.addEventListener('click', () => {
      form.elements.species.value = btn.dataset.species;
      form.elements.quantity.focus();
    });
  });
}

export function renderAchievementsAndStats(captures = {}, currentUid = null) {
  const data = computeAchievements(captures, currentUid);

  if ($('statTotalFish')) $('statTotalFish').textContent = data.community.totalFish.toLocaleString('pt-BR');
  if ($('statTotalRecords')) $('statTotalRecords').textContent = data.community.totalRecords.toLocaleString('pt-BR');
  if ($('statTopSpecies')) $('statTopSpecies').textContent = data.community.topSpecies;
  if ($('statMaxWeight')) {
    $('statMaxWeight').textContent = data.community.maxWeight > 0
      ? `${data.community.maxWeight.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`
      : '—';
  }

  const badgesGrid = $('badgesGrid');
  const badgesSubtitle = $('badgesSubtitle');
  if (badgesSubtitle) {
    const unlockedCount = data.badges.filter(b => b.unlocked).length;
    badgesSubtitle.textContent = currentUid
      ? `Você desbloqueou ${unlockedCount} de ${data.badges.length} medalhas costeiras`
      : 'Entre na sua conta e registre capturas para desbloquear medalhas';
  }
  if (badgesGrid) {
    badgesGrid.innerHTML = data.badges.map(b => `
      <article class="badge-card ${b.unlocked ? 'unlocked' : 'locked'}">
        <div class="badge-icon" aria-hidden="true">${b.icon}</div>
        <div class="badge-copy">
          <div class="badge-top-row">
            <h3>${b.title}</h3>
            <span class="badge-status">${b.unlocked ? 'Desbloqueada ✓' : b.progress}</span>
          </div>
          <p>${b.description}</p>
        </div>
      </article>
    `).join('');
  }
}

function drawTrophyCanvas(canvas, capture, fisherName) {
  const ctx = canvas.getContext('2d');
  const W = 1080, H = 1350;
  canvas.width = W;
  canvas.height = H;

  // Deep nautical background gradient
  const bg = ctx.createLinearGradient(0, 0, W * 0.4, H);
  bg.addColorStop(0, '#072231');
  bg.addColorStop(0.5, '#0b3242');
  bg.addColorStop(1, '#04131c');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle glow orb
  const glow = ctx.createRadialGradient(W * 0.8, H * 0.18, 20, W * 0.8, H * 0.18, 520);
  glow.addColorStop(0, 'rgba(77, 225, 193, 0.22)');
  glow.addColorStop(1, 'rgba(77, 225, 193, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Subtle grid lines
  ctx.strokeStyle = 'rgba(170, 222, 216, 0.05)';
  ctx.lineWidth = 2;
  for (let x = 60; x < W; x += 60) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 60; y < H; y += 60) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // Outer card frame
  ctx.strokeStyle = 'rgba(77, 225, 193, 0.35)';
  ctx.lineWidth = 3;
  ctx.strokeRect(56, 56, W - 112, H - 112);

  // Brand header
  ctx.fillStyle = '#4de1c1';
  ctx.font = '700 26px Manrope, sans-serif';
  ctx.letterSpacing = '6px';
  ctx.fillText('⚓ MARÉ CERTA · DIÁRIO DE PESCA', 110, 145);

  // Main trophy box
  ctx.fillStyle = 'rgba(10, 42, 56, 0.82)';
  ctx.strokeStyle = 'rgba(77, 225, 193, 0.28)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(100, 210, W - 200, 760, 36);
  else ctx.rect(100, 210, W - 200, 760);
  ctx.fill();
  ctx.stroke();

  // Eyebrow inside box
  ctx.fillStyle = '#dff76d';
  ctx.font = '700 24px Manrope, sans-serif';
  ctx.fillText('REGISTRO DE CAPTURA VERIFICADO NA COMUNIDADE', 150, 290);

  // Species & Quantity Hero
  ctx.fillStyle = '#eef9f7';
  ctx.font = '800 84px Manrope, sans-serif';
  const mainTitle = `${capture.quantity} × ${capture.species}`;
  ctx.fillText(mainTitle.slice(0, 22), 150, 415);

  // Weight Pill if available
  const weightText = capture.weight ? `⚖️ Peso total: ${Number(capture.weight).toLocaleString('pt-BR')} kg` : '🎣 Pesca Costeira · Surfcasting';
  ctx.fillStyle = '#4de1c1';
  ctx.font = '700 38px "DM Sans", sans-serif';
  ctx.fillText(weightText, 150, 495);

  // Divider line
  ctx.strokeStyle = 'rgba(170, 222, 216, 0.18)';
  ctx.beginPath();
  ctx.moveTo(150, 555);
  ctx.lineTo(W - 150, 555);
  ctx.stroke();

  // Metadata fields
  const drawField = (label, val, y) => {
    ctx.fillStyle = '#8fb4bc';
    ctx.font = '600 24px "DM Sans", sans-serif';
    ctx.fillText(label, 150, y);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 42px Manrope, sans-serif';
    ctx.fillText(String(val || '—').slice(0, 32), 150, y + 52);
  };

  const formattedDate = String(capture.date || '').split('-').reverse().join('/');
  drawField('PESCADOR(A)', fisherName || 'Pescador da Comunidade', 625);
  drawField('LOCAL / PRAIA', capture.location || 'Litoral Brasileiro', 750);
  drawField('DATA DA PESCARIA', formattedDate, 875);

  // Decorative ocean waves at bottom
  ctx.save();
  ctx.strokeStyle = '#4de1c1';
  ctx.lineWidth = 5;
  ctx.beginPath();
  for (let x = 100; x <= W - 100; x += 10) {
    const y = 1095 + Math.sin((x / 140) * Math.PI * 2) * 18;
    if (x === 100) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.strokeStyle = 'rgba(223, 247, 109, 0.45)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = 100; x <= W - 100; x += 10) {
    const y = 1130 + Math.cos((x / 160) * Math.PI * 2) * 14;
    if (x === 100) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();

  // Footer
  ctx.fillStyle = '#9db9c2';
  ctx.font = '500 28px "DM Sans", sans-serif';
  ctx.fillText('Tábua de maré, janelas e ranking · Maré Certa', 110, 1235);
}

export function openShareCardModal(capture, fisherName) {
  const dialog = $('shareCardDialog');
  const canvas = $('trophyCanvas');
  if (!dialog || !canvas) return;
  drawTrophyCanvas(canvas, capture, fisherName);
  dialog.showModal();

  const downloadBtn = $('downloadTrophyBtn');
  if (downloadBtn) {
    downloadBtn.onclick = () => {
      const link = document.createElement('a');
      const slug = String(capture.species || 'pescaria').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      link.download = `mare-certa-${slug}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
  }

  const shareBtn = $('nativeShareTrophyBtn');
  if (shareBtn) {
    shareBtn.onclick = async () => {
      const formattedDate = String(capture.date || '').split('-').reverse().join('/');
      const text = `🎣 Capturei ${capture.quantity} × ${capture.species}${capture.weight ? ` (${Number(capture.weight).toLocaleString('pt-BR')} kg)` : ''} em ${capture.location} (${formattedDate})! Veja a tábua de maré e o ranking no Maré Certa.`;
      if (navigator.share && canvas.toBlob) {
        canvas.toBlob(async blob => {
          try {
            const file = new File([blob], 'mare-certa-captura.png', { type: 'image/png' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({ title: 'Captura · Maré Certa', text, files: [file] });
              return;
            }
            await navigator.share({ title: 'Captura · Maré Certa', text, url: location.href });
          } catch {}
        }, 'image/png');
      } else {
        const waUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + location.href)}`;
        window.open(waUrl, '_blank', 'noopener,noreferrer');
      }
    };
  }
}

if (typeof document !== 'undefined') {
  const closeBtn = $('closeShareCard');
  if (closeBtn) closeBtn.addEventListener('click', () => $('shareCardDialog')?.close());
  initQuickSpeciesChips();
}
