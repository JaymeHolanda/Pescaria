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
const STORAGE_CAPTURE_CAPTIONS_KEY = 'mare-certa-capture-captions-v1';
const STORAGE_FISHER_PROFILES_KEY = 'mare-certa-fisher-profiles-v1';

let pendingTrophyPhoto = null;
let selectedPlanId = 'annual';

// Default capture comments/stories for demo posts
const DEFAULT_CAPTURE_CAPTIONS = {
  'demo-1': 'Peguei na entrada da maré enchente no 2º valão usando camarão vivo e chumbada pirâmide 110g! Briga linda na areia.',
  'demo-2': 'Cardume encostou na beira do 1º valão com água clara. Três pampos seguidos na tatuíra fresca!',
  'demo-3': 'Fim de tarde produtivo na vazante. Chicote de duas pernadas com corrupto não falhou.',
  'demo-4': 'Noite de lua cheia com mar mexido. Batida firme na sardinha filetada no canal fundo.',
  'demo-5': 'Troféu da temporada! Tomou muita linha no primeiro arranque perto do costão.',
  'demo-6': 'Maré repontando perto das pedras, isca de camarão vila franca no anzol Maruseigo 14.'
};

// Default extended profiles for demo fishermen
const DEFAULT_FISHER_PROFILES = {
  'demo-fisher-1': {
    displayName: 'Henrique Costa',
    location: 'João Pessoa, PB · Praia do Bessa',
    bio: 'Robalo-flecha de 4,2 kg no 2º valão · Apaixonado por surfcasting noturno.',
    instagram: '@henriquecosta_pesca',
    social2: 'youtube.com/@henriquepesca',
    phone: '(83) 99812-4400',
    avatarUrl: '',
    extraTrophyPhotos: []
  },
  'demo-fisher-2': {
    displayName: 'Marcos Surfcasting',
    location: 'Cabedelo, PB · Intermares',
    bio: 'Especialista em pampos e arremessos de longa distância na praia.',
    instagram: '@marcos_surfcasting',
    social2: '',
    phone: '(83) 99630-1122',
    avatarUrl: '',
    extraTrophyPhotos: []
  },
  'demo-fisher-3': {
    displayName: 'Juliana Mar',
    location: 'Ilha Comprida, SP · Praia Grande',
    bio: 'Campeã regional de pesca de praia · Pesca consciente e leitura de valões.',
    instagram: '@julianamar.pesca',
    social2: '@julianamar_surf',
    phone: '',
    avatarUrl: '',
    extraTrophyPhotos: []
  },
  'demo-fisher-4': {
    displayName: 'Rafael Ponta da Praia',
    location: 'Vitória, ES · Praia de Camburi',
    bio: 'Corvinas e robalos na maré de sizígia.',
    instagram: '@rafael_pontadapraia',
    social2: '',
    phone: '',
    avatarUrl: '',
    extraTrophyPhotos: []
  },
  'demo-fisher-5': {
    displayName: 'Tiago Linha Fina',
    location: 'Salvador, BA · Farol de Itapuã',
    bio: 'Recorde pessoal: Xaréu de 6,1 kg na linha 0.25mm.',
    instagram: '@tiagolinhafina',
    social2: '',
    phone: '(71) 99140-8899',
    avatarUrl: '',
    extraTrophyPhotos: []
  },
  'demo-fisher-6': {
    displayName: 'Carlos Pesca Costeira',
    location: 'Marechal Deodoro, AL · Praia do Francês',
    bio: 'Pescador costeiro de sargos, pampos e betaras.',
    instagram: '@carlospescacosteira',
    social2: '',
    phone: '',
    avatarUrl: '',
    extraTrophyPhotos: []
  }
};

// Default community social interactions (likes, followers, comments)
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

