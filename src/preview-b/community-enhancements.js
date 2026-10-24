import {
  computeAchievements,
  PRO_PLANS,
  calculateImageDimensions,
  formatCompressionSavings,
  canUseProSocialFeature
} from './model.js';

const $ = id => document.getElementById(id);

const STORAGE_PRO_KEY = 'mare-certa-pro-subscription-v1';
const STORAGE_SOCIAL_KEY = 'mare-certa-social-state-v1';
const STORAGE_PHOTOS_KEY = 'mare-certa-local-s3-photos-v1';

let pendingTrophyPhoto = null;
let selectedPlanId = 'annual';

// Default community social interactions (likes, followers, comments & sample trophy photos) for immediate local testing
const DEFAULT_SOCIAL_STATE = {
  likes: {
    'demo-1': 18,
    'demo-2': 12,
    'demo-3': 24,
    'demo-4': 15,
    'demo-5': 31,
    'demo-6': 9
  },
  likedByMe: {},
  followersCount: {
    'demo-fisher-1': 42,
    'demo-fisher-2': 29,
    'demo-fisher-3': 58,
    'demo-fisher-4': 21,
    'demo-fisher-5': 67,
    'demo-fisher-6': 18
  },
  followingByMe: {},
  comments: {
    'demo-1': [
      {
        id: 'c-101',
        author: 'Carlos Pescador',
        isPro: true,
        time: 'há 2h',
        text: 'Que troféu lindo! Pegou no primeiro ou no segundo valão? Usou corrupto ou camarão?',
        replyTo: null
      },
      {
        id: 'c-102',
        author: 'Henrique Costa',
        isPro: true,
        time: 'há 1h',
        text: '@Carlos Pescador Peguei no 2º valão na subida da maré com chumbada pirâmide 110g e camarão vila franca!',
        replyTo: 'Carlos Pescador'
      }
    ],
    'demo-2': [
      {
        id: 'c-201',
        author: 'Juliana Mar',
        isPro: true,
        time: 'há 3h',
        text: 'Bela série de pampos! O mar estava mexido ou água clara?',
        replyTo: null
      }
    ],
    'demo-3': [
      {
        id: 'c-301',
        author: 'Rafael Ponta da Praia',
        isPro: true,
        time: 'há 4h',
        text: 'Betaras de respeito! Usou chicote de duas pernadas na beira do 1º valão?',
        replyTo: null
      }
    ]
  }
};

function loadSocialState() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_SOCIAL_KEY) || 'null');
    if (raw && typeof raw === 'object') {
      return {
        likes: { ...DEFAULT_SOCIAL_STATE.likes, ...(raw.likes || {}) },
        likedByMe: raw.likedByMe || {},
        followersCount: { ...DEFAULT_SOCIAL_STATE.followersCount, ...(raw.followersCount || {}) },
        followingByMe: raw.followingByMe || {},
        comments: { ...DEFAULT_SOCIAL_STATE.comments, ...(raw.comments || {}) }
      };
    }
  } catch {}
  return structuredClone(DEFAULT_SOCIAL_STATE);
}

function saveSocialState(state) {
  try {
    localStorage.setItem(STORAGE_SOCIAL_KEY, JSON.stringify(state));
  } catch {}
}

export function loadLocalS3Photos() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_PHOTOS_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

export function saveLocalS3Photo(captureId, photoRecord) {
  if (!captureId || !photoRecord) return;
  try {
    const map = loadLocalS3Photos();
    map[captureId] = photoRecord;
    localStorage.setItem(STORAGE_PHOTOS_KEY, JSON.stringify(map));
  } catch {}
}

export function getProSubscription() {
  try {
    const sub = JSON.parse(localStorage.getItem(STORAGE_PRO_KEY) || 'null');
    if (sub && typeof sub === 'object') return sub;
  } catch {}
  return { active: false, planId: null, expiresAt: null, gateway: 'Mercado Pago' };
}