export function loadSocialState() {
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

export function saveSocialState(state) {
  try {
    localStorage.setItem(STORAGE_SOCIAL_KEY, JSON.stringify(state));
  } catch {}
}

export function getFisherFollowersCount(fisherUid, socialState = null) {
  if (!fisherUid) return 0;
  const state = socialState || loadSocialState();
  const base = Number(state.followersCount?.[fisherUid] ?? 0);
  const plusMe = state.followingByMe?.[fisherUid] ? 1 : 0;
  return Math.max(0, base + plusMe);
}

export function getFollowingCount(socialState = null) {
  const state = socialState || loadSocialState();
  return Object.values(state.followingByMe || {}).filter(Boolean).length;
}

export function toggleFollowFisher(fisherUid) {
  if (!fisherUid) return { following: false, followers: 0 };
  const state = loadSocialState();
  state.followingByMe[fisherUid] = !state.followingByMe[fisherUid];
  saveSocialState(state);
  const following = Boolean(state.followingByMe[fisherUid]);
  const followers = getFisherFollowersCount(fisherUid, state);

  if (typeof document !== 'undefined') {
    document.querySelectorAll(`[data-fisher-follow-btn="${fisherUid}"]`).forEach(btn => {
      btn.classList.toggle('is-following', following);
      btn.setAttribute('aria-pressed', String(following));
      btn.textContent = following ? '✓ Seguindo' : '➕ Seguir';
    });
    document.querySelectorAll(`[data-fisher-followers-num="${fisherUid}"]`).forEach(el => {
      el.textContent = String(followers);
    });
    const myFollowingEl = $('myProfileFollowingCount');
    if (myFollowingEl) myFollowingEl.textContent = String(getFollowingCount(state));
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mare-certa:follow-changed', { detail: { fisherUid, following, followers } }));
  }
  return { following, followers };
}

export function deletePostComment(captureId, commentId) {
  if (!captureId || !commentId) return [];
  const state = loadSocialState();
  const list = Array.isArray(state.comments[captureId]) ? state.comments[captureId] : [];
  state.comments[captureId] = list.filter(c => c.id !== commentId);
  saveSocialState(state);
  return state.comments[captureId];
}

export function loadCaptureCaptions() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_CAPTURE_CAPTIONS_KEY) || '{}') || {};
    return { ...DEFAULT_CAPTURE_CAPTIONS, ...raw };
  } catch {
    return { ...DEFAULT_CAPTURE_CAPTIONS };
  }
}

export function getCaptureCaption(captureId, capture = null) {
  if (capture?.caption) return String(capture.caption).trim();
  if (!captureId) return '';
  const map = loadCaptureCaptions();
  return String(map[captureId] || '').trim();
}

export function saveCaptureCaption(captureId, text) {
  if (!captureId) return;
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_CAPTURE_CAPTIONS_KEY) || '{}') || {};
    const cleaned = String(text || '').trim().slice(0, 300);
    if (cleaned) raw[captureId] = cleaned;
    else delete raw[captureId];
    localStorage.setItem(STORAGE_CAPTURE_CAPTIONS_KEY, JSON.stringify(raw));
  } catch {}
}

export function loadFisherExtendedProfiles() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_FISHER_PROFILES_KEY) || '{}') || {};
    const merged = { ...DEFAULT_FISHER_PROFILES };
    for (const [uid, data] of Object.entries(raw)) {
      merged[uid] = { ...(merged[uid] || {}), ...data };
    }
    return merged;
  } catch {
    return { ...DEFAULT_FISHER_PROFILES };
  }
}

export function getFisherExtendedProfile(uid, baseProfile = {}) {
  const all = loadFisherExtendedProfiles();
  const ext = (uid && all[uid]) || {};
  let defaultLoc = '';
  try {
    const savedLoc = JSON.parse(localStorage.getItem('mare-certa-location') || 'null');
    if (savedLoc?.name) defaultLoc = savedLoc.admin1 ? `${savedLoc.name} · ${savedLoc.admin1}` : savedLoc.name;
  } catch {}

  return {
    uid: uid || 'local-fisher',
    displayName: ext.displayName || baseProfile?.displayName || 'Pescador Costeiro',
    location: ext.location ?? defaultLoc ?? '',
    bio: ext.bio || '',
    instagram: ext.instagram || '',
    social2: ext.social2 || '',
    phone: ext.phone || '',
    avatarUrl: ext.avatarUrl || '',
    extraTrophyPhotos: Array.isArray(ext.extraTrophyPhotos) ? ext.extraTrophyPhotos : []
  };
}

export function saveFisherExtendedProfile(uid, updates = {}) {
  if (!uid) return null;
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_FISHER_PROFILES_KEY) || '{}') || {};
    const existing = raw[uid] || DEFAULT_FISHER_PROFILES[uid] || {};
    raw[uid] = {
      ...existing,
      ...updates,
      updatedAt: Date.now()
    };
    localStorage.setItem(STORAGE_FISHER_PROFILES_KEY, JSON.stringify(raw));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mare-certa:profile-updated', { detail: { uid, profile: raw[uid] } }));
    }
    return raw[uid];
  } catch {
    return null;
  }
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
    statusEl.textContent = 'Compartilhe a foto da sua pescaria com a comunidade';
    statusEl.className = 'photo-compression-status';
  }
}