export function isUserPro() {
  return canUseProSocialFeature(getProSubscription());
}

export function setProSubscription(active, planId = 'annual') {
  const plan = PRO_PLANS[planId] || PRO_PLANS.annual;
  const sub = {
    active: Boolean(active),
    planId: plan.id,
    planName: plan.name,
    priceMonthly: plan.priceMonthly,
    billingTotal: plan.billingTotal,
    activatedAt: Date.now(),
    expiresAt: Date.now() + (plan.id === 'annual' ? 365 : 30) * 86400000,
    gateway: 'Mercado Pago (Sandbox Local)'
  };
  try {
    localStorage.setItem(STORAGE_PRO_KEY, JSON.stringify(sub));
  } catch {}
  updateProStatusUI();
  window.dispatchEvent(new CustomEvent('mare-certa:pro-changed', { detail: sub }));
  return sub;
}

export function getPendingTrophyPhoto() {
  return pendingTrophyPhoto;
}

export function clearPendingTrophyPhoto() {
  pendingTrophyPhoto = null;
  const input = $('capturePhotoInput');
  if (input) input.value = '';
  const previewWrap = $('capturePhotoPreviewWrap');
  if (previewWrap) previewWrap.hidden = true;
  const statusEl = $('capturePhotoStatus');
  if (statusEl) {
    statusEl.textContent = '1 foto do troféu por captura · Compressão WebP automática p/ AWS S3';
    statusEl.className = 'photo-compression-status';
  }
}

/**
 * Comprime a foto selecionada diretamente no navegador via HTML5 Canvas
 * antes do envio para o Amazon S3 (WebP, máx 1080px, qualidade 0.80).
 */