/**
 * Comprime a foto selecionada diretamente no navegador via HTML5 Canvas.
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
      foto: '📸 Para publicar a foto do seu troféu e participar da nossa família de pescadores, ative o Clube PRO.',
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
    photoLockBadge.textContent = pro ? '👑 Foto Liberada · Membro PRO' : '🔒 Recurso da Família PRO';
    photoLockBadge.className = `photo-pro-badge ${pro ? 'unlocked' : 'locked'}`;
  }
}

export function generateTrophyFallbackIllustration(capture) {
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

function getInitials(name = 'Pescador') {
  return String(name || 'Pescador')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || 'P')
    .join('');
}

function escapeHtml(str = '') {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function collectFisherGalleryPhotos(fisherUid, allCaptures = {}, extProfile = {}) {
  const localPhotos = loadLocalS3Photos();
  const items = [];

  // 1. Extra trophy photos uploaded directly to the user's profile
  if (Array.isArray(extProfile.extraTrophyPhotos)) {
    for (const p of extProfile.extraTrophyPhotos) {
      if (p?.dataUrl) {
        items.push({
          id: p.id || `extra-${ items.length }`,
          src: p.dataUrl,
          title: p.title || 'Troféu de Pesca',
          subtitle: p.date || 'Galeria do Pescador',
          isExtra: true
        });
      }
    }
  }

  // 2. Photos from captures posted by this fisherman
  const entries = Object.entries(allCaptures || {})
    .filter(([, c]) => c && c.uid === fisherUid)
    .sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0));

  for (const [cid, c] of entries) {
    const src = c.photoUrl || localPhotos[cid]?.dataUrl || generateTrophyFallbackIllustration(c);
    const dateStr = String(c.date || '').split('-').reverse().join('/');
    items.push({
      id: cid,
      src,
      title: `${c.quantity || 1}× ${c.species}`,
      subtitle: `${c.weight ? `${Number(c.weight).toLocaleString('pt-BR')} kg · ` : ''}${c.location || ''}${dateStr ? ` (${dateStr})` : ''}`,
      isExtra: false
    });
  }

  return items;
}

/**
 * Abre o modal de Perfil Público de qualquer pescador da comunidade
 */
export function openFisherProfileModal(fisherUid, profiles = {}, allCaptures = {}, currentUid = null) {
  const dialog = $('fisherProfileDialog');
  const body = $('fisherProfileBody');
  if (!dialog || !body || !fisherUid) return;

  const baseProfile = profiles?.[fisherUid] || {};
  const ext = getFisherExtendedProfile(fisherUid, baseProfile);
  const socialState = loadSocialState();
  const followers = getFisherFollowersCount(fisherUid, socialState);
  const isFollowing = Boolean(socialState.followingByMe?.[fisherUid]);
  const achievements = computeAchievements(allCaptures, fisherUid);
  const unlockedMedals = achievements.badges.filter(b => b.unlocked);
  const galleryItems = collectFisherGalleryPhotos(fisherUid, allCaptures, ext);
  const initials = getInitials(ext.displayName);
  const isMe = Boolean(currentUid && fisherUid === currentUid);

  const instaClean = String(ext.instagram || '').replace(/^@/, '').trim();
  const phoneDigits = String(ext.phone || '').replace(/\D+/g, '');

  body.innerHTML = `
    <div class="fisher-profile-top">
      <div class="fisher-profile-avatar-wrap">
        ${ext.avatarUrl
          ? `<img class="fisher-profile-avatar-img" src="${ext.avatarUrl}" alt="Foto de ${escapeHtml(ext.displayName)}" />`
          : `<div class="fisher-profile-avatar-fallback" aria-hidden="true">${escapeHtml(initials)}</div>`
        }
      </div>
      <div class="fisher-profile-ident">
        <div class="fisher-profile-name-row">
          <h2 id="fisherProfileTitle">${escapeHtml(ext.displayName)}</h2>
          <span class="pro-member-badge">👑 PRO</span>
        </div>
        <p class="fisher-profile-loc">${ext.location ? `📍 ${escapeHtml(ext.location)}` : '📍 Litoral Brasileiro'}</p>
        ${ext.bio ? `<p class="fisher-profile-bio">“${escapeHtml(ext.bio)}”</p>` : ''}
        <div class="fisher-profile-socials">
          ${instaClean ? `<a href="https://instagram.com/${encodeURIComponent(instaClean)}" target="_blank" rel="noreferrer" class="profile-social-pill">📸 @${escapeHtml(instaClean)}</a>` : ''}
          ${ext.social2 ? `<span class="profile-social-pill">🌐 ${escapeHtml(ext.social2)}</span>` : ''}
          ${ext.phone ? `<a href="${phoneDigits.length >= 10 ? `https://wa.me/55${phoneDigits}` : '#'}" target="_blank" rel="noreferrer" class="profile-social-pill">📱 ${escapeHtml(ext.phone)}</a>` : ''}
        </div>
      </div>
      <div class="fisher-profile-cta">
        ${isMe
          ? `<button type="button" class="primary-button edit-own-profile-btn">✏️ Editar Meu Perfil</button>`
          : `<button type="button" class="social-follow-btn ${isFollowing ? 'is-following' : ''}" data-fisher-follow-btn="${escapeHtml(fisherUid)}" aria-pressed="${isFollowing}">
               ${isFollowing ? '✓ Seguindo' : '➕ Seguir'}
             </button>`
        }
      </div>
    </div>

    <div class="fisher-profile-stats-bar">
      <div class="profile-stat-box">
        <strong data-fisher-followers-num="${escapeHtml(fisherUid)}">${followers}</strong>
        <span>Seguidores</span>
      </div>
      <div class="profile-stat-box">
        <strong>${unlockedMedals.length} / ${achievements.badges.length}</strong>
        <span>Medalhas Costeiras</span>
      </div>
      <div class="profile-stat-box">
        <strong>${achievements.personal.totalFish}</strong>
        <span>Peixes no Ranking</span>
      </div>
      <div class="profile-stat-box">
        <strong>${achievements.personal.maxWeight > 0 ? `${achievements.personal.maxWeight.toLocaleString('pt-BR')} kg` : '—'}</strong>
        <span>Maior Troféu</span>
      </div>
    </div>

    <section class="profile-section-block">
      <div class="profile-section-head">
        <h3>🏆 Maiores Conquistas &amp; Medalhas Costeiras (${unlockedMedals.length}/${achievements.badges.length})</h3>
      </div>
      <div class="profile-records-row">
        <div class="profile-record-chip"><span>⚖️ Recorde de Peso:</span> <strong>${achievements.personal.maxWeight > 0 ? `${achievements.personal.maxWeight.toLocaleString('pt-BR')} kg (${escapeHtml(achievements.personal.topTrophySpecies)})` : 'Ainda não informado'}</strong></div>
        <div class="profile-record-chip"><span>🐟 Espécie Principal:</span> <strong>${escapeHtml(achievements.personal.topSpecies)}</strong></div>
        <div class="profile-record-chip"><span>📒 Pescarias Registradas:</span> <strong>${achievements.personal.totalTrips} relato(s)</strong></div>
      </div>
      <div class="profile-medals-strip">
        ${achievements.badges.map(b => `
          <div class="profile-medal-pill ${b.unlocked ? 'unlocked' : 'locked'}" title="${escapeHtml(b.description)}">
            <span class="medal-icon">${b.icon}</span>
            <div>
              <strong>${escapeHtml(b.title)}</strong>
              <small>${b.unlocked ? 'Conquistada ✓' : escapeHtml(b.progress)}</small>
            </div>
          </div>
        `).join('')}
      </div>
    </section>

    <section class="profile-section-block">
      <div class="profile-section-head">
        <h3>📸 Galeria de Fotos Postadas &amp; Troféus (${galleryItems.length})</h3>
      </div>
      ${galleryItems.length
        ? `<div class="profile-gallery-grid">
             ${galleryItems.map(item => `
               <figure class="profile-gallery-item">
                 <img src="${item.src}" alt="${escapeHtml(item.title)}" loading="lazy" />
                 <figcaption>
                   <strong>${escapeHtml(item.title)}</strong>
                   <small>${escapeHtml(item.subtitle)}</small>
                 </figcaption>
               </figure>
             `).join('')}
           </div>`
        : `<p class="empty-note">Nenhuma foto de troféu publicada ainda por este pescador.</p>`
      }
    </section>
  `;

  const followBtn = body.querySelector('[data-fisher-follow-btn]');
  if (followBtn) {
    followBtn.addEventListener('click', () => toggleFollowFisher(fisherUid));
  }

  const editOwnBtn = body.querySelector('.edit-own-profile-btn');
  if (editOwnBtn) {
    editOwnBtn.addEventListener('click', () => {
      dialog.close();
      $('accountDialog')?.showModal();
    });
  }

  if (!dialog.open) dialog.showModal();
}

/**
 * Renderiza os dados completos dentro de #accountProfile (modal Minha Conta)
 */