export async function compressTrophyPhoto(file, maxDimension = 1080, quality = 0.8) {
  if (!file || !file.type?.startsWith('image/')) {
    throw new Error('Selecione um arquivo de imagem válido (JPEG, PNG ou WebP).');
  }
  const originalBytes = file.size || 1;
  const bitmapUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Não foi possível ler a imagem selecionada.'));
      el.src = bitmapUrl;
    });

    const { width, height } = calculateImageDimensions(img.naturalWidth || img.width, img.naturalHeight || img.height, maxDimension);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);

    let dataUrl = canvas.toDataURL('image/webp', quality);
    if (!dataUrl.startsWith('data:image/webp')) {
      dataUrl = canvas.toDataURL('image/jpeg', quality);
    }
    const base64Length = dataUrl.split(',')[1]?.length || 0;
    const compressedBytes = Math.max(1024, Math.round((base64Length * 3) / 4));
    const summary = formatCompressionSavings(originalBytes, compressedBytes);
    const s3Key = `captures/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;

    return {
      dataUrl,
      width,
      height,
      originalBytes,
      compressedBytes,
      summary,
      s3Key,
      mimeType: 'image/webp'
    };
  } finally {
    URL.revokeObjectURL(bitmapUrl);
  }
}

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

export function renderFisherBadgesInline(captures = {}, fisherUid = null) {
  if (!fisherUid) return '';
  const data = computeAchievements(captures, fisherUid);
  const unlocked = data.badges.filter(b => b.unlocked);
  if (!unlocked.length) return '<span class="fisher-mini-badge" title="Estreante na Comunidade">🎣 Pescador Costeiro</span>';
  return unlocked
    .slice(0, 4)
    .map(b => `<span class="fisher-mini-badge" title="${b.title}: ${b.description}">${b.icon} ${b.title}</span>`)
    .join('');
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

export function openProPaywallModal(reason = 'social') {
  const dialog = $('proPaywallDialog');
  if (!dialog) return;
  const reasonBanner = $('proPaywallReason');
  if (reasonBanner) {
    const messages = {
      foto: '📸 Para anexar a foto do seu troféu (com upload otimizado S3), ative o Clube Pescador PRO.',
      comentar: '💬 Para comentar, perguntar iscas e responder outros pescadores no feed, ative o Clube Pescador PRO.',
      seguir: '➕ Para seguir pescadores, receber alertas de capturas e montar sua rede, ative o Clube Pescador PRO.',
      feed_blur: '🔒 O plano gratuito permite visualizar até 3 publicações no Feed. Desbloqueie todas as fotos e troféus ilimitados com o Clube Pescador PRO.',
      social: '👑 Desbloqueie fotos de troféus, comentários no feed, seguidores e o selo Pescador PRO.'
    };
    reasonBanner.textContent = messages[reason] || messages.social;
  }
  dialog.showModal();
}

function updateProStatusUI() {
  const pro = isUserPro();
  const sub = getProSubscription();

  const statusPill = $('proCurrentStatusPill');
  if (statusPill) {
    statusPill.textContent = pro
      ? `👑 Assinante PRO Ativo (${sub.planId === 'monthly' ? 'R$ 15/mês' : 'Anual · R$ 5/mês'})`
      : '🔒 Conta Gratuita (Modo Leitura no Feed)';
    statusPill.className = `pro-status-pill ${pro ? 'is-pro' : 'is-free'}`;
  }

  const toggleBtn = $('proSandboxToggleBtn');
  if (toggleBtn) {
    toggleBtn.textContent = pro
      ? '🧪 Sandbox Local: Alternar para Conta Grátis'
      : '🧪 Sandbox Local: Simular Assinante PRO Ativo';
  }

  const openModalBtn = $('openProModalBtn');
  if (openModalBtn) {
    openModalBtn.textContent = pro ? '👑 Gerenciar Assinatura PRO' : '⚡ Assinar PRO · R$ 5/mês';
  }

  const photoLockBadge = $('photoProLockBadge');
  if (photoLockBadge) {
    photoLockBadge.textContent = pro ? '👑 PRO Liberado · Upload S3 WebP' : '🔒 Recurso PRO · R$ 5/mês';
    photoLockBadge.className = `photo-pro-badge ${pro ? 'unlocked' : 'locked'}`;
  }
}

function generateTrophyFallbackIllustration(capture) {
  const species = String(capture.species || 'Troféu').slice(0, 22);
  const weight = capture.weight ? `${Number(capture.weight).toLocaleString('pt-BR')} kg` : 'Surfcasting';
  const loc = String(capture.location || 'Costa Brasileira').slice(0, 28);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 480">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0a3344"/>
        <stop offset="55%" stop-color="#06202c"/>
        <stop offset="100%" stop-color="#04131c"/>
      </linearGradient>
    </defs>
    <rect width="800" height="480" fill="url(#g)"/>
    <circle cx="660" cy="95" r="140" fill="#4de1c1" fill-opacity="0.09"/>
    <path d="M0 370 Q200 330 400 370 T800 370 L800 480 L0 480 Z" fill="#4de1c1" fill-opacity="0.14"/>
    <g transform="translate(250, 155)" fill="#4de1c1" fill-opacity="0.28" stroke="#4de1c1" stroke-width="3">
      <path d="M20 65 C85 -5, 200 -5, 265 65 L325 25 L305 65 L325 105 L265 65 C200 135, 85 135, 20 65 Z"/>
      <circle cx="72" cy="54" r="7" fill="#dff76d"/>
    </g>
    <text x="48" y="64" fill="#dff76d" font-family="Manrope, sans-serif" font-weight="800" font-size="18" letter-spacing="3">⚓ TROFÉU REGISTRADO · MARÉ CERTA</text>
    <text x="48" y="378" fill="#ffffff" font-family="Manrope, sans-serif" font-weight="800" font-size="42">${capture.quantity || 1} × ${species}</text>
    <text x="48" y="422" fill="#4de1c1" font-family="DM Sans, sans-serif" font-weight="700" font-size="24">⚖️ ${weight} · 📍 ${loc}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Transforma o card de captura em um Post de Rede Social Completo:
 * - Cabeçalho com avatar, selo PRO, medalhas costeiras (Achievements) e botão Seguir
 * - Foto única do troféu (S3 / WebP comprimida)
 * - Barra de engajamento: Curtir, Responder/Comentar e Compartilhar
 * - Seção de comentários e respostas protegida pelo Paywall Mercado Pago PRO
 */
export function enhanceSocialCaptureCard(card, id, capture, profiles = {}, allCaptures = {}, currentUid = null) {
  card.classList.add('social-post-card');
  const fisherUid = capture.uid || 'community-fisher';
  const fisherName = profiles?.[fisherUid]?.displayName || capture.authorName || 'Pescador Costeiro';
  const initials = fisherName
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || 'P')
    .join('');

  const socialState = loadSocialState();
  const localPhotos = loadLocalS3Photos();
  const photoData = capture.photoUrl || localPhotos[id]?.dataUrl || generateTrophyFallbackIllustration(capture);
  const photoMeta = localPhotos[id]?.summary || (capture.photoUrl ? '☁️ AWS S3 · WebP 1080p' : '📸 Registro Oficial da Comunidade');

  const followers = (socialState.followersCount[fisherUid] ?? 14) + (socialState.followingByMe[fisherUid] ? 1 : 0);
  const isFollowing = Boolean(socialState.followingByMe[fisherUid]);
  const likesCount = (socialState.likes[id] ?? 5) + (socialState.likedByMe[id] ? 1 : 0);
  const isLiked = Boolean(socialState.likedByMe[id]);
  const postComments = socialState.comments[id] || [];
  const badgesHtml = renderFisherBadgesInline(allCaptures, fisherUid);

  // 1. Social Header (Fisher Info + PRO Badge + Achievements + Follow Button)
  const header = document.createElement('header');
  header.className = 'social-post-header';
  header.innerHTML = `
    <div class="social-fisher-ident">
      <div class="social-avatar" aria-hidden="true">${initials}</div>
      <div class="social-fisher-meta">
        <div class="social-name-row">
          <strong class="social-fisher-name">${fisherName}</strong>
          <span class="pro-member-badge" title="Assinante Clube Pescador PRO">👑 PRO</span>
          <span class="social-followers-count"><b data-followers-num>${followers}</b> seguidores</span>
        </div>
        <div class="social-badges-row" aria-label="Conquistas do pescador">${badgesHtml}</div>
      </div>
    </div>
    <button type="button" class="social-follow-btn ${isFollowing ? 'is-following' : ''}" aria-pressed="${isFollowing}">
      ${isFollowing ? '✓ Seguindo' : '➕ Seguir'}
    </button>
  `;

  const followBtn = header.querySelector('.social-follow-btn');
  const followersNumEl = header.querySelector('[data-followers-num]');
  followBtn.addEventListener('click', () => {
    if (!isUserPro()) {
      openProPaywallModal('seguir');
      return;
    }
    const state = loadSocialState();
    state.followingByMe[fisherUid] = !state.followingByMe[fisherUid];
    saveSocialState(state);
    const nowFollowing = Boolean(state.followingByMe[fisherUid]);
    followBtn.classList.toggle('is-following', nowFollowing);
    followBtn.setAttribute('aria-pressed', String(nowFollowing));
    followBtn.textContent = nowFollowing ? '✓ Seguindo' : '➕ Seguir';
    followersNumEl.textContent = String((state.followersCount[fisherUid] ?? 14) + (nowFollowing ? 1 : 0));
  });

  // 2. Trophy Photo Container (1 Photo per Capture, S3 WebP optimized)
  const photoFigure = document.createElement('figure');
  photoFigure.className = 'social-trophy-figure';
  photoFigure.innerHTML = `
    <img src="${photoData}" alt="Troféu: ${capture.quantity}x ${capture.species} em ${capture.location}" loading="lazy" />
    <div class="social-trophy-overlays">
      <span class="s3-storage-pill">${photoMeta}</span>
      ${capture.weight ? `<span class="trophy-weight-pill">⚖️ ${Number(capture.weight).toLocaleString('pt-BR')} kg</span>` : ''}
    </div>
  `;

  // 3. Social Engagement Bar (Like, Comment/Reply, Share)
  const engagementBar = document.createElement('div');
  engagementBar.className = 'social-engagement-bar';
  engagementBar.innerHTML = `
    <button type="button" class="social-action-btn like-btn ${isLiked ? 'is-liked' : ''}" aria-pressed="${isLiked}">
      👏 Boa pesca! <span data-likes-num>${likesCount}</span>
    </button>
    <button type="button" class="social-action-btn comment-toggle-btn">
      💬 Responder / Comentar <span data-comments-num>${postComments.length}</span>
    </button>
  `;

  // Move existing share button inside the engagement bar if present
  const existingShareBtn = card.querySelector('.share-card-btn');
  if (existingShareBtn) {
    existingShareBtn.className = 'social-action-btn share-btn';
    existingShareBtn.textContent = '📤 Card Stories';
    engagementBar.append(existingShareBtn);
    card.querySelector('.capture-share-row')?.remove();
  }

  // 4. Comments & Replies Drawer
  const commentsSection = document.createElement('section');
  commentsSection.className = 'social-comments-section';
  commentsSection.innerHTML = `
    <div class="social-comments-list" role="log" aria-label="Comentários da captura"></div>
    <form class="social-comment-form">
      <input type="text" name="commentText" maxlength="280" placeholder="${isUserPro() ? 'Pergunte a isca, praia ou dê os parabéns…' : '🔒 Assine o Clube PRO (R$ 5/mês) para comentar e responder…'}" autocomplete="off" />
      <button type="submit" class="social-send-btn">${isUserPro() ? 'Responder' : '👑 Liberar Chat'}</button>
    </form>
  `;

  const commentsListEl = commentsSection.querySelector('.social-comments-list');
  const commentForm = commentsSection.querySelector('.social-comment-form');
  const commentInput = commentForm.elements.commentText;
  const commentsNumEl = engagementBar.querySelector('[data-comments-num]');

  function renderPostComments() {
    const state = loadSocialState();
    const list = state.comments[id] || [];
    commentsNumEl.textContent = String(list.length);
    if (!list.length) {
      commentsListEl.innerHTML = `<p class="social-no-comments">Seja o primeiro a comentar ou perguntar sobre esta captura.</p>`;
      return;
    }
    commentsListEl.innerHTML = list.map(c => `
      <article class="social-comment-item">
        <div class="social-comment-top">
          <strong>${c.author}</strong>
          ${c.isPro ? '<span class="pro-mini-tag">👑 PRO</span>' : ''}
          <small>${c.time || 'agora'}</small>
          <button type="button" class="social-reply-link" data-reply-to="${c.author}">↩ Responder</button>
        </div>
        <p>${c.text}</p>
      </article>
    `).join('');

    commentsListEl.querySelectorAll('.social-reply-link').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!isUserPro()) {
          openProPaywallModal('comentar');
          return;
        }
        const targetAuthor = btn.dataset.replyTo;
        commentInput.value = `@${targetAuthor} `;
        commentInput.focus();
      });
    });
  }

  renderPostComments();

  // Like button handler
  const likeBtn = engagementBar.querySelector('.like-btn');
  const likesNumEl = engagementBar.querySelector('[data-likes-num]');
  likeBtn.addEventListener('click', () => {
    const state = loadSocialState();
    state.likedByMe[id] = !state.likedByMe[id];
    saveSocialState(state);
    const likedNow = Boolean(state.likedByMe[id]);
    likeBtn.classList.toggle('is-liked', likedNow);
    likeBtn.setAttribute('aria-pressed', String(likedNow));
    likesNumEl.textContent = String((state.likes[id] ?? 5) + (likedNow ? 1 : 0));
  });

  // Comment toggle button focuses input or opens paywall
  engagementBar.querySelector('.comment-toggle-btn').addEventListener('click', () => {
    if (!isUserPro()) {
      openProPaywallModal('comentar');
      return;
    }
    commentInput.focus();
  });

  commentInput.addEventListener('focus', () => {
    if (!isUserPro()) {
      commentInput.blur();
      openProPaywallModal('comentar');
    }
  });

  commentForm.addEventListener('submit', event => {
    event.preventDefault();
    if (!isUserPro()) {
      openProPaywallModal('comentar');
      return;
    }
    const text = String(commentInput.value || '').trim();
    if (text.length < 2) return;
    const state = loadSocialState();
    if (!Array.isArray(state.comments[id])) state.comments[id] = [];
    const authorName = profiles?.[currentUid]?.displayName || 'Você (Pescador PRO)';
    state.comments[id].push({
      id: `c-${Date.now()}`,
      author: authorName,
      isPro: true,
      time: 'agora mesmo',
      text
    });
    saveSocialState(state);
    commentInput.value = '';
    renderPostComments();
  });

  // Rebuild card structure in social order
  card.prepend(header, photoFigure);
  card.append(engagementBar, commentsSection);
  return card;
}

export function initProSocialFeatures() {
  if (typeof document === 'undefined') return;

  // Photo input & compression inside #captureForm
  const photoInput = $('capturePhotoInput');
  const photoDropBtn = $('capturePhotoTriggerBtn');
  const removePhotoBtn = $('removeCapturePhotoBtn');
  const previewWrap = $('capturePhotoPreviewWrap');
  const previewImg = $('capturePhotoPreviewImg');
  const statusEl = $('capturePhotoStatus');

  if (photoDropBtn && photoInput) {
    photoDropBtn.addEventListener('click', () => {
      if (!isUserPro()) {
        openProPaywallModal('foto');
        return;
      }
      photoInput.click();
    });

    photoInput.addEventListener('change', async () => {
      const file = photoInput.files?.[0];
      if (!file) return;
      if (!isUserPro()) {
        photoInput.value = '';
        openProPaywallModal('foto');
        return;
      }
      if (statusEl) {
        statusEl.textContent = '⏳ Comprimindo foto em WebP (1080p) para o Amazon S3…';
        statusEl.className = 'photo-compression-status is-working';
      }
      try {
        const compressed = await compressTrophyPhoto(file, 1080, 0.8);
        pendingTrophyPhoto = compressed;
        if (previewImg) previewImg.src = compressed.dataUrl;
        if (previewWrap) previewWrap.hidden = false;
        if (statusEl) {
          statusEl.textContent = `✓ ${compressed.summary}`;
          statusEl.className = 'photo-compression-status is-success';
        }
      } catch (err) {
        pendingTrophyPhoto = null;
        if (statusEl) {
          statusEl.textContent = err.message || 'Erro ao comprimir foto.';
          statusEl.className = 'photo-compression-status is-error';
        }
      }
    });
  }

  if (removePhotoBtn) {
    removePhotoBtn.addEventListener('click', () => clearPendingTrophyPhoto());
  }

  // Paywall Modal controls
  const closeProBtn = $('closeProPaywall');
  if (closeProBtn) {
    closeProBtn.addEventListener('click', () => $('proPaywallDialog')?.close());
  }

  const openProModalBtn = $('openProModalBtn');
  if (openProModalBtn) {
    openProModalBtn.addEventListener('click', () => openProPaywallModal('social'));
  }

  const sandboxToggleBtn = $('proSandboxToggleBtn');
  if (sandboxToggleBtn) {
    sandboxToggleBtn.addEventListener('click', () => {
      const nextState = !isUserPro();
      setProSubscription(nextState, selectedPlanId);
    });
  }

  document.querySelectorAll('[data-pro-plan-select]').forEach(cardBtn => {
    cardBtn.addEventListener('click', () => {
      selectedPlanId = cardBtn.dataset.proPlanSelect || 'annual';
      document.querySelectorAll('[data-pro-plan-select]').forEach(el => {
        el.classList.toggle('selected', el.dataset.proPlanSelect === selectedPlanId);
        el.setAttribute('aria-pressed', String(el.dataset.proPlanSelect === selectedPlanId));
      });
      const checkoutBtn = $('mpCheckoutApproveBtn');
      if (checkoutBtn) {
        checkoutBtn.textContent = selectedPlanId === 'annual'
          ? '💳 Pagar com Mercado Pago · R$ 5/mês (R$ 60/ano PIX ou Cartão)'
          : '💳 Pagar com Mercado Pago · R$ 15,00/mês';
      }
    });
  });

  const checkoutBtn = $('mpCheckoutApproveBtn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      setProSubscription(true, selectedPlanId);
      $('proPaywallDialog')?.close();
    });
  }

  window.addEventListener('mare-certa:pro-changed', () => {
    const isPro = isUserPro();
    document.querySelectorAll('.social-comment-form input[name="commentText"]').forEach(input => {
      input.placeholder = isPro
        ? 'Pergunte a isca, praia ou dê os parabéns…'
        : '🔒 Assine o Clube PRO (R$ 5/mês) para comentar e responder…';
    });
    document.querySelectorAll('.social-comment-form .social-send-btn').forEach(btn => {
      btn.textContent = isPro ? 'Responder' : '👑 Liberar Chat';
    });
  });

  updateProStatusUI();
}

function drawTrophyCanvas(canvas, capture, fisherName) {
  const ctx = canvas.getContext('2d');
  const W = 1080, H = 1350;
  canvas.width = W;
  canvas.height = H;

  const bg = ctx.createLinearGradient(0, 0, W * 0.4, H);
  bg.addColorStop(0, '#072231');
  bg.addColorStop(0.5, '#0b3242');
  bg.addColorStop(1, '#04131c');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W * 0.8, H * 0.18, 20, W * 0.8, H * 0.18, 520);
  glow.addColorStop(0, 'rgba(77, 225, 193, 0.22)');
  glow.addColorStop(1, 'rgba(77, 225, 193, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(170, 222, 216, 0.05)';
  ctx.lineWidth = 2;
  for (let x = 60; x < W; x += 60) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 60; y < H; y += 60) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(77, 225, 193, 0.35)';
  ctx.lineWidth = 3;
  ctx.strokeRect(56, 56, W - 112, H - 112);

  ctx.fillStyle = '#4de1c1';
  ctx.font = '700 26px Manrope, sans-serif';
  ctx.letterSpacing = '6px';
  ctx.fillText('⚓ MARÉ CERTA · DIÁRIO DE PESCA', 110, 145);

  ctx.fillStyle = 'rgba(10, 42, 56, 0.82)';
  ctx.strokeStyle = 'rgba(77, 225, 193, 0.28)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(100, 210, W - 200, 760, 36);
  else ctx.rect(100, 210, W - 200, 760);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#dff76d';
  ctx.font = '700 24px Manrope, sans-serif';
  ctx.fillText('REGISTRO DE CAPTURA VERIFICADO NA COMUNIDADE', 150, 290);

  ctx.fillStyle = '#eef9f7';
  ctx.font = '800 84px Manrope, sans-serif';
  const mainTitle = `${capture.quantity} × ${capture.species}`;
  ctx.fillText(mainTitle.slice(0, 22), 150, 415);

  const weightText = capture.weight ? `⚖️ Peso total: ${Number(capture.weight).toLocaleString('pt-BR')} kg` : '🎣 Pesca Costeira · Surfcasting';
  ctx.fillStyle = '#4de1c1';
  ctx.font = '700 38px "DM Sans", sans-serif';
  ctx.fillText(weightText, 150, 495);

  ctx.strokeStyle = 'rgba(170, 222, 216, 0.18)';
  ctx.beginPath();
  ctx.moveTo(150, 555);
  ctx.lineTo(W - 150, 555);
  ctx.stroke();

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
  initProSocialFeatures();
}