export function renderMyAccountProfile(user, profiles = {}, allCaptures = {}) {
  const container = $('myRichProfileContainer');
  if (!container || !user) return;

  const uid = user.uid;
  const baseProfile = profiles?.[uid] || { displayName: user.displayName || 'Pescador' };
  const ext = getFisherExtendedProfile(uid, baseProfile);
  const socialState = loadSocialState();
  const followers = getFisherFollowersCount(uid, socialState);
  const following = getFollowingCount(socialState);
  const achievements = computeAchievements(allCaptures, uid);
  const unlockedMedals = achievements.badges.filter(b => b.unlocked);
  const galleryItems = collectFisherGalleryPhotos(uid, allCaptures, ext);
  const initials = getInitials(ext.displayName || user.displayName);

  const avatarPreview = $('myProfileAvatarPreview');
  if (avatarPreview) {
    avatarPreview.innerHTML = ext.avatarUrl
      ? `<img src="${ext.avatarUrl}" alt="Sua foto de perfil" class="my-profile-avatar-img" />`
      : `<span class="my-profile-avatar-initials">${escapeHtml(initials)}</span>`;
  }

  const locBadge = $('myProfileLocationBadge');
  if (locBadge) {
    locBadge.textContent = ext.location ? `📍 ${ext.location}` : '📍 Adicione sua cidade ou praia favorita abaixo';
  }

  const bioLine = $('myProfileBioLine');
  if (bioLine) {
    bioLine.textContent = ext.bio ? `🏆 “${ext.bio}”` : '🏆 Registre suas capturas e destaque suas maiores conquistas no perfil.';
  }

  const linksBar = $('myProfileSocialLinksBar');
  if (linksBar) {
    const chips = [];
    if (ext.instagram) {
      const handle = ext.instagram.replace(/^@/, '');
      chips.push(`<a href="https://instagram.com/${encodeURIComponent(handle)}" target="_blank" rel="noreferrer" class="profile-social-pill">📸 @${escapeHtml(handle)}</a>`);
    }
    if (ext.social2) {
      chips.push(`<span class="profile-social-pill">🌐 ${escapeHtml(ext.social2)}</span>`);
    }
    if (ext.phone) {
      chips.push(`<span class="profile-social-pill">📱 ${escapeHtml(ext.phone)}</span>`);
    }
    linksBar.innerHTML = chips.join('');
    linksBar.hidden = chips.length === 0;
  }

  if ($('myProfileFollowersCount')) {
    $('myProfileFollowersCount').textContent = String(followers);
    $('myProfileFollowersCount').setAttribute('data-fisher-followers-num', uid);
  }
  if ($('myProfileFollowingCount')) $('myProfileFollowingCount').textContent = String(following);
  if ($('myProfileMedalsCount')) $('myProfileMedalsCount').textContent = `${unlockedMedals.length} / ${achievements.badges.length}`;
  if ($('myProfileBestWeight')) {
    $('myProfileBestWeight').textContent = achievements.personal.maxWeight > 0
      ? `${achievements.personal.maxWeight.toLocaleString('pt-BR')} kg`
      : '—';
  }

  const recordsEl = $('myProfileAchievementsSummary');
  if (recordsEl) {
    recordsEl.innerHTML = `
      <div class="profile-record-chip"><span>⚖️ Maior Troféu:</span> <strong>${achievements.personal.maxWeight > 0 ? `${achievements.personal.maxWeight.toLocaleString('pt-BR')} kg (${escapeHtml(achievements.personal.topTrophySpecies)})` : 'Registre uma captura com peso'}</strong></div>
      <div class="profile-record-chip"><span>🐟 Total de Peixes:</span> <strong>${achievements.personal.totalFish} peixe(s)</strong></div>
      <div class="profile-record-chip"><span>📒 Relatos no Diário:</span> <strong>${achievements.personal.totalTrips} pescaria(s)</strong></div>
      <div class="profile-record-chip"><span>🎯 Espécie Favorita:</span> <strong>${escapeHtml(achievements.personal.topSpecies)}</strong></div>
    `;
  }

  const medalsEl = $('myProfileMedalsList');
  if (medalsEl) {
    medalsEl.innerHTML = achievements.badges.map(b => `
      <div class="profile-medal-pill ${b.unlocked ? 'unlocked' : 'locked'}" title="${escapeHtml(b.description)}">
        <span class="medal-icon">${b.icon}</span>
        <div>
          <strong>${escapeHtml(b.title)}</strong>
          <small>${b.unlocked ? 'Conquistada ✓' : escapeHtml(b.progress)}</small>
        </div>
      </div>
    `).join('');
  }

  const galleryGrid = $('myProfileGalleryGrid');
  const galleryCount = $('myProfileGalleryCount');
  if (galleryCount) galleryCount.textContent = `${galleryItems.length} foto(s)`;
  if (galleryGrid) {
    if (!galleryItems.length) {
      galleryGrid.innerHTML = `<p class="empty-note">Suas fotos de capturas e troféus aparecerão aqui. Adicione uma foto de troféu no botão acima ou ao registrar uma captura!</p>`;
    } else {
      galleryGrid.innerHTML = galleryItems.map(item => `
        <figure class="profile-gallery-item">
          <img src="${item.src}" alt="${escapeHtml(item.title)}" loading="lazy" />
          <figcaption>
            <strong>${escapeHtml(item.title)}</strong>
            <small>${escapeHtml(item.subtitle)}</small>
            ${item.isExtra ? `<button type="button" class="gallery-delete-photo-btn" data-remove-extra-photo="${escapeHtml(item.id)}" title="Remover foto da galeria">🗑️ Remover</button>` : ''}
          </figcaption>
        </figure>
      `).join('');

      galleryGrid.querySelectorAll('[data-remove-extra-photo]').forEach(btn => {
        btn.addEventListener('click', () => {
          const pid = btn.dataset.removeExtraPhoto;
          const currentExt = getFisherExtendedProfile(uid, baseProfile);
          const updatedPhotos = (currentExt.extraTrophyPhotos || []).filter(p => p.id !== pid);
          saveFisherExtendedProfile(uid, { extraTrophyPhotos: updatedPhotos });
          renderMyAccountProfile(user, profiles, allCaptures);
        });
      });
    }
  }

  // Populate extended edit form inputs if user is not currently typing in them
  const extForm = $('extendedProfileForm');
  if (extForm && !extForm.contains(document.activeElement)) {
    if (extForm.elements.extDisplayName) extForm.elements.extDisplayName.value = ext.displayName || user.displayName || '';
    if (extForm.elements.extLocation) extForm.elements.extLocation.value = ext.location || '';
    if (extForm.elements.extBio) extForm.elements.extBio.value = ext.bio || '';
    if (extForm.elements.extInstagram) extForm.elements.extInstagram.value = ext.instagram || '';
    if (extForm.elements.extSocial2) extForm.elements.extSocial2.value = ext.social2 || '';
    if (extForm.elements.extPhone) extForm.elements.extPhone.value = ext.phone || '';
  }
}

/**
 * Transforma o card de captura em um Post de Rede Social Completo:
 * - Cabeçalho com avatar clicável, selo PRO, medalhas costeiras e botão Seguir com contagem real
 * - Relato/comentário do pescador sobre a captura
 * - Foto única do troféu
 * - Barra de engajamento: Curtir, Responder/Comentar e Compartilhar Card com foto
 * - Seção de comentários com opção de Apagar comentário
 */
export function enhanceSocialCaptureCard(card, id, capture, profiles = {}, allCaptures = {}, currentUid = null) {
  card.classList.add('social-post-card');
  const fisherUid = capture.uid || 'community-fisher';
  card.setAttribute('data-fisher-uid', fisherUid);

  const extProfile = getFisherExtendedProfile(fisherUid, profiles?.[fisherUid]);
  const fisherName = extProfile.displayName || profiles?.[fisherUid]?.displayName || capture.authorName || 'Pescador Costeiro';
  const initials = getInitials(fisherName);

  const socialState = loadSocialState();
  const localPhotos = loadLocalS3Photos();
  const photoData = capture.photoUrl || localPhotos[id]?.dataUrl || generateTrophyFallbackIllustration(capture);
  const photoMeta = capture.photoUrl || localPhotos[id] ? '📸 Troféu da Comunidade' : '🎣 Registro Oficial';

  const followers = getFisherFollowersCount(fisherUid, socialState);
  const isFollowing = Boolean(socialState.followingByMe[fisherUid]);
  const likesCount = (socialState.likes[id] ?? 5) + (socialState.likedByMe[id] ? 1 : 0);
  const isLiked = Boolean(socialState.likedByMe[id]);
  const postComments = socialState.comments[id] || [];
  const badgesHtml = renderFisherBadgesInline(allCaptures, fisherUid);
  const captionText = getCaptureCaption(id, capture);

  // 1. Social Header (Fisher Info + Avatar + Location + Achievements + Follow Button)
  const header = document.createElement('header');
  header.className = 'social-post-header';
  header.innerHTML = `
    <div class="social-fisher-ident">
      <button type="button" class="social-avatar-btn" title="Ver perfil completo de ${escapeHtml(fisherName)}">
        ${extProfile.avatarUrl
          ? `<img class="social-avatar-img" src="${extProfile.avatarUrl}" alt="${escapeHtml(fisherName)}" />`
          : `<div class="social-avatar" aria-hidden="true">${escapeHtml(initials)}</div>`
        }
      </button>
      <div class="social-fisher-meta">
        <div class="social-name-row">
          <button type="button" class="social-fisher-name-btn" title="Abrir perfil de ${escapeHtml(fisherName)}">
            <strong class="social-fisher-name">${escapeHtml(fisherName)}</strong>
          </button>
          <span class="pro-member-badge" title="Assinante Clube Pescador PRO">👑 PRO</span>
          <span class="social-followers-count"><b data-fisher-followers-num="${escapeHtml(fisherUid)}">${followers}</b> seguidor${followers === 1 ? '' : 'es'}</span>
        </div>
        ${extProfile.location ? `<small class="social-fisher-loc">📍 ${escapeHtml(extProfile.location)}</small>` : ''}
        <div class="social-badges-row" aria-label="Conquistas do pescador">${badgesHtml}</div>
      </div>
    </div>
    <button type="button" class="social-follow-btn ${isFollowing ? 'is-following' : ''}" data-fisher-follow-btn="${escapeHtml(fisherUid)}" aria-pressed="${isFollowing}">
      ${isFollowing ? '✓ Seguindo' : '➕ Seguir'}
    </button>
  `;

  // Clicking avatar or fisherman name opens their complete fisherman profile modal
  header.querySelector('.social-avatar-btn')?.addEventListener('click', () => {
    openFisherProfileModal(fisherUid, profiles, allCaptures, currentUid);
  });
  header.querySelector('.social-fisher-name-btn')?.addEventListener('click', () => {
    openFisherProfileModal(fisherUid, profiles, allCaptures, currentUid);
  });

  // Hide old redundant <p> author text if present
  const oldAuthorP = card.querySelector('p');
  if (oldAuthorP) oldAuthorP.hidden = true;

  const followBtn = header.querySelector('.social-follow-btn');
  followBtn.addEventListener('click', () => {
    toggleFollowFisher(fisherUid);
  });

  // Optional fisherman capture story / comment block inside the post
  let captionEl = null;
  if (captionText) {
    captionEl = document.createElement('blockquote');
    captionEl.className = 'social-post-caption';
    captionEl.textContent = `“${captionText}”`;
  }

  // 2. Trophy Photo Container
  const photoFigure = document.createElement('figure');
  photoFigure.className = 'social-trophy-figure';
  photoFigure.innerHTML = `
    <img src="${photoData}" alt="Troféu: ${escapeHtml(String(capture.quantity))}x ${escapeHtml(capture.species)} em ${escapeHtml(capture.location)}" loading="lazy" />
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
    existingShareBtn.textContent = '📤 Compartilhar captura';
    engagementBar.append(existingShareBtn);
    card.querySelector('.capture-share-row')?.remove();
  }

  // 4. Comments & Replies Drawer (with Delete Comment option)
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
      <article class="social-comment-item" data-comment-id="${escapeHtml(c.id)}">
        <div class="social-comment-top">
          <strong>${escapeHtml(c.author)}</strong>
          ${c.isPro ? '<span class="pro-mini-tag">👑 PRO</span>' : ''}
          <small>${escapeHtml(c.time || 'agora')}</small>
          <div class="social-comment-actions">
            <button type="button" class="social-reply-link" data-reply-to="${escapeHtml(c.author)}">↩ Responder</button>
            <button type="button" class="social-delete-comment-btn" data-delete-comment="${escapeHtml(c.id)}" title="Apagar comentário">🗑️ Apagar</button>
          </div>
        </div>
        <p>${escapeHtml(c.text)}</p>
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

    commentsListEl.querySelectorAll('[data-delete-comment]').forEach(btn => {
      btn.addEventListener('click', () => {
        const cid = btn.dataset.deleteComment;
        deletePostComment(id, cid);
        renderPostComments();
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
    const extMe = currentUid ? getFisherExtendedProfile(currentUid, profiles?.[currentUid]) : null;
    const authorName = extMe?.displayName || profiles?.[currentUid]?.displayName || 'Você (Pescador PRO)';
    state.comments[id].push({
      id: `c-${Date.now()}`,
      author: authorName,
      authorUid: currentUid || 'me',
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
  if (captionEl) {
    const detailsEl = card.querySelector('small');
    if (detailsEl) detailsEl.after(captionEl);
    else card.append(captionEl);
  }
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
        statusEl.textContent = '⏳ Carregando foto do seu troféu…';
        statusEl.className = 'photo-compression-status is-working';
      }
      try {
        const compressed = await compressTrophyPhoto(file, 1080, 0.8);
        pendingTrophyPhoto = compressed;
        if (previewImg) previewImg.src = compressed.dataUrl;
        if (previewWrap) previewWrap.hidden = false;
        if (statusEl) {
          statusEl.textContent = '✓ Foto do troféu pronta para publicação!';
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

  // Close public fisher profile dialog
  const closeFisherProfileBtn = $('closeFisherProfile');
  if (closeFisherProfileBtn) {
    closeFisherProfileBtn.addEventListener('click', () => $('fisherProfileDialog')?.close());
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

function drawCoverImage(ctx, img, x, y, w, h, radius = 24) {
  ctx.save();
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, radius);
  else ctx.rect(x, y, w, h);
  ctx.clip();

  const imgW = img.naturalWidth || img.width || w;
  const imgH = img.naturalHeight || img.height || h;
  const scale = Math.max(w / imgW, h / imgH);
  const drawW = imgW * scale;
  const drawH = imgH * scale;
  const dx = x + (w - drawW) / 2;
  const dy = y + (h - drawH) / 2;
  ctx.drawImage(img, dx, dy, drawW, drawH);
  ctx.restore();
}

async function drawTrophyCanvas(canvas, capture, fisherName, photoDataUrl, caption = '') {
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

  ctx.strokeStyle = 'rgba(77, 225, 193, 0.35)';
  ctx.lineWidth = 3;
  ctx.strokeRect(48, 48, W - 96, H - 96);

  ctx.fillStyle = '#4de1c1';
  ctx.font = '700 26px Manrope, sans-serif';
  ctx.fillText('⚓ MARÉ CERTA · TROFÉU DA COMUNIDADE', 96, 120);

  // Load and draw the post's Trophy Photo at the top of the card
  const photoBoxX = 96, photoBoxY = 155, photoBoxW = W - 192, photoBoxH = 510;
  ctx.fillStyle = 'rgba(6, 28, 39, 0.9)';
  ctx.strokeStyle = 'rgba(77, 225, 193, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(photoBoxX, photoBoxY, photoBoxW, photoBoxH, 28);
  else ctx.rect(photoBoxX, photoBoxY, photoBoxW, photoBoxH);
  ctx.fill();
  ctx.stroke();

  if (photoDataUrl) {
    try {
      const img = await new Promise((resolve, reject) => {
        const el = new Image();
        el.crossOrigin = 'anonymous';
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = photoDataUrl;
      });
      drawCoverImage(ctx, img, photoBoxX, photoBoxY, photoBoxW, photoBoxH, 28);
    } catch {}
  }

  // Details Card below the photo
  const infoY = 700, infoH = 490;
  ctx.fillStyle = 'rgba(10, 42, 56, 0.88)';
  ctx.strokeStyle = 'rgba(77, 225, 193, 0.28)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(96, infoY, W - 192, infoH, 28);
  else ctx.rect(96, infoY, W - 192, infoH);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#dff76d';
  ctx.font = '700 22px Manrope, sans-serif';
  ctx.fillText('CAPTURA REGISTRADA NO DIÁRIO COSTERO', 136, infoY + 55);

  ctx.fillStyle = '#eef9f7';
  ctx.font = '800 64px Manrope, sans-serif';
  const mainTitle = `${capture.quantity} × ${capture.species}`;
  ctx.fillText(mainTitle.slice(0, 24), 136, infoY + 135);

  const weightText = capture.weight ? `⚖️ Peso total: ${Number(capture.weight).toLocaleString('pt-BR')} kg` : '🎣 Pesca Costeira · Surfcasting';
  ctx.fillStyle = '#4de1c1';
  ctx.font = '700 34px "DM Sans", sans-serif';
  ctx.fillText(weightText, 136, infoY + 190);

  if (caption) {
    ctx.fillStyle = '#d3ece8';
    ctx.font = 'italic 500 24px "DM Sans", sans-serif';
    const shortCaption = caption.length > 68 ? caption.slice(0, 65) + '…' : caption;
    ctx.fillText(`“${shortCaption}”`, 136, infoY + 238);
  }

  ctx.strokeStyle = 'rgba(170, 222, 216, 0.18)';
  ctx.beginPath();
  ctx.moveTo(136, infoY + 265);
  ctx.lineTo(W - 136, infoY + 265);
  ctx.stroke();

  const drawColField = (label, val, x, y, maxLen = 24) => {
    ctx.fillStyle = '#8fb4bc';
    ctx.font = '600 21px "DM Sans", sans-serif';
    ctx.fillText(label, x, y);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 32px Manrope, sans-serif';
    ctx.fillText(String(val || '—').slice(0, maxLen), x, y + 42);
  };

  const formattedDate = String(capture.date || '').split('-').reverse().join('/');
  drawColField('PESCADOR(A)', fisherName || 'Pescador da Comunidade', 136, infoY + 315, 24);
  drawColField('DATA DA PESCARIA', formattedDate, 620, infoY + 315, 16);
  drawColField('LOCAL / PRAIA', capture.location || 'Litoral Brasileiro', 136, infoY + 410, 42);

  ctx.fillStyle = '#9db9c2';
  ctx.font = '600 26px "DM Sans", sans-serif';
  ctx.fillText('Tábua de maré, janelas e comunidade · Maré Certa', 96, 1255);
}

export async function openShareCardModal(capture, fisherName, captureId = null) {
  const dialog = $('shareCardDialog');
  const canvas = $('trophyCanvas');
  if (!dialog || !canvas) return;

  const localPhotos = loadLocalS3Photos();
  const photoDataUrl = capture.photoUrl || (captureId && localPhotos[captureId]?.dataUrl) || generateTrophyFallbackIllustration(capture);
  const caption = getCaptureCaption(captureId, capture);

  dialog.showModal();
  await drawTrophyCanvas(canvas, capture, fisherName, photoDataUrl, caption);

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
      const captionSnippet = caption ? ` — “${caption}”` : '';
      const text = `🎣 Capturei ${capture.quantity} × ${capture.species}${capture.weight ? ` (${Number(capture.weight).toLocaleString('pt-BR')} kg)` : ''} em ${capture.location} (${formattedDate})${captionSnippet}! Veja a foto e o ranking no Maré Certa.`;
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
