import {
  computeAchievements,
  PRO_PLANS,
  calculateImageDimensions,
  formatCompressionSavings,
  canUseProSocialFeature,
  getProRemainingDays,
  formatProDurationLabel,
  resolveLocationByQuery,
  searchCoastalLocations,
  COASTAL_ALIASES,
  PRESET_SPOTS
} from './model.js';

export { resolveLocationByQuery, searchCoastalLocations, COASTAL_ALIASES, PRESET_SPOTS, getProRemainingDays, formatProDurationLabel };
import { ref, set, update, push, remove, onValue, get } from 'firebase/database';
import { ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage';
import { database, storage, auth } from '../firebase.js';

const $ = id => (typeof document !== 'undefined' ? document.getElementById(id) : null);

const STORAGE_PRO_KEY = 'mare-certa-pro-subscription-v1';
const STORAGE_SOCIAL_KEY = 'mare-certa-social-state-v1';
const STORAGE_PHOTOS_KEY = 'mare-certa-local-s3-photos-v1';
const STORAGE_CAPTURE_CAPTIONS_KEY = 'mare-certa-capture-captions-v1';
const STORAGE_FISHER_PROFILES_KEY = 'mare-certa-fisher-profiles-v1';
const STORAGE_ADMIN_VIP_KEY = 'mare-certa-admin-vip-grants-v1';
const STORAGE_ADMIN_MODERATION_KEY = 'mare-certa-admin-moderation-v1';
const STORAGE_PROHIBITED_WORDS_KEY = 'mare-certa-prohibited-words-v1';
const STORAGE_ADMIN_REPORTS_KEY = 'mare-certa-moderation-reports-v1';

let pendingTrophyPhoto = null;
let pendingTrophyPhotoRemoved = false;
let selectedPlanId = 'annual';
let adminContext = {
  currentUser: null,
  profiles: {},
  captures: {},
  filterMode: 'all',
  searchQuery: ''
};

// Default Admin VIP Grants (e.g. demo or initial VIP members)
const DEFAULT_ADMIN_VIP_GRANTS = {
  'demo-fisher-1': {
    key: 'demo-fisher-1',
    uid: 'demo-fisher-1',
    email: 'henrique@marecerta.com.br',
    displayName: 'Henrique Costa',
    roleLabel: 'Embaixador & Pescador VIP (Cortesia)',
    grantedBy: 'Admin Master',
    grantedAt: 1792840000000,
    active: true
  },
  'demo-fisher-3': {
    key: 'demo-fisher-3',
    uid: 'demo-fisher-3',
    email: 'juliana@marecerta.com.br',
    displayName: 'Juliana Mar',
    roleLabel: 'Convidada Especial PRO (Sem Custo)',
    grantedBy: 'Admin Master',
    grantedAt: 1792750000000,
    active: true
  }
};

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
  if (typeof window !== 'undefined') {
    try {
      remove(ref(database, `mareCerta/comments/${captureId}/${commentId}`)).catch(() => {});
    } catch {}
  }
  return state.comments[captureId];
}

/* ============================================================
   SISTEMA DE NOTIFICAÇÕES (SININHO COM BADGE E PULSE CONTINUOUS)
   ============================================================ */
export const STORAGE_READ_COMMENTS_KEY = 'mare-certa-read-comments';

export function loadReadCommentsMap() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_READ_COMMENTS_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

export function saveReadCommentsMap(map) {
  try {
    localStorage.setItem(STORAGE_READ_COMMENTS_KEY, JSON.stringify(map));
  } catch {}
}

export function getUnreadNotificationsData(allCaptures = {}, currentUid = null, currentEmail = null) {
  const socialState = loadSocialState();
  const readMap = loadReadCommentsMap();
  const allComments = socialState.comments || {};

  const user = adminContext.currentUser || (typeof auth !== 'undefined' && auth?.currentUser) || null;
  const uidClean = currentUid || user?.uid || null;
  const emailClean = (currentEmail || user?.email || '').trim().toLowerCase();

  // Notificações são exclusivas para o perfil do usuário logado
  if (!uidClean && !emailClean) {
    return {
      totalUnread: 0,
      unreadPerCapture: {},
      unreadCaptureIds: []
    };
  }

  const extMe = uidClean ? getFisherExtendedProfile(uidClean) : null;
  const myName = (extMe?.displayName || user?.displayName || '').trim().toLowerCase();
  const myFirstName = myName ? myName.split(' ')[0] : '';

  // Capturas pertencentes exclusivamente ao perfil do usuário atual
  const myCaptureIds = new Set();
  for (const [cid, cap] of Object.entries(allCaptures || {})) {
    if (!cap) continue;
    const capUid = String(cap.uid || '').trim();
    const capEmail = String(cap.email || '').trim().toLowerCase();
    const capAuthor = String(cap.authorName || '').trim().toLowerCase();

    const isOwner = (uidClean && capUid === uidClean) ||
                    (emailClean && capEmail && capEmail === emailClean) ||
                    (myName && capAuthor && (capAuthor === myName || (myName.includes('jayme') && capAuthor.includes('jayme'))));
    if (isOwner) {
      myCaptureIds.add(cid);
    }
  }

  let totalUnread = 0;
  const unreadPerCapture = {};
  const unreadCaptureIds = [];

  for (const [cid, comments] of Object.entries(allComments)) {
    if (!Array.isArray(comments) || comments.length === 0) continue;
    const isMyPost = myCaptureIds.has(cid);

    // Regra estrita de notificação:
    // 1) Post é do próprio usuário e outra pessoa comentou;
    // 2) OU alguém respondeu marcando explicitamente o usuário (@Nome ou replyTo).
    const relevantComments = comments.filter(c => {
      if (!c) return false;
      const authorUid = String(c.authorUid || '').trim();
      const authorName = String(c.author || '').trim().toLowerCase();

      // Ignora comentários feitos pelo próprio usuário
      if (uidClean && authorUid === uidClean) return false;
      if (myName && authorName === myName) return false;

      // 1) O post pertence ao perfil do usuário
      if (isMyPost) return true;

      // 2) Alguém respondeu marcando o usuário em outro post
      const text = String(c.text || '').toLowerCase();
      const mentionsMe = (myName && text.includes(`@${myName}`)) ||
                         (myFirstName && myFirstName.length >= 3 && text.includes(`@${myFirstName}`)) ||
                         (c.replyTo && String(c.replyTo).trim().toLowerCase() === myName);
      return Boolean(mentionsMe);
    });

    if (!relevantComments.length) continue;

    const readCount = Number(readMap[cid] || 0);
    const unread = Math.max(0, relevantComments.length - readCount);
    if (unread > 0) {
      totalUnread += unread;
      unreadPerCapture[cid] = unread;
      unreadCaptureIds.push(cid);
    }
  }

  return {
    totalUnread,
    unreadPerCapture,
    unreadCaptureIds
  };
}

export function getUnreadCommentsCountForCapture(captureId, currentUid = null, currentEmail = null) {
  if (!captureId) return 0;
  const data = getUnreadNotificationsData(adminContext.captures || adminContext.allCaptures || {}, currentUid, currentEmail);
  return data.unreadPerCapture[captureId] || 0;
}

export function markCaptureCommentsAsRead(captureId, currentUid = null, currentEmail = null) {
  if (!captureId) return;
  const socialState = loadSocialState();
  const comments = Array.isArray(socialState.comments[captureId]) ? socialState.comments[captureId] : [];
  const readMap = loadReadCommentsMap();
  readMap[captureId] = comments.length;
  saveReadCommentsMap(readMap);

  updateNotificationBell();
}

export function updateNotificationBell(allCaptures = null, currentUid = null, currentEmail = null) {
  const bellBtn = $('notifBellBtn');
  const bellBadge = $('notifBellBadge');
  const rankingTabBadge = $('rankingTabBadge');
  if (!bellBtn && !bellBadge && !rankingTabBadge) return;

  const caps = allCaptures || adminContext.captures || adminContext.allCaptures || {};
  const user = adminContext.currentUser || (typeof auth !== 'undefined' && auth?.currentUser) || null;
  const uid = currentUid || user?.uid || null;
  const email = currentEmail || user?.email || null;

  const { totalUnread } = getUnreadNotificationsData(caps, uid, email);

  if (bellBadge) {
    if (totalUnread > 0) {
      bellBadge.textContent = String(totalUnread);
      bellBadge.hidden = false;
      bellBadge.classList.add('pulse-continuous');
    } else {
      bellBadge.textContent = '0';
      bellBadge.hidden = true;
      bellBadge.classList.remove('pulse-continuous');
    }
  }

  if (bellBtn) {
    bellBtn.setAttribute('data-unread-count', String(totalUnread));
    bellBtn.setAttribute('title', totalUnread > 0
      ? `🔔 ${totalUnread} mensagem(ns) não lida(s) nos seus troféus! Clique para ler.`
      : '🔔 Notificações: Nenhuma mensagem nova.');
    if (totalUnread > 0) {
      bellBtn.classList.add('has-unread', 'pulse-continuous');
    } else {
      bellBtn.classList.remove('has-unread', 'pulse-continuous');
    }
  }

  if (rankingTabBadge) {
    if (totalUnread > 0) {
      rankingTabBadge.textContent = String(totalUnread);
      rankingTabBadge.hidden = false;
      rankingTabBadge.classList.add('pulse-continuous');
    } else {
      rankingTabBadge.textContent = '0';
      rankingTabBadge.hidden = true;
      rankingTabBadge.classList.remove('pulse-continuous');
    }
  }
}

export function setupNotificationBellListener() {
  if (typeof document === 'undefined') return;
  const bellBtn = $('notifBellBtn');
  if (!bellBtn || bellBtn._bellListenerInitialized) return;
  bellBtn._bellListenerInitialized = true;

  bellBtn.addEventListener('click', () => {
    const caps = adminContext.captures || adminContext.allCaptures || {};
    const user = adminContext.currentUser || (typeof auth !== 'undefined' && auth?.currentUser) || null;
    const uid = user?.uid || null;
    const email = user?.email || null;
    const { totalUnread, unreadCaptureIds } = getUnreadNotificationsData(caps, uid, email);

    // 1. Garante a seleção da aba de Ranking e Comunidade
    const rankingTab = $('rankingTab');
    if (rankingTab) rankingTab.click();

    // 2. Localiza o primeiro post com mensagens não lidas e rola até ele
    if (unreadCaptureIds.length > 0) {
      const targetId = unreadCaptureIds[0];
      setTimeout(() => {
        const card = document.getElementById(`capture-card-${targetId}`) ||
                     (typeof CSS !== 'undefined' && CSS.escape && document.querySelector(`[data-capture-id="${CSS.escape(targetId)}"]`));
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          card.classList.add('highlight-shared-capture');
          const commentInput = card.querySelector('input[name="commentText"]');
          if (commentInput) {
            try { commentInput.focus(); } catch {}
          }
          markCaptureCommentsAsRead(targetId, uid, email);
          setTimeout(() => card.classList.remove('highlight-shared-capture'), 4500);
        } else {
          $('myCapturesSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    } else {
      setTimeout(() => {
        const target = $('myCapturesSection') || $('rankingPanel');
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
  });
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

export function applyLocationToMainPage(locationObj) {
  if (!locationObj || !locationObj.name) return false;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('mare-certa-location', JSON.stringify(locationObj));
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mare-certa:set-location', { detail: locationObj }));
    }
    return true;
  } catch {
    return false;
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

  const locVal = (typeof ext.location === 'string' && ext.location.trim().length > 0)
    ? ext.location.trim()
    : defaultLoc;

  return {
    uid: uid || 'local-fisher',
    displayName: ext.displayName || baseProfile?.displayName || 'Pescador Costeiro',
    location: locVal,
    preferredLocation: ext.preferredLocation || null,
    bio: ext.bio || '',
    instagram: ext.instagram || '',
    social2: ext.social2 || '',
    phone: ext.phone || '',
    avatarUrl: ext.avatarUrl || '',
    extraTrophyPhotos: Array.isArray(ext.extraTrophyPhotos) ? ext.extraTrophyPhotos : [],
    isPro: Boolean(ext.isPro),
    proPlan: ext.proPlan || null,
    proDurationDays: ext.proDurationDays || 0,
    proActivatedAt: ext.proActivatedAt || null,
    proExpiresAt: ext.proExpiresAt || null
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
      try {
        update(ref(database, `mareCerta/extendedProfiles/${uid}`), raw[uid]).catch(() => {});
      } catch {}
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

export async function uploadTrophyPhotoToFirebaseStorage(captureId, photoDataUrl) {
  if (!photoDataUrl || typeof photoDataUrl !== 'string' || !photoDataUrl.startsWith('data:')) return null;
  try {
    const fileRef = storageRef(storage, `mareCerta/trophies/${captureId || Date.now()}.webp`);
    await uploadString(fileRef, photoDataUrl, 'data_url');
    const downloadUrl = await getDownloadURL(fileRef);
    return downloadUrl;
  } catch (err) {
    console.warn('Fallback: foto salva localmente, upload no Firebase Storage não concluído:', err);
    return null;
  }
}

export function loadAdminVipGrants(now = Date.now()) {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_ADMIN_VIP_KEY) || 'null');
    if (raw && typeof raw === 'object') {
      const merged = { ...DEFAULT_ADMIN_VIP_GRANTS, ...raw };
      // Filter out explicitly revoked entries (active === false) or expired subscriptions
      const activeOnly = {};
      for (const [k, val] of Object.entries(merged)) {
        if (!val || val.active === false) continue;
        if (val.expiresAt && Number.isFinite(val.expiresAt) && now >= val.expiresAt) continue;
        activeOnly[k] = val;
      }
      return activeOnly;
    }
  } catch {}
  return structuredClone(DEFAULT_ADMIN_VIP_GRANTS);
}

function loadRawAdminVipGrantsMap() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_ADMIN_VIP_KEY) || 'null');
    if (raw && typeof raw === 'object') return { ...DEFAULT_ADMIN_VIP_GRANTS, ...raw };
  } catch {}
  return structuredClone(DEFAULT_ADMIN_VIP_GRANTS);
}

export function sanitizeFirebaseKey(k) {
  return String(k || '').trim().replace(/[.#$/[\]]/g, '_');
}

export function saveAdminVipGrants(grantsMap) {
  try {
    localStorage.setItem(STORAGE_ADMIN_VIP_KEY, JSON.stringify(grantsMap));
  } catch {}
  updateProStatusUI();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mare-certa:pro-changed', { detail: getProSubscription() }));
    window.dispatchEvent(new CustomEvent('mare-certa:vip-grants-changed', { detail: grantsMap }));
    try {
      const sanitized = {};
      for (const [k, v] of Object.entries(grantsMap || {})) {
        const sk = sanitizeFirebaseKey(k);
        if (sk) sanitized[sk] = v;
      }
      set(ref(database, 'mareCerta/vipGrants'), sanitized).catch(() => {});
    } catch {}
  }
}

export function isUserAdminGrantedPro(uid = null, email = null, now = Date.now()) {
  const grants = loadAdminVipGrants(now);
  const currentAuth = (typeof auth !== 'undefined' && auth?.currentUser) || adminContext.currentUser || null;
  const targetUid = uid || currentAuth?.uid || 'local-current-user';
  const targetEmail = String(email || currentAuth?.email || '').trim().toLowerCase();

  const isValidGrant = grant => {
    if (!grant || grant.active === false) return false;
    if (grant.expiresAt && Number.isFinite(grant.expiresAt) && now >= grant.expiresAt) return false;
    return true;
  };

  if (targetUid && isValidGrant(grants[targetUid])) return grants[targetUid];
  if (targetEmail && isValidGrant(grants[targetEmail])) return grants[targetEmail];
  if (targetEmail && isValidGrant(grants[sanitizeFirebaseKey(targetEmail)])) return grants[sanitizeFirebaseKey(targetEmail)];

  for (const grant of Object.values(grants)) {
    if (!isValidGrant(grant)) continue;
    if (targetUid && grant.uid && grant.uid === targetUid) return grant;
    if (targetEmail && grant.email && String(grant.email).trim().toLowerCase() === targetEmail) return grant;
  }
  return null;
}

export function grantFreeProToUser({
  uid = '',
  email = '',
  displayName = 'Pescador VIP',
  roleLabel = 'PRO Cortesia (Liberado pelo Admin)',
  grantedBy = 'Admin',
  durationDays = 365
} = {}) {
  const cleanUid = String(uid || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const key = cleanUid || cleanEmail || `vip-${Date.now()}`;
  const rawMap = loadRawAdminVipGrantsMap();
  const daysNum = Number(durationDays) || 365;
  const expiresAt = Date.now() + daysNum * 24 * 60 * 60 * 1000;

  const record = {
    key,
    uid: cleanUid || key,
    email: cleanEmail,
    displayName: String(displayName || cleanEmail || cleanUid || 'Pescador VIP').trim(),
    roleLabel: String(roleLabel || 'PRO Cortesia (Liberado pelo Admin)').trim(),
    grantedBy,
    grantedAt: Date.now(),
    expiresAt,
    proExpiresAt: expiresAt,
    durationDays: daysNum,
    active: true,
    revokedAt: null
  };

  rawMap[key] = record;
  if (cleanEmail && cleanEmail !== key) {
    rawMap[cleanEmail] = { ...record, key: cleanEmail };
  }
  saveAdminVipGrants(rawMap);

  // Sincroniza diretamente com o backend local / Hostinger
  if (typeof fetch === 'function') {
    fetch('/api/mp/simulate_approval', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: cleanUid || key,
        email: cleanEmail,
        name: displayName,
        roleLabel,
        durationDays: daysNum,
        isFreeGrant: true,
        paymentId: `admin-${Date.now()}`
      })
    }).catch(() => {});
  }

  // Também sincroniza diretamente no extendedProfiles do Firebase Realtime Database
  if (cleanUid) {
    const extMap = loadFisherExtendedProfiles();
    extMap[cleanUid] = {
      ...(extMap[cleanUid] || {}),
      displayName: String(displayName || extMap[cleanUid]?.displayName || 'Pescador VIP').trim(),
      isPro: true,
      proPlan: 'vip_cortesia',
      proDurationDays: daysNum,
      proExpiresAt: expiresAt,
      proActivatedAt: Date.now()
    };
    try { localStorage.setItem(STORAGE_FISHER_PROFILES_KEY, JSON.stringify(extMap)); } catch {}
    if (typeof window !== 'undefined') {
      try {
        update(ref(database, `mareCerta/extendedProfiles/${cleanUid}`), {
          displayName: String(displayName || extMap[cleanUid]?.displayName || 'Pescador VIP').trim(),
          isPro: true,
          proPlan: 'vip_cortesia',
          proDurationDays: daysNum,
          proExpiresAt: expiresAt,
          proActivatedAt: Date.now()
        }).catch(() => {});
      } catch {}
    }
  }

  renderAdminProPanel();
  return record;
}

export function revokeFreeProFromUser(identifier) {
  if (!identifier) return false;
  const cleanId = String(identifier).trim();
  const cleanLower = cleanId.toLowerCase();
  const rawMap = loadRawAdminVipGrantsMap();
  let changed = false;

  for (const [k, grant] of Object.entries(rawMap)) {
    if (
      k === cleanId ||
      k.toLowerCase() === cleanLower ||
      grant?.uid === cleanId ||
      (grant?.email && String(grant.email).toLowerCase() === cleanLower)
    ) {
      rawMap[k] = { ...grant, active: false, isPaidSubscription: false, revokedAt: Date.now() };
      changed = true;
    }
  }

  // Também desativa no extendedProfiles tanto local quanto no Firebase Realtime Database
  const extMap = loadFisherExtendedProfiles();
  let extChanged = false;
  for (const [k, prof] of Object.entries(extMap)) {
    if (k === cleanId || k.toLowerCase() === cleanLower) {
      extMap[k] = { ...prof, isPro: false, proPlan: null };
      extChanged = true;
    }
  }
  if (extChanged) {
    try { localStorage.setItem(STORAGE_FISHER_PROFILES_KEY, JSON.stringify(extMap)); } catch {}
  }
  if (typeof window !== 'undefined' && cleanId) {
    try {
      update(ref(database, `mareCerta/extendedProfiles/${cleanId}`), { isPro: false, proPlan: null }).catch(() => {});
      update(ref(database, `mareCerta/vipGrants/${cleanId}`), { active: false, isPaidSubscription: false, revokedAt: Date.now() }).catch(() => {});
    } catch {}
  }

  // If revoking the current local user who also had PRO active, turn it off so revocation takes immediate effect
  const currentUid = adminContext.currentUser?.uid || (typeof auth !== 'undefined' && auth?.currentUser?.uid) || 'local-current-user';
  const currentEmail = String(adminContext.currentUser?.email || (typeof auth !== 'undefined' && auth?.currentUser?.email) || '').trim().toLowerCase();
  if (
    cleanId === currentUid ||
    cleanLower === currentEmail ||
    cleanId === 'local-current-user' ||
    (typeof auth !== 'undefined' && auth?.currentUser?.uid && cleanId === auth.currentUser.uid) ||
    (typeof auth !== 'undefined' && auth?.currentUser?.email && cleanLower === auth.currentUser.email.toLowerCase())
  ) {
    try {
      localStorage.removeItem(STORAGE_PRO_KEY);
      localStorage.removeItem('mare-certa-pending-mp-checkout');
    } catch {}
  }

  // Notifica o backend local / Hostinger para revogar a assinatura salva
  if (typeof fetch === 'function') {
    try {
      fetch('/api/mp/revoke_subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: cleanId, email: cleanLower })
      }).catch(() => {});
    } catch {}
  }

  saveAdminVipGrants(rawMap);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mare-certa:pro-changed', { detail: { isPro: false } }));
  }
  updateProStatusUI();
  renderAdminProPanel();
  return changed;
}

export function setAdminCommunityContext(user, profiles = {}, captures = {}) {
  adminContext.currentUser = user || null;
  adminContext.profiles = profiles || {};
  adminContext.captures = captures || {};
  updateProStatusUI();
  setupNotificationBellListener();
  updateNotificationBell(captures, user?.uid, user?.email);
}

export const DEFAULT_PROHIBITED_WORDS = [
  // Ofensas, palavrões e discurso de ódio
  'caralho',
  'porra',
  'puta',
  'putaria',
  'merda',
  'foda-se',
  'fodase',
  'vai se foder',
  'arrombado',
  'arrombada',
  'vagabundo',
  'vagabunda',
  'babaca',
  'otario',
  'idiota',
  'imbecil',
  'desgracado',
  'pilantra',
  'bandido',
  'lixo humano',
  // Pesca predatória e crimes ambientais
  'pesca com bomba',
  'bomba na agua',
  'dinamite',
  'rede de arrasto',
  'tarrafa no defeso',
  'pesca no defeso',
  'veneno na agua',
  'pesca ilegal',
  'venda ilegal',
  'contrabando',
  // Ilícitos, drogas, armas e golpes/spam
  'cocaina',
  'maconha',
  'crack',
  'trafico de drogas',
  'arma de fogo',
  'municao ilegal',
  'jogo do tigrinho',
  'tigrinho',
  'cassino online',
  'aposta ilegal',
  'golpe do pix',
  'urfbu',
  'clonar cartao',
  'nota falsa',
  'dinheiro falso'
];

// Palavras legítimas de pesca que não devem jamais sofrer falso-positivo
const FISHING_SAFE_WHITELIST = ['corrupto', 'corruptos', 'isca corrupto'];

function normalizeModerationText(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[@4]/g, 'a')
    .replace(/[3]/g, 'e')
    .replace(/[1!]/g, 'i')
    .replace(/[0]/g, 'o')
    .replace(/[$5]/g, 's')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function loadCustomProhibitedWords() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_PROHIBITED_WORDS_KEY) || '[]');
    if (Array.isArray(raw)) {
      return raw.map(w => String(w || '').trim().toLowerCase()).filter(Boolean);
    }
  } catch {}
  return [];
}

export function loadProhibitedWords() {
  const custom = loadCustomProhibitedWords();
  return Array.from(new Set([...DEFAULT_PROHIBITED_WORDS, ...custom]));
}

export function addProhibitedWord(word) {
  const clean = String(word || '').trim().toLowerCase();
  if (!clean || clean.length < 2) return loadProhibitedWords();
  if (FISHING_SAFE_WHITELIST.includes(clean)) return loadProhibitedWords();
  const custom = loadCustomProhibitedWords();
  if (!custom.includes(clean) && !DEFAULT_PROHIBITED_WORDS.includes(clean)) {
    custom.push(clean);
    try {
      localStorage.setItem(STORAGE_PROHIBITED_WORDS_KEY, JSON.stringify(custom));
      if (typeof window !== 'undefined') {
        set(ref(database, 'mareCerta/moderation/prohibitedWords'), custom).catch(() => {});
      }
    } catch {}
  }
  return loadProhibitedWords();
}

export function removeProhibitedWord(word) {
  const clean = String(word || '').trim().toLowerCase();
  const custom = loadCustomProhibitedWords().filter(w => w !== clean);
  try {
    localStorage.setItem(STORAGE_PROHIBITED_WORDS_KEY, JSON.stringify(custom));
    if (typeof window !== 'undefined') {
      set(ref(database, 'mareCerta/moderation/prohibitedWords'), custom).catch(() => {});
    }
  } catch {}
  return loadProhibitedWords();
}

export function validateTextAgainstModeration(text, fieldLabel = 'texto') {
  const raw = String(text || '').trim();
  if (!raw) return { valid: true, matchedWord: null, message: '' };

  const normalizedInput = normalizeModerationText(raw);
  const tokens = normalizedInput.split(' ').filter(Boolean);
  const blockedList = loadProhibitedWords();

  for (const term of blockedList) {
    const normTerm = normalizeModerationText(term);
    if (!normTerm) continue;
    if (FISHING_SAFE_WHITELIST.includes(normTerm)) continue;

    const isMultiWord = normTerm.includes(' ');
    const matched = isMultiWord
      ? normalizedInput.includes(normTerm)
      : tokens.some(tok => tok === normTerm || (normTerm.length >= 5 && tok.startsWith(normTerm)));

    if (matched) {
      return {
        valid: false,
        matchedWord: term,
        message: `Conteúdo bloqueado no campo ${fieldLabel}: não são permitidas palavras ofensivas, práticas predatórias ou termos ilícitos ("${term}").`
      };
    }
  }

  return { valid: true, matchedWord: null, message: '' };
}

export function loadAdminModerationMap() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_ADMIN_MODERATION_KEY) || '{}');
    if (raw && typeof raw === 'object') return raw;
  } catch {}
  return {};
}

export function saveAdminModerationMap(map) {
  try {
    localStorage.setItem(STORAGE_ADMIN_MODERATION_KEY, JSON.stringify(map || {}));
  } catch {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mare-certa:moderation-changed', { detail: map }));
    try {
      set(ref(database, 'mareCerta/moderation/users'), map || {}).catch(() => {});
    } catch {}
  }
}

export function banUserAccount({
  uid = '',
  email = '',
  displayName = 'Pescador',
  durationDays = 7,
  reason = 'Violação das diretrizes da comunidade'
} = {}) {
  const cleanUid = String(uid || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const key = cleanUid || cleanEmail;
  if (!key) return null;

  const isPermanent = durationDays === 'permanent' || durationDays === Infinity || Number(durationDays) <= 0;
  const daysNum = isPermanent ? null : Number(durationDays);
  const now = Date.now();
  const expiresAt = isPermanent ? null : now + daysNum * 86400000;

  const record = {
    key,
    uid: cleanUid || key,
    email: cleanEmail,
    displayName: String(displayName || cleanEmail || cleanUid || 'Pescador').trim(),
    status: isPermanent ? 'banned_perm' : 'banned_temp',
    durationDays: isPermanent ? 'permanent' : daysNum,
    reason: String(reason || 'Violação das diretrizes da comunidade').trim(),
    bannedAt: now,
    expiresAt
  };

  const map = loadAdminModerationMap();
  map[key] = record;
  if (cleanEmail && cleanEmail !== key) {
    map[cleanEmail] = { ...record, key: cleanEmail };
  }
  saveAdminModerationMap(map);
  return record;
}

export function unbanUserAccount(identifier) {
  if (!identifier) return false;
  const cleanId = String(identifier).trim();
  const cleanLower = cleanId.toLowerCase();
  const map = loadAdminModerationMap();
  let changed = false;

  for (const [k, rec] of Object.entries(map)) {
    if (
      k === cleanId ||
      k.toLowerCase() === cleanLower ||
      rec?.uid === cleanId ||
      (rec?.email && String(rec.email).toLowerCase() === cleanLower)
    ) {
      delete map[k];
      changed = true;
    }
  }
  if (changed) saveAdminModerationMap(map);
  return changed;
}

export function deleteUserAccountByAdmin({
  uid = '',
  email = '',
  displayName = 'Pescador',
  reason = 'Conta excluída pela administração'
} = {}) {
  const cleanUid = String(uid || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const key = cleanUid || cleanEmail;
  if (!key) return null;

  const now = Date.now();
  const record = {
    key,
    uid: cleanUid || key,
    email: cleanEmail,
    displayName: String(displayName || cleanEmail || cleanUid || 'Pescador').trim(),
    status: 'deleted',
    durationDays: 'deleted',
    reason: String(reason || 'Conta excluída pela administração').trim(),
    deletedAt: now,
    expiresAt: null
  };

  const map = loadAdminModerationMap();
  map[key] = record;
  if (cleanEmail && cleanEmail !== key) {
    map[cleanEmail] = { ...record, key: cleanEmail };
  }
  saveAdminModerationMap(map);

  // Revoke any VIP grant and clean up local profile/comments
  revokeFreeProFromUser(cleanUid || cleanEmail);
  try {
    const extRaw = JSON.parse(localStorage.getItem(STORAGE_FISHER_PROFILES_KEY) || '{}') || {};
    if (cleanUid && extRaw[cleanUid]) {
      delete extRaw[cleanUid];
      localStorage.setItem(STORAGE_FISHER_PROFILES_KEY, JSON.stringify(extRaw));
    }
  } catch {}
  try {
    const social = loadSocialState();
    for (const postId of Object.keys(social.comments || {})) {
      social.comments[postId] = (social.comments[postId] || []).filter(
        c => c.authorUid !== cleanUid && c.author !== displayName
      );
    }
    saveSocialState(social);
  } catch {}

  return record;
}

export function restoreDeletedUserAccount(identifier) {
  return unbanUserAccount(identifier);
}

export function getUserModerationStatus(uid = null, email = null, now = Date.now()) {
  const map = loadAdminModerationMap();
  const targetUid = String(uid || '').trim();
  const targetEmail = String(email || '').trim().toLowerCase();

  let rec = null;
  if (targetUid && map[targetUid]) rec = map[targetUid];
  else if (targetEmail && map[targetEmail]) rec = map[targetEmail];
  else {
    for (const item of Object.values(map)) {
      if (!item) continue;
      if (targetUid && item.uid === targetUid) {
        rec = item;
        break;
      }
      if (targetEmail && item.email && String(item.email).toLowerCase() === targetEmail) {
        rec = item;
        break;
      }
    }
  }

  if (!rec) {
    return {
      status: 'active',
      isRestricted: false,
      label: 'Conta Ativa',
      message: '',
      remainingDays: 0,
      expiresAt: null
    };
  }

  if (rec.status === 'deleted') {
    return {
      status: 'deleted',
      isRestricted: true,
      label: '🗑️ Conta Excluída',
      reason: rec.reason,
      remainingDays: Infinity,
      expiresAt: null,
      message: 'Esta conta foi excluída pela administração do Maré Certa e não pode publicar ou interagir.'
    };
  }

  if (rec.status === 'banned_perm') {
    return {
      status: 'banned_perm',
      isRestricted: true,
      label: '⛔ Banimento Permanente',
      reason: rec.reason,
      remainingDays: Infinity,
      expiresAt: null,
      message: `Sua conta foi banida permanentemente pela moderação (${rec.reason || 'violação das regras'}).`
    };
  }

  if (rec.status === 'banned_temp') {
    if (rec.expiresAt && now >= rec.expiresAt) {
      unbanUserAccount(targetUid || targetEmail);
      return {
        status: 'active',
        isRestricted: false,
        label: 'Conta Ativa',
        message: '',
        remainingDays: 0,
        expiresAt: null
      };
    }
    const remainingDays = rec.expiresAt ? Math.max(1, Math.ceil((rec.expiresAt - now) / 86400000)) : rec.durationDays || 7;
    const expireDateStr = rec.expiresAt ? new Date(rec.expiresAt).toLocaleDateString('pt-BR') : '';
    return {
      status: 'banned_temp',
      isRestricted: true,
      durationDays: rec.durationDays,
      remainingDays,
      expiresAt: rec.expiresAt,
      reason: rec.reason,
      label: `🚫 Banido (${remainingDays}d restantes)`,
      message: `Sua conta está suspensa temporariamente por ${rec.durationDays} dias (${remainingDays} dia(s) restante(s)${expireDateStr ? ` · até ${expireDateStr}` : ''}).`
    };
  }

  return {
    status: 'active',
    isRestricted: false,
    label: 'Conta Ativa',
    message: '',
    remainingDays: 0,
    expiresAt: null
  };
}

/* ============================================================
   DENÚNCIAS DE COMENTÁRIOS (MODERAÇÃO PELO DONO DO POST / ADMIN)
   ============================================================ */
export function loadAdminReportsMap() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_ADMIN_REPORTS_KEY) || '{}') || {};
    return typeof raw === 'object' && raw !== null ? raw : {};
  } catch {
    return {};
  }
}

export function saveAdminReportsMap(map) {
  try {
    localStorage.setItem(STORAGE_ADMIN_REPORTS_KEY, JSON.stringify(map));
  } catch {}
}

export function submitCommentReport({
  postId = '',
  captureTitle = 'Captura',
  commentId = '',
  commentText = '',
  offenderUid = '',
  offenderName = 'Pescador',
  reporterUid = '',
  reporterName = 'Dono da Postagem',
  reason = ''
} = {}) {
  const cleanReason = String(reason || '').trim();
  if (cleanReason.length < 3) {
    throw new Error('Por favor, descreva o ocorrido com pelo menos 3 caracteres.');
  }

  const reportId = `rep-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const record = {
    id: reportId,
    postId: String(postId || '').trim(),
    captureTitle: String(captureTitle || 'Captura').trim(),
    commentId: String(commentId || '').trim(),
    commentText: String(commentText || '').trim(),
    offenderUid: String(offenderUid || '').trim(),
    offenderName: String(offenderName || 'Pescador').trim(),
    reporterUid: String(reporterUid || 'anon').trim(),
    reporterName: String(reporterName || 'Dono da Postagem').trim(),
    reason: cleanReason,
    createdAt: Date.now(),
    status: 'pending' // 'pending' | 'resolved' | 'dismissed'
  };

  const map = loadAdminReportsMap();
  map[reportId] = record;
  saveAdminReportsMap(map);

  if (typeof window !== 'undefined') {
    try {
      set(ref(database, `mareCerta/moderation/reports/${reportId}`), record).catch(() => {});
    } catch {}
    window.dispatchEvent(new CustomEvent('mare-certa:reports-changed', { detail: map }));
  }

  renderAdminReportsList();
  return record;
}

export function resolveAdminReport(reportId, action = 'resolved') {
  if (!reportId) return false;
  const map = loadAdminReportsMap();
  if (!map[reportId]) return false;

  map[reportId] = {
    ...map[reportId],
    status: action,
    resolvedAt: Date.now()
  };
  saveAdminReportsMap(map);

  if (typeof window !== 'undefined') {
    try {
      update(ref(database, `mareCerta/moderation/reports/${reportId}`), {
        status: action,
        resolvedAt: Date.now()
      }).catch(() => {});
    } catch {}
    window.dispatchEvent(new CustomEvent('mare-certa:reports-changed', { detail: map }));
  }

  renderAdminReportsList();
  return true;
}

export function openReportCommentDialog({
  postId = '',
  captureTitle = 'Captura',
  commentId = '',
  commentText = '',
  offenderUid = '',
  offenderName = 'Pescador'
} = {}) {
  const dialog = $('reportCommentDialog');
  if (!dialog) return;

  const textEl = $('reportTargetCommentText');
  const authorEl = $('reportTargetAuthorName');
  const postIdInput = $('reportPostIdInput');
  const commentIdInput = $('reportCommentIdInput');
  const offenderUidInput = $('reportOffenderUidInput');
  const offenderNameInput = $('reportOffenderNameInput');
  const reasonInput = $('reportReasonInput');

  if (textEl) textEl.textContent = `"${commentText}"`;
  if (authorEl) authorEl.textContent = offenderName;
  if (postIdInput) postIdInput.value = postId;
  if (commentIdInput) commentIdInput.value = commentId;
  if (offenderUidInput) offenderUidInput.value = offenderUid;
  if (offenderNameInput) offenderNameInput.value = offenderName;
  if (reasonInput) reasonInput.value = '';

  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
  } else {
    dialog.hidden = false;
  }
}

export function renderAdminReportsList() {
  if (typeof document === 'undefined') return;
  const listEl = $('adminReportsList');
  const countBadge = $('adminReportsCountBadge');
  const totalKpi = $('adminTotalReportsCount');

  const map = loadAdminReportsMap();
  const allReports = Object.values(map).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const pending = allReports.filter(r => r.status === 'pending');

  if (countBadge) countBadge.textContent = `${pending.length} pendente(s)`;
  if (totalKpi) totalKpi.textContent = String(pending.length);

  if (!listEl) return;

  if (!allReports.length) {
    listEl.innerHTML = `<p class="empty-note">Nenhuma denúncia de comentário registrada até o momento. A comunidade está em paz!</p>`;
    return;
  }

  listEl.innerHTML = allReports
    .map(r => {
      const isResolved = r.status === 'resolved' || r.status === 'dismissed';
      const statusTag = r.status === 'pending'
        ? '<span class="admin-mod-badge is-banned">🚨 Pendente</span>'
        : r.status === 'resolved'
          ? '<span class="admin-source-tag">✓ Punição Aplicada</span>'
          : '<span class="admin-source-tag">Descartada</span>';
      const dateStr = new Date(r.createdAt || Date.now()).toLocaleString('pt-BR');

      return `
        <article class="admin-report-card ${isResolved ? 'is-resolved' : ''}" data-report-id="${escapeHtml(r.id)}">
          <div class="admin-report-meta">
            <span>📅 ${escapeHtml(dateStr)} · Denunciado por: <strong>${escapeHtml(r.reporterName)}</strong></span>
            ${statusTag}
          </div>
          <div class="admin-report-body">
            <div><strong>Comentário denunciado:</strong></div>
            <div class="admin-report-comment-box">
              <strong>${escapeHtml(r.offenderName)}</strong> ${r.offenderUid ? `<small>(${escapeHtml(r.offenderUid)})</small>` : ''}:
              <span>"${escapeHtml(r.commentText)}"</span>
            </div>
            <div><strong>Motivo relatado pelo denunciante:</strong></div>
            <div class="admin-report-reason-box">
              <span>"${escapeHtml(r.reason)}"</span>
            </div>
          </div>
          ${
            !isResolved
              ? `
            <div class="admin-report-actions">
              <select class="admin-report-ban-select" data-report-ban-select="${escapeHtml(r.id)}" aria-label="Tempo de suspensão">
                <option value="7">Suspender 7 dias</option>
                <option value="14">Suspender 14 dias</option>
                <option value="30">Suspender 30 dias</option>
                <option value="permanent">Banimento Permanente</option>
              </select>
              <button type="button" class="admin-report-action-btn is-suspend" data-report-suspend-id="${escapeHtml(r.id)}" data-offender-uid="${escapeHtml(r.offenderUid)}" data-offender-name="${escapeHtml(r.offenderName)}">
                🚫 Suspender Perfil Infrator
              </button>
              <button type="button" class="admin-report-action-btn is-delete-comment" data-report-delete-post="${escapeHtml(r.postId)}" data-report-delete-comment="${escapeHtml(r.commentId)}" data-report-delete-id="${escapeHtml(r.id)}">
                🗑️ Apagar Comentário
              </button>
              <button type="button" class="admin-report-action-btn is-dismiss" data-report-dismiss-id="${escapeHtml(r.id)}">
                ✓ Descartar Denúncia
              </button>
            </div>
          `
              : ''
          }
        </article>
      `;
    })
    .join('');

  listEl.querySelectorAll('[data-report-suspend-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const repId = btn.dataset.reportSuspendId;
      const offUid = btn.dataset.offenderUid;
      const offName = btn.dataset.offenderName;
      const selectEl = listEl.querySelector(`[data-report-ban-select="${CSS.escape ? CSS.escape(repId) : repId}"]`);
      const durationVal = selectEl ? selectEl.value : '7';

      if (offUid) {
        banUserAccount({
          uid: offUid,
          displayName: offName,
          durationDays: durationVal === 'permanent' ? 'permanent' : Number(durationVal),
          reason: `Denúncia de comentário abusivo confirmada pelo administrador (${durationVal === 'permanent' ? 'Permanente' : durationVal + ' dias'})`
        });
      }
      resolveAdminReport(repId, 'resolved');
      renderAdminProPanel();
    });
  });

  listEl.querySelectorAll('[data-report-delete-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const repId = btn.dataset.reportDeleteId;
      const postId = btn.dataset.reportDeletePost;
      const commentId = btn.dataset.reportDeleteComment;
      if (postId && commentId) {
        deletePostComment(postId, commentId);
      }
      resolveAdminReport(repId, 'resolved');
      renderAdminProPanel();
    });
  });

  listEl.querySelectorAll('[data-report-dismiss-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      resolveAdminReport(btn.dataset.reportDismissId, 'dismissed');
      renderAdminProPanel();
    });
  });
}

export function getProSubscription(uid = null, email = null, now = Date.now()) {
  const currentAuthUser = (typeof auth !== 'undefined' && auth?.currentUser) || adminContext.currentUser || null;
  const targetUid = String(uid || currentAuthUser?.uid || '').trim();
  const targetEmail = String(email || currentAuthUser?.email || '').trim().toLowerCase();

  const adminGrant = isUserAdminGrantedPro(uid, email, now);
  if (adminGrant) {
    if (adminGrant.isPaidSubscription) {
      const plan = PRO_PLANS[adminGrant.planId] || PRO_PLANS.annual;
      const durationDays = adminGrant.durationDays || plan.durationDays || (plan.id === 'annual' ? 365 : 30);
      const activatedAt = adminGrant.activatedAt || adminGrant.grantedAt || now;
      const expiresAt = adminGrant.expiresAt || (activatedAt + durationDays * 86400000);
      const isExpired = now >= expiresAt;
      const paidSub = {
        active: !isExpired,
        expired: isExpired,
        planId: plan.id,
        planName: plan.name,
        durationDays,
        priceMonthly: plan.priceMonthly,
        billingTotal: plan.billingTotal,
        activatedAt,
        expiresAt,
        isFreeGrant: false,
        gateway: 'Mercado Pago'
      };
      paidSub.remainingDays = getProRemainingDays(paidSub, now);
      return paidSub;
    }
    return {
      active: true,
      expired: false,
      planId: 'vip_admin',
      planName: adminGrant.roleLabel || 'PRO Cortesia (Liberado pelo Admin)',
      durationDays: 3650,
      remainingDays: 3650,
      priceMonthly: 0,
      billingTotal: 0,
      activatedAt: adminGrant.grantedAt || now,
      expiresAt: now + 10 * 365 * 86400000,
      isFreeGrant: true,
      gateway: 'Cortesia Admin (Sem Custo)'
    };
  }

  // Se o registro na nuvem/admin indicar que a conta foi explicitamente revogada, respeita o status Gratuito
  try {
    const rawGrants = loadRawAdminVipGrantsMap();
    const explicitRec = (targetUid && rawGrants[targetUid]) || (targetEmail && rawGrants[targetEmail]);
    if (explicitRec && explicitRec.active === false && explicitRec.revokedAt) {
      return {
        active: false,
        expired: false,
        planId: null,
        durationDays: 0,
        remainingDays: 0,
        expiresAt: null,
        gateway: 'Mercado Pago'
      };
    }
  } catch {}

  // Verifica perfil estendido sincronizado pela nuvem (garante paridade entre abas/navegadores)
  if (targetUid) {
    try {
      const extMap = loadFisherExtendedProfiles();
      const ext = extMap[targetUid];
      if (ext && ext.isPro === true) {
        const plan = PRO_PLANS[ext.proPlan] || PRO_PLANS.annual;
        const durationDays = ext.proDurationDays || plan.durationDays || (plan.id === 'annual' ? 365 : 30);
        const activatedAt = ext.proActivatedAt || now;
        const expiresAt = ext.proExpiresAt || (activatedAt + durationDays * 86400000);
        const isExpired = now >= expiresAt;
        if (!isExpired) {
          const extSub = {
            active: true,
            expired: false,
            planId: plan.id,
            planName: plan.name,
            durationDays,
            priceMonthly: plan.priceMonthly,
            billingTotal: plan.billingTotal,
            activatedAt,
            expiresAt,
            isFreeGrant: ext.proPlan === 'vip_cortesia',
            gateway: 'Mercado Pago'
          };
          extSub.remainingDays = getProRemainingDays(extSub, now);
          return extSub;
        }
      }
    } catch {}
  }

  try {
    const sub = JSON.parse(localStorage.getItem(STORAGE_PRO_KEY) || 'null');
    if (sub && typeof sub === 'object') {
      // Impede que o cache local de uma conta (ex: conta de teste na aba anônima) vaze para outra conta logada
      const subUid = String(sub.uid || '').trim();
      const uidMismatch = subUid && subUid !== 'local-current-user' && targetUid && targetUid !== 'local-current-user' && subUid !== targetUid;
      if (!uidMismatch) {
        const hasExpiry = sub.expiresAt && Number.isFinite(sub.expiresAt);
        const isExpired = Boolean(hasExpiry && now >= sub.expiresAt);
        const isActive = sub.active === true && !isExpired;
        const normalized = {
          ...sub,
          active: isActive,
          expired: isExpired
        };
        normalized.remainingDays = getProRemainingDays(normalized, now);
        return normalized;
      }
    }
  } catch {}
  return {
    active: false,
    expired: false,
    planId: null,
    durationDays: 0,
    remainingDays: 0,
    expiresAt: null,
    gateway: 'Mercado Pago'
  };
}

export function isUserPro(uid = null, email = null, now = Date.now()) {
  if (isUserAdminGrantedPro(uid, email, now)) return true;
  return canUseProSocialFeature(getProSubscription(uid, email, now), now);
}

export function setProSubscription(active, planId = 'annual', customNow = Date.now(), options = {}) {
  const plan = PRO_PLANS[planId] || PRO_PLANS.annual;
  const planDurationDays = plan.durationDays || (plan.id === 'annual' ? 365 : 30);
  const activatedAt = Number.isFinite(customNow) ? customNow : Date.now();
  const user = (typeof auth !== 'undefined' && auth?.currentUser) || adminContext.currentUser || null;
  const targetUid = user?.uid || 'local-current-user';
  const targetEmail = String(user?.email || '').trim().toLowerCase();

  let durationDays = planDurationDays;
  let expiresAt = active ? activatedAt + planDurationDays * 86400000 : activatedAt;
  let stackedFrom = null;
  let effectivePlanId = plan.id;
  let effectivePlanName = plan.name;

  // Se o usuário já possui um plano PRO pago ativo (ex: Mensal 30 dias) e faz upgrade para Anual (365 dias),
  // acumula os dias restantes (ex: 30 + 365 = 395 dias -> 1 ano + 1 mês)
  if (active && options.stack !== false) {
    const existingSub = getProSubscription(targetUid, targetEmail, activatedAt);
    if (existingSub && existingSub.active === true && !existingSub.isFreeGrant && existingSub.expiresAt > activatedAt) {
      const prevRemDays = getProRemainingDays(existingSub, activatedAt);
      const prevRemMs = Math.max(0, existingSub.expiresAt - activatedAt);
      durationDays = prevRemDays + planDurationDays;
      expiresAt = activatedAt + prevRemMs + planDurationDays * 86400000;
      stackedFrom = existingSub.planId;
      if (existingSub.planId === 'annual' || plan.id === 'annual') {
        effectivePlanId = 'annual';
        effectivePlanName = durationDays >= 390
          ? 'Anual + Mensal Acumulado (1 ano + 1 mês)'
          : PRO_PLANS.annual.name;
      }
    }
  }

  const sub = {
    uid: targetUid,
    email: targetEmail,
    active: Boolean(active),
    expired: !active,
    planId: effectivePlanId,
    planName: effectivePlanName,
    stackedFrom,
    durationDays,
    priceMonthly: plan.priceMonthly,
    billingTotal: plan.billingTotal,
    activatedAt,
    expiresAt,
    paymentId: options.paymentId || null,
    gateway: 'Mercado Pago'
  };
  sub.remainingDays = getProRemainingDays(sub, activatedAt);

  try {
    localStorage.setItem(STORAGE_PRO_KEY, JSON.stringify(sub));

    // Also update local & cloud extendedProfiles and vipGrants with exact expiration timestamp & days
    const rawVip = loadRawAdminVipGrantsMap();
    rawVip[targetUid] = {
      ...(rawVip[targetUid] || {}),
      key: targetUid,
      uid: targetUid,
      email: targetEmail,
      displayName: user?.displayName || rawVip[targetUid]?.displayName || 'Assinante PRO',
      active: Boolean(active),
      revokedAt: active ? null : Date.now(),
      planId: effectivePlanId,
      planName: effectivePlanName,
      stackedFrom,
      durationDays,
      grantedAt: activatedAt,
      activatedAt,
      expiresAt,
      paymentId: options.paymentId || null,
      isPaidSubscription: true,
      reason: 'Mercado Pago'
    };
    localStorage.setItem(STORAGE_ADMIN_VIP_KEY, JSON.stringify(rawVip));

    const extMap = loadFisherExtendedProfiles();
    extMap[targetUid] = {
      ...(extMap[targetUid] || {}),
      isPro: Boolean(active),
      proPlan: effectivePlanId,
      proDurationDays: durationDays,
      proActivatedAt: activatedAt,
      proExpiresAt: expiresAt
    };
    localStorage.setItem(STORAGE_FISHER_PROFILES_KEY, JSON.stringify(extMap));

    if (typeof window !== 'undefined' && user?.uid) {
      update(ref(database, `mareCerta/extendedProfiles/${user.uid}`), {
        isPro: Boolean(active),
        proPlan: effectivePlanId,
        proDurationDays: durationDays,
        proActivatedAt: activatedAt,
        proExpiresAt: expiresAt
      }).catch(() => {});
      update(ref(database, `mareCerta/vipGrants/${user.uid}`), {
        uid: user.uid,
        email: targetEmail,
        active: Boolean(active),
        revokedAt: active ? null : Date.now(),
        planId: effectivePlanId,
        planName: effectivePlanName,
        stackedFrom,
        durationDays,
        grantedAt: activatedAt,
        activatedAt,
        expiresAt,
        paymentId: options.paymentId || null,
        isPaidSubscription: true,
        reason: 'Mercado Pago'
      }).catch(() => {});
    }
  } catch {}
  updateProStatusUI();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mare-certa:pro-changed', { detail: sub }));
  }
  return sub;
}

export function getPendingTrophyPhoto() {
  return pendingTrophyPhoto;
}

export function isPendingTrophyPhotoRemoved() {
  return pendingTrophyPhotoRemoved;
}

export function setPendingTrophyPhotoRemoved(val) {
  pendingTrophyPhotoRemoved = Boolean(val);
}

export function clearPendingTrophyPhoto() {
  pendingTrophyPhoto = null;
  const input = $('capturePhotoInput');
  if (input) input.value = '';
  const previewWrap = $('capturePhotoPreviewWrap');
  if (previewWrap) previewWrap.hidden = true;
  const previewImg = $('capturePhotoPreviewImg');
  if (previewImg) previewImg.src = '';
  const statusEl = $('capturePhotoStatus');
  if (statusEl) {
    statusEl.textContent = 'Compartilhe a foto da sua pescaria com a comunidade';
    statusEl.className = 'photo-compression-status';
  }
}

export function removeLocalS3Photo(captureId) {
  if (!captureId) return;
  try {
    const map = loadLocalS3Photos();
    if (map[captureId]) {
      delete map[captureId];
      localStorage.setItem(STORAGE_PHOTOS_KEY, JSON.stringify(map));
    }
  } catch {}
}

export function setupCaptureEditPhoto(id, capture) {
  pendingTrophyPhoto = null;
  pendingTrophyPhotoRemoved = false;
  const localPhotos = loadLocalS3Photos();
  const existingPhoto = capture?.photoUrl || localPhotos[id]?.dataUrl || null;
  const previewWrap = $('capturePhotoPreviewWrap');
  const previewImg = $('capturePhotoPreviewImg');
  const statusEl = $('capturePhotoStatus');
  const removePhotoBtn = $('removeCapturePhotoBtn');

  if (existingPhoto) {
    if (previewImg) previewImg.src = existingPhoto;
    if (previewWrap) previewWrap.hidden = false;
    if (removePhotoBtn) {
      removePhotoBtn.textContent = '🗑️ Apagar foto da captura';
    }
    if (statusEl) {
      statusEl.textContent = '📸 Foto atual do troféu. Para remover, clique em "Apagar foto" abaixo.';
      statusEl.className = 'photo-compression-status is-existing-photo';
    }
  } else {
    if (previewWrap) previewWrap.hidden = true;
    if (removePhotoBtn) {
      removePhotoBtn.textContent = 'Remover foto';
    }
    if (statusEl) {
      statusEl.textContent = 'Esta publicação não possui foto. Você pode adicionar uma foto se desejar.';
      statusEl.className = 'photo-compression-status';
    }
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

/* ============================================================
   CROPPER & ZOOM DE FOTOS (PERFIL E TROFÉUS DA COMUNIDADE)
   ============================================================ */

let cropperState = {
  active: false,
  img: null,
  imgSrc: null,
  shape: 'circle', // 'circle' | 'rect'
  ratioMode: 'post', // 'post' (16:10 encaixe perfeito no feed) | '1:1' | 'original'
  ratio: 16 / 10,
  scale: 1,
  rotation: 0,
  translateX: 0,
  translateY: 0,
  baseScale: 1,
  baseDisplayW: 300,
  baseDisplayH: 300,
  maskW: 320,
  maskH: 200,
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  touchStartDist: 0,
  initialScale: 1,
  onCropComplete: null,
  onCancel: null
};

export function updateCropperTransform() {
  const imgEl = $('cropperImg');
  const zoomVal = $('cropperZoomValue');
  const zoomSlider = $('cropperZoomRange');
  if (!imgEl) return;

  imgEl.style.transform = `translate(${cropperState.translateX}px, ${cropperState.translateY}px) rotate(${cropperState.rotation}deg) scale(${cropperState.scale})`;
  if (zoomVal) zoomVal.textContent = `${cropperState.scale.toFixed(1)}x`;
  if (zoomSlider && Math.abs(Number(zoomSlider.value) - cropperState.scale) > 0.03) {
    zoomSlider.value = String(cropperState.scale);
  }
}

export function updateCropperMaskAndImageDimensions() {
  const viewport = $('cropperViewport');
  const mask = $('cropperMask');
  const imgEl = $('cropperImg');
  if (!viewport || !mask || !cropperState.img) return;

  const viewportRect = typeof viewport.getBoundingClientRect === 'function' ? viewport.getBoundingClientRect() : { width: 360, height: 360 };
  const vW = Math.max(260, viewportRect.width || 360);
  const vH = Math.max(260, viewportRect.height || 360);

  const imgW = cropperState.img.naturalWidth || cropperState.img.width || 1;
  const imgH = cropperState.img.naturalHeight || cropperState.img.height || 1;
  const naturalRatio = imgW / imgH;

  let targetRatio;
  if (cropperState.shape === 'circle') {
    targetRatio = 1;
  } else if (cropperState.ratioMode === 'post' || cropperState.ratioMode === '16:10') {
    // Proporção 16:10 idêntica ao card de publicação no feed (.social-trophy-figure)
    targetRatio = 16 / 10;
  } else if (cropperState.ratioMode === '1:1') {
    targetRatio = 1;
  } else if (cropperState.ratioMode === 'original') {
    targetRatio = naturalRatio;
  } else {
    targetRatio = 16 / 10;
  }

  cropperState.ratio = targetRatio;

  // Tamanho máximo permitido para a máscara dentro do viewport (com respiro de 16px)
  const maxMaskW = Math.max(160, vW - 16);
  const maxMaskH = Math.max(160, vH - 16);

  let maskW, maskH;
  if (cropperState.shape === 'circle') {
    const d = Math.min(maxMaskW, maxMaskH, 280);
    maskW = d;
    maskH = d;
  } else {
    if (targetRatio >= maxMaskW / maxMaskH) {
      maskW = maxMaskW;
      maskH = Math.max(100, Math.round(maxMaskW / targetRatio));
    } else {
      maskH = maxMaskH;
      maskW = Math.max(100, Math.round(maxMaskH * targetRatio));
    }
  }

  cropperState.maskW = maskW;
  cropperState.maskH = maskH;

  mask.style.width = `${maskW}px`;
  mask.style.height = `${maskH}px`;
  mask.style.left = `calc(50% - ${maskW / 2}px)`;
  mask.style.top = `calc(50% - ${maskH / 2}px)`;
  mask.classList.toggle('is-circle', cropperState.shape === 'circle');
  mask.classList.toggle('is-rect', cropperState.shape === 'rect');
  mask.setAttribute('data-ratio', cropperState.ratioMode);

  // Escala base:
  // Para troféu (rect): encaixe proporcional para que 100% da foto caiba na máscara sem corte inicial!
  // Para perfil (circle): cover suave para preencher o avatar circular.
  let baseScale;
  if (cropperState.shape === 'circle') {
    baseScale = Math.max(maskW / imgW, maskH / imgH);
  } else {
    baseScale = Math.min(maskW / imgW, maskH / imgH);
  }

  cropperState.baseScale = baseScale;
  cropperState.baseDisplayW = imgW * baseScale;
  cropperState.baseDisplayH = imgH * baseScale;

  if (imgEl) {
    imgEl.style.width = `${cropperState.baseDisplayW}px`;
    imgEl.style.height = `${cropperState.baseDisplayH}px`;
    imgEl.style.marginLeft = `${-cropperState.baseDisplayW / 2}px`;
    imgEl.style.marginTop = `${-cropperState.baseDisplayH / 2}px`;
  }

  updateCropperTransform();
}

export function executeCropAndExport() {
  if (!cropperState.img) return null;
  const viewport = $('cropperViewport');
  const mask = $('cropperMask');
  if (!viewport || !mask) return null;

  const maskRect = typeof mask.getBoundingClientRect === 'function' ? mask.getBoundingClientRect() : null;
  const cropW = Math.max(80, cropperState.maskW || maskRect?.width || 320);
  const cropH = Math.max(80, cropperState.maskH || maskRect?.height || 200);

  const isCircle = cropperState.shape === 'circle';
  let outputW, outputH;
  if (isCircle) {
    outputW = 500;
    outputH = 500;
  } else if (cropperState.ratioMode === '1:1') {
    outputW = 1080;
    outputH = 1080;
  } else {
    // 16:10 Encaixe Perfeito no Post (1200 x 750 px)
    outputW = 1200;
    outputH = Math.round(1200 / (cropW / cropH || (16 / 10)));
  }

  const canvas = document.createElement('canvas');
  canvas.width = outputW;
  canvas.height = outputH;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const factor = outputW / cropW;

  ctx.save();
  // Alinhamento rigoroso com o CSS transform: translate(tx, ty) rotate(deg) scale(s)
  // 1. Centraliza a origem no centro do canvas de corte
  ctx.translate(outputW / 2, outputH / 2);
  // 2. Aplica o deslocamento visual do arrasto mantendo a escala de tela
  ctx.translate(cropperState.translateX * factor, cropperState.translateY * factor);
  // 3. Aplica a rotação sobre o centro da imagem
  ctx.rotate((cropperState.rotation * Math.PI) / 180);
  // 4. Aplica o zoom sem afetar a posição do centro deslocado
  ctx.scale(cropperState.scale, cropperState.scale);

  const drawW = (cropperState.baseDisplayW || cropW) * factor;
  const drawH = (cropperState.baseDisplayH || cropH) * factor;
  ctx.drawImage(cropperState.img, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();

  // Para avatar circular (foto de perfil), aplica recorte circular perfeito nos cantos
  if (isCircle) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.arc(outputW / 2, outputH / 2, outputW / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  let dataUrl = isCircle ? canvas.toDataURL('image/png') : canvas.toDataURL('image/webp', 0.88);
  if (!dataUrl.startsWith('data:image/')) {
    dataUrl = canvas.toDataURL('image/jpeg', 0.88);
  }

  return {
    dataUrl,
    width: outputW,
    height: outputH,
    shape: cropperState.shape,
    ratio: cropperState.ratio,
    ratioMode: cropperState.ratioMode
  };
}

export function openImageCropper({
  file = null,
  imageSrc = null,
  shape = 'circle',
  title = 'Ajustar Foto',
  subtitle = 'Arraste a foto e use o zoom para centralizar o enquadramento.',
  onCropComplete = null,
  onCancel = null
} = {}) {
  const dialog = $('imageCropperDialog');
  const imgEl = $('cropperImg');
  const titleEl = $('cropperTitle');
  const subEl = $('cropperSubtitle');
  const maskEl = $('cropperMask');
  const ratioGroup = $('cropperRatioOptions');
  const zoomSlider = $('cropperZoomRange');

  if (!dialog || !imgEl) return;

  if (titleEl) titleEl.textContent = title;
  if (subEl) subEl.textContent = subtitle;

  cropperState.shape = shape;
  cropperState.ratioMode = shape === 'circle' ? '1:1' : 'post';
  cropperState.scale = 1;
  cropperState.rotation = 0;
  cropperState.translateX = 0;
  cropperState.translateY = 0;
  cropperState.isDragging = false;
  cropperState.onCropComplete = onCropComplete;
  cropperState.onCancel = onCancel;
  cropperState.active = true;
  cropperState.active = true;

  if (maskEl) {
    maskEl.classList.toggle('is-circle', shape === 'circle');
    maskEl.classList.toggle('is-rect', shape === 'rect');
    maskEl.setAttribute('data-ratio', cropperState.ratioMode);
  }

  if (ratioGroup) {
    ratioGroup.hidden = shape === 'circle';
    ratioGroup.querySelectorAll('[data-cropper-ratio]').forEach(btn => {
      const active = btn.dataset.cropperRatio === cropperState.ratioMode;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  }

  if (zoomSlider) {
    zoomSlider.value = '1';
    zoomSlider.min = '0.7';
    zoomSlider.max = '3.5';
  }

  const applySource = src => {
    cropperState.imgSrc = src;
    const testImg = new Image();
    testImg.onload = () => {
      cropperState.img = testImg;
      imgEl.src = src;
      updateCropperMaskAndImageDimensions();
      if (typeof dialog.showModal === 'function') {
        try { dialog.showModal(); } catch { dialog.hidden = false; }
      } else {
        dialog.hidden = false;
      }
      setTimeout(() => {
        updateCropperMaskAndImageDimensions();
      }, 35);
    };
    testImg.src = src;
  };

  if (file) {
    const reader = new FileReader();
    reader.onload = e => applySource(e.target.result);
    reader.readAsDataURL(file);
  } else if (imageSrc) {
    applySource(imageSrc);
  }
}

let cropperListenersInitialized = false;
export function setupImageCropperListeners() {
  if (typeof document === 'undefined' || cropperListenersInitialized) return;
  cropperListenersInitialized = true;

  const dialog = $('imageCropperDialog');
  const viewport = $('cropperViewport');
  const mask = $('cropperMask');
  const closeBtn = $('closeImageCropperBtn');
  const cancelBtn = $('cropperCancelBtn');
  const applyBtn = $('cropperApplyBtn');
  const zoomSlider = $('cropperZoomRange');
  const zoomInBtn = $('cropperZoomInBtn');
  const zoomOutBtn = $('cropperZoomOutBtn');
  const rotateBtn = $('cropperRotateBtn');
  const resetBtn = $('cropperResetBtn');

  if (!dialog || !viewport) return;

  const closeDialog = () => {
    if (typeof dialog.close === 'function') {
      try { dialog.close(); } catch {}
    } else {
      dialog.hidden = true;
    }
  };

  if (closeBtn) closeBtn.addEventListener('click', () => { closeDialog(); cropperState.onCancel?.(); });
  if (cancelBtn) cancelBtn.addEventListener('click', () => { closeDialog(); cropperState.onCancel?.(); });

  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      const result = executeCropAndExport();
      closeDialog();
      if (result && cropperState.onCropComplete) {
        cropperState.onCropComplete(result);
      }
    });
  }

  // Zoom controls
  if (zoomSlider) {
    zoomSlider.addEventListener('input', () => {
      cropperState.scale = Number(zoomSlider.value);
      updateCropperTransform();
    });
  }
  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => {
      cropperState.scale = Math.min(3.5, Number((cropperState.scale + 0.15).toFixed(2)));
      updateCropperTransform();
    });
  }
  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => {
      cropperState.scale = Math.max(0.7, Number((cropperState.scale - 0.15).toFixed(2)));
      updateCropperTransform();
    });
  }
  if (rotateBtn) {
    rotateBtn.addEventListener('click', () => {
      cropperState.rotation = (cropperState.rotation + 90) % 360;
      updateCropperTransform();
    });
  }
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      cropperState.scale = 1;
      cropperState.rotation = 0;
      cropperState.translateX = 0;
      cropperState.translateY = 0;
      updateCropperMaskAndImageDimensions();
    });
  }

  // Ratio buttons
  document.querySelectorAll('[data-cropper-ratio]').forEach(btn => {
    btn.addEventListener('click', () => {
      const ratioStr = btn.dataset.cropperRatio;
      document.querySelectorAll('[data-cropper-ratio]').forEach(b => {
        const isCurrent = b === btn;
        b.classList.toggle('active', isCurrent);
        b.setAttribute('aria-pressed', String(isCurrent));
      });
      cropperState.ratioMode = ratioStr;
      cropperState.scale = 1;
      cropperState.translateX = 0;
      cropperState.translateY = 0;
      updateCropperMaskAndImageDimensions();
    });
  });

  // Mouse Drag
  viewport.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    cropperState.isDragging = true;
    cropperState.dragStartX = e.clientX - cropperState.translateX;
    cropperState.dragStartY = e.clientY - cropperState.translateY;
    viewport.classList.add('is-dragging');
  });

  window.addEventListener('mousemove', e => {
    if (!cropperState.isDragging) return;
    cropperState.translateX = e.clientX - cropperState.dragStartX;
    cropperState.translateY = e.clientY - cropperState.dragStartY;
    updateCropperTransform();
  });

  window.addEventListener('mouseup', () => {
    if (cropperState.isDragging) {
      cropperState.isDragging = false;
      viewport.classList.remove('is-dragging');
    }
  });

  // Wheel Zoom
  viewport.addEventListener('wheel', e => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    cropperState.scale = Math.min(3.5, Math.max(0.7, Number((cropperState.scale + delta).toFixed(2))));
    updateCropperTransform();
  }, { passive: false });

  // Touch Drag & Pinch-to-zoom
  viewport.addEventListener('touchstart', e => {
    if (e.touches.length === 1) {
      cropperState.isDragging = true;
      cropperState.dragStartX = e.touches[0].clientX - cropperState.translateX;
      cropperState.dragStartY = e.touches[0].clientY - cropperState.translateY;
      viewport.classList.add('is-dragging');
    } else if (e.touches.length === 2) {
      cropperState.isDragging = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      cropperState.touchStartDist = Math.hypot(dx, dy);
      cropperState.initialScale = cropperState.scale;
    }
  }, { passive: true });

  viewport.addEventListener('touchmove', e => {
    if (e.touches.length === 1 && cropperState.isDragging) {
      cropperState.translateX = e.touches[0].clientX - cropperState.dragStartX;
      cropperState.translateY = e.touches[0].clientY - cropperState.dragStartY;
      updateCropperTransform();
    } else if (e.touches.length === 2 && cropperState.touchStartDist > 0) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const factor = dist / cropperState.touchStartDist;
      cropperState.scale = Math.min(3.5, Math.max(0.7, Number((cropperState.initialScale * factor).toFixed(2))));
      updateCropperTransform();
    }
  }, { passive: true });

  viewport.addEventListener('touchend', () => {
    cropperState.isDragging = false;
    cropperState.touchStartDist = 0;
    viewport.classList.remove('is-dragging');
  });
}

/* ============================================================
   PÓDIO TOP 3 COM FOTOS EM CÍRCULO E BORDAS DE MEDALHAS
   ============================================================ */

export function renderRankingPodium(ranking = [], profiles = {}, captures = {}, currentUid = null) {
  const podiumEl = $('rankingTopPodium');
  if (!podiumEl) return;

  const validRanking = Array.isArray(ranking) ? ranking.filter(r => r && r.rank <= 3) : [];
  if (!validRanking.length) {
    podiumEl.hidden = true;
    podiumEl.innerHTML = '';
    return;
  }

  podiumEl.hidden = false;

  const first = validRanking.find(r => r.rank === 1) || null;
  const second = validRanking.find(r => r.rank === 2) || null;
  const third = validRanking.find(r => r.rank === 3) || null;

  const renderCol = (person, place, medalEmoji, medalTitle, colorClass) => {
    if (!person) return `<div class="podium-col empty-col is-${colorClass}"></div>`;

    const uid = person.uid;
    const ext = getFisherExtendedProfile(uid, profiles?.[uid]);
    const name = (ext.displayName && ext.displayName !== 'Pescador Costeiro' ? ext.displayName : '')
      || (profiles?.[uid]?.displayName && profiles?.[uid]?.displayName !== 'Pescador Costeiro' ? profiles?.[uid]?.displayName : '')
      || person.name
      || person.fisherman
      || ext.displayName
      || profiles?.[uid]?.displayName
      || 'Pescador';
    const avatar = ext.avatarUrl || profiles?.[uid]?.avatarUrl || '';
    const initials = getInitials(name);
    const isProMember = isUserPro(uid, profiles?.[uid]?.email);
    const isCurrentUser = Boolean(currentUid && uid === currentUid);

    return `
      <article class="podium-col is-${colorClass}" data-podium-uid="${escapeHtml(uid)}" title="Ver perfil completo de ${escapeHtml(name)}">
        <div class="podium-avatar-wrap">
          ${place === 1 ? '<div class="podium-crown" aria-hidden="true">👑</div>' : ''}
          <div class="podium-avatar-ring is-${colorClass}">
            ${avatar
              ? `<img src="${escapeHtml(avatar)}" alt="${escapeHtml(name)}" class="podium-avatar-img" />`
              : `<span class="podium-avatar-fallback is-${colorClass}">${escapeHtml(initials)}</span>`
            }
          </div>
          <span class="podium-place-tag is-${colorClass}">${medalEmoji} ${place}º</span>
        </div>
        <div class="podium-details">
          <strong class="podium-name">${escapeHtml(name)}${isCurrentUser ? ' <small class="podium-you">(você)</small>' : ''}</strong>
          ${isProMember ? '<span class="pro-member-badge mini">👑 PRO</span>' : ''}
          <span class="podium-fish-badge is-${colorClass}">🐟 ${person.quantity} peixe(s)</span>
        </div>
        <div class="podium-pedestal is-${colorClass}">
          <span class="podium-pedestal-num">${place}</span>
          <span class="podium-pedestal-label">${medalTitle}</span>
        </div>
      </article>
    `;
  };

  podiumEl.innerHTML = `
    <div class="podium-container">
      <div class="podium-header">
        <span class="eyebrow">🏆 PÓDIO DOS CAMPEÕES DA COSTA</span>
        <h3>Top 3 Pescadores da Comunidade</h3>
      </div>
      <div class="podium-stages-row">
        ${renderCol(second, 2, '🥈', 'PRATA', 'silver')}
        ${renderCol(first, 1, '🥇', 'OURO', 'gold')}
        ${renderCol(third, 3, '🥉', 'BRONZE', 'bronze')}
      </div>
    </div>
  `;

  podiumEl.querySelectorAll('[data-podium-uid]').forEach(col => {
    col.addEventListener('click', () => {
      const uid = col.dataset.podiumUid;
      if (uid) openFisherProfileModal(uid, profiles, captures, currentUid);
    });
  });
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

export function syncProModalPlanCards(now = Date.now()) {
  const pro = isUserPro(null, null, now);
  const sub = getProSubscription(null, null, now);
  const rem = sub.remainingDays || getProRemainingDays(sub, now);

  const annualCard = typeof document !== 'undefined' ? document.querySelector('[data-pro-plan-select="annual"]') : null;
  const monthlyCard = typeof document !== 'undefined' ? document.querySelector('[data-pro-plan-select="monthly"]') : null;
  const summaryEl = $('mpSelectedPlanSummary');
  const checkoutBtn = $('mpCheckoutApproveBtn');
  const titleEl = $('proPaywallTitle');
  const reasonBanner = $('proPaywallReason');

  if (pro && sub.planId === 'monthly') {
    // Usuário já possui o Plano Mensal ativo -> bloqueia recompra do Mensal e seleciona o Anual somando 1 ano + 1 mês
    selectedPlanId = 'annual';
    if (monthlyCard) {
      monthlyCard.classList.remove('selected');
      monthlyCard.classList.add('is-active-current-plan');
      monthlyCard.setAttribute('aria-pressed', 'false');
      monthlyCard.disabled = true;
      const ribbon = monthlyCard.querySelector('.pro-plan-ribbon');
      if (ribbon) ribbon.textContent = `✓ SEU PLANO ATUAL (ATIVO · ${rem} DIAS)`;
    }
    if (annualCard) {
      annualCard.classList.add('selected');
      annualCard.classList.remove('is-active-current-plan');
      annualCard.setAttribute('aria-pressed', 'true');
      annualCard.disabled = false;
      const ribbon = annualCard.querySelector('.pro-plan-ribbon');
      if (ribbon) ribbon.textContent = `⚡ UPGRADE · SOMA 1 ANO + 1 MÊS (${rem + 365} DIAS)`;
    }
    if (titleEl) titleEl.textContent = '👑 Seu Plano Mensal está Ativo!';
    if (reasonBanner) {
      reasonBanner.textContent = `✅ Reconhecemos seu Plano Mensal ativo (${rem} dias restantes). Caso queira o PRO Anual agora, os períodos serão somados: 1 ano + 1 mês (${rem + 365} dias de PRO)!`;
    }
    if (summaryEl) {
      summaryEl.innerHTML = `👑 <strong>Plano Mensal reconhecido como ATIVO (${rem} dias).</strong><br>Ao adquirir o <strong>Plano Anual (R$ 99,90)</strong>, você soma +365 dias e fica com <strong>1 ano + 1 mês (${rem + 365} dias no total)</strong>!`;
    }
    if (checkoutBtn) checkoutBtn.hidden = false;
  } else if (pro) {
    // Usuário já possui Plano Anual (ou 1 ano + 1 mês / Cortesia) ativo
    const durationText = formatProDurationLabel(sub, now);
    if (annualCard) {
      annualCard.classList.add('selected', 'is-active-current-plan');
      annualCard.setAttribute('aria-pressed', 'true');
      const ribbon = annualCard.querySelector('.pro-plan-ribbon');
      if (ribbon) ribbon.textContent = `✓ SEU PLANO ATUAL (ATIVO · ${durationText.toUpperCase()})`;
    }
    if (monthlyCard) {
      monthlyCard.classList.remove('selected', 'is-active-current-plan');
      monthlyCard.setAttribute('aria-pressed', 'false');
      monthlyCard.disabled = true;
      const ribbon = monthlyCard.querySelector('.pro-plan-ribbon');
      if (ribbon) ribbon.textContent = 'JÁ COBERTO PELO SEU PLANO ANUAL';
    }
    if (titleEl) titleEl.textContent = '👑 Sua Conta já é Assinante PRO!';
    if (reasonBanner) {
      reasonBanner.textContent = `✅ Seu acesso Clube Pescador PRO está ativo (${durationText} restantes). Todos os recursos sociais e fotos já estão liberados!`;
    }
    if (summaryEl) {
      summaryEl.innerHTML = `✅ <strong>Assinatura PRO Ativa:</strong> ${escapeHtml(sub.planName || 'Anual')} · Tempo restante: <strong>${escapeHtml(durationText)}</strong>.`;
    }
    if (checkoutBtn) checkoutBtn.hidden = true;
  } else {
    // Usuário Gratuito (ou assinatura expirada)
    if (annualCard) {
      annualCard.classList.remove('is-active-current-plan');
      annualCard.disabled = false;
      annualCard.classList.toggle('selected', selectedPlanId === 'annual');
      annualCard.setAttribute('aria-pressed', String(selectedPlanId === 'annual'));
      const ribbon = annualCard.querySelector('.pro-plan-ribbon');
      if (ribbon) ribbon.textContent = 'MAIS ESCOLHIDO · 44% DE DESCONTO';
    }
    if (monthlyCard) {
      monthlyCard.classList.remove('is-active-current-plan');
      monthlyCard.disabled = false;
      monthlyCard.classList.toggle('selected', selectedPlanId === 'monthly');
      monthlyCard.setAttribute('aria-pressed', String(selectedPlanId === 'monthly'));
      const ribbon = monthlyCard.querySelector('.pro-plan-ribbon');
      if (ribbon) ribbon.textContent = 'SEM FIDELIDADE · 30 DIAS';
    }
    if (titleEl) titleEl.textContent = 'Faça parte da elite da pesca costeira.';
    if (summaryEl) {
      summaryEl.innerHTML = selectedPlanId === 'annual'
        ? 'Plano Anual selecionado: <strong>R$ 8,33/mês</strong> (R$ 99,90 por 365 dias via PIX ou Cartão em até 12x)'
        : 'Plano Mensal selecionado: <strong>R$ 14,90/mês</strong> (cobrança avulsa por 30 dias via PIX ou Cartão)';
    }
    if (checkoutBtn) checkoutBtn.hidden = false;
  }
}

export function openProPaywallModal(reason = 'social') {
  if (!auth.currentUser) {
    const accBtn = $('accountButton');
    if (accBtn) accBtn.click();
    const authMsg = $('authMessage');
    if (authMsg) {
      authMsg.textContent = 'Entre ou cadastre-se primeiro para assinar ou gerenciar o Clube Pescador PRO.';
      authMsg.className = 'form-message is-visible';
      authMsg.style.display = 'block';
    }
    return;
  }
  const dialog = $('proPaywallDialog');
  if (!dialog) return;
  const pro = isUserPro();
  const reasonBanner = $('proPaywallReason');
  if (reasonBanner && !pro) {
    const messages = {
      foto: '📸 Para publicar a foto do seu troféu e participar da nossa família de pescadores, ative o Clube PRO.',
      comentar: '💬 Para comentar, perguntar iscas e responder outros pescadores no feed, ative o Clube Pescador PRO.',
      seguir: '➕ Para seguir pescadores, receber alertas de capturas e montar sua rede, ative o Clube Pescador PRO.',
      feed_blur: '🔒 O plano gratuito permite visualizar até 3 publicações no Feed. Desbloqueie todas as fotos e troféus ilimitados com o Clube Pescador PRO.',
      social: '👑 Desbloqueie fotos de troféus, comentários no feed, seguidores e o selo Pescador PRO.'
    };
    reasonBanner.textContent = messages[reason] || messages.social;
  }
  syncProModalPlanCards();
  dialog.showModal();
}

function updateProStatusUI() {
  const pro = isUserPro();
  const sub = getProSubscription();

  const statusPill = $('proCurrentStatusPill');
  if (statusPill) {
    if (pro && sub.isFreeGrant) {
      statusPill.textContent = `👑 Membro PRO Cortesia (${sub.planName || 'Liberado pelo Admin · Sem Custo'})`;
    } else if (pro) {
      const durationText = formatProDurationLabel(sub);
      const planLabel = sub.planId === 'monthly'
        ? 'Plano Mensal Ativo'
        : sub.stackedFrom === 'monthly'
          ? 'Plano Anual + Mensal Ativo'
          : 'Plano Anual Ativo';
      statusPill.textContent = `👑 ${planLabel} · Restam ${durationText}`;
    } else if (sub.expired) {
      statusPill.textContent = '🔒 Assinatura Expirada · Conta Gratuita (Renove seu PRO)';
    } else {
      statusPill.textContent = '🔒 Conta Gratuita (Modo Leitura no Feed)';
    }
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
    if (pro && sub.planId === 'monthly') {
      const rem = sub.remainingDays || getProRemainingDays(sub);
      openModalBtn.textContent = `👑 PRO Mensal Ativo (${rem}d) · Upgrade Anual (+1 Ano)`;
      openModalBtn.disabled = false;
    } else if (pro) {
      const durationText = formatProDurationLabel(sub);
      openModalBtn.textContent = `👑 PRO Ativo (${durationText})`;
      openModalBtn.disabled = false;
    } else {
      openModalBtn.textContent = '⚡ Assinar PRO · R$ 8,33/mês';
      openModalBtn.disabled = false;
    }
  }

  const photoLockBadge = $('photoProLockBadge');
  if (photoLockBadge) {
    photoLockBadge.textContent = pro ? '👑 Foto Liberada · Membro PRO' : '🔒 Recurso da Família PRO';
    photoLockBadge.className = `photo-pro-badge ${pro ? 'unlocked' : 'locked'}`;
  }

  const heroProPill = $('heroProPill');
  if (heroProPill) {
    if (pro) {
      heroProPill.textContent = 'EDIÇÃO PRO';
      heroProPill.className = 'b-pro-pill is-pro';
      heroProPill.title = 'Acesso Clube Pescador PRO Ativo';
    } else {
      heroProPill.textContent = 'VERSÃO GRATUITA';
      heroProPill.className = 'b-pro-pill is-free';
      heroProPill.title = 'Modo Gratuito · Assine o Clube PRO para desbloquear';
    }
  }

  const myProBadge = $('myProfileProBadge');
  if (myProBadge) {
    if (pro) {
      myProBadge.textContent = '👑 PRO';
      myProBadge.className = 'pro-member-badge';
      myProBadge.title = 'Assinante Clube Pescador PRO';
    } else {
      myProBadge.textContent = '🔒 GRATUITO';
      myProBadge.className = 'free-member-badge';
      myProBadge.title = 'Conta Gratuita (Plano Padrão)';
    }
  }

  syncProModalPlanCards();
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
          ${isUserPro(fisherUid, baseProfile?.email) ? '<span class="pro-member-badge">👑 PRO</span>' : '<span class="free-member-badge">🔒 GRATUITO</span>'}
        </div>
        <div class="fisher-profile-loc-row">
          <p class="fisher-profile-loc">${ext.location ? `📍 ${escapeHtml(ext.location)}` : '📍 Litoral Brasileiro'}</p>
          ${ext.location ? `<button type="button" class="profile-loc-link-btn" data-public-forecast-loc="${escapeHtml(ext.location)}">🎣 Ver previsão de pesca</button>` : ''}
        </div>
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
               <figure class="profile-gallery-item" data-gallery-capture-id="${escapeHtml(item.id)}" role="button" tabindex="0" title="Ver captura no Ranking & capturas">
                 <img src="${item.src}" alt="${escapeHtml(item.title)}" loading="lazy" />
                 <figcaption>
                   <strong>${escapeHtml(item.title)}</strong>
                   <small>${escapeHtml(item.subtitle)}</small>
                   <span class="gallery-view-hint">🔍 Ver no Ranking</span>
                 </figcaption>
               </figure>
             `).join('')}
           </div>`
        : `<p class="empty-note">Nenhuma foto de troféu publicada ainda por este pescador.</p>`
      }
    </section>
  `;

  // Clique nos itens da galeria do perfil público fecha o modal e rola até a captura no Ranking
  body.querySelectorAll('.profile-gallery-item').forEach(fig => {
    const handleGalleryClick = () => {
      const cid = fig.getAttribute('data-gallery-capture-id');
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.hidden = true;
      const rankingTab = $('rankingTab');
      if (rankingTab) rankingTab.click();
      setTimeout(() => {
        const card = cid && (document.getElementById(`capture-card-${cid}`) || (typeof CSS !== 'undefined' && CSS.escape && document.querySelector(`[data-capture-id="${CSS.escape(cid)}"]`)));
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          card.classList.add('highlight-shared-capture');
          setTimeout(() => card.classList.remove('highlight-shared-capture'), 4500);
        } else {
          $('rankingPanel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 120);
    };
    fig.addEventListener('click', handleGalleryClick);
    fig.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleGalleryClick();
      }
    });
  });

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

  const publicForecastBtn = body.querySelector('[data-public-forecast-loc]');
  if (publicForecastBtn) {
    publicForecastBtn.addEventListener('click', () => {
      const locQuery = publicForecastBtn.dataset.publicForecastLoc;
      const target = resolveLocationByQuery(locQuery);
      if (target) {
        applyLocationToMainPage(target);
      }
      dialog.close();
      const forecastTab = $('forecastTab');
      if (forecastTab) forecastTab.click();
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
  const locLinkBtn = $('myProfileForecastLinkBtn');
  if (locBadge) {
    locBadge.textContent = ext.location ? `📍 ${ext.location}` : '📍 Adicione sua cidade ou praia favorita abaixo';
  }
  if (locLinkBtn) {
    if (ext.location) {
      locLinkBtn.hidden = false;
      const spotFirst = ext.location.split(/[·,]/)[0].trim();
      locLinkBtn.textContent = `🎣 Ver previsão em ${spotFirst}`;
      locLinkBtn.onclick = () => {
        const target = ext.preferredLocation || resolveLocationByQuery(ext.location);
        if (target) {
          applyLocationToMainPage(target);
        }
        const accountDialog = $('accountDialog');
        if (accountDialog) {
          accountDialog.hidden = true;
          accountDialog.classList.remove('is-open');
          try { accountDialog.close(); } catch {}
        }
        const forecastTab = $('forecastTab');
        if (forecastTab) forecastTab.click();
      };
    } else {
      locLinkBtn.hidden = true;
    }
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
        <figure class="profile-gallery-item" data-gallery-capture-id="${escapeHtml(item.id)}" data-is-extra="${item.isExtra ? 'true' : 'false'}" role="button" tabindex="0" title="Ver captura no Ranking &amp; capturas (Minhas capturas)">
          <img src="${item.src}" alt="${escapeHtml(item.title)}" loading="lazy" />
          <figcaption>
            <strong>${escapeHtml(item.title)}</strong>
            <small>${escapeHtml(item.subtitle)}</small>
            <span class="gallery-view-hint">🔍 Ver no Diário / Ranking</span>
            ${item.isExtra ? `<button type="button" class="gallery-delete-photo-btn" data-remove-extra-photo="${escapeHtml(item.id)}" title="Remover foto da galeria">🗑️ Remover</button>` : ''}
          </figcaption>
        </figure>
      `).join('');

      galleryGrid.querySelectorAll('[data-remove-extra-photo]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const pid = btn.dataset.removeExtraPhoto;
          const currentExt = getFisherExtendedProfile(uid, baseProfile);
          const updatedPhotos = (currentExt.extraTrophyPhotos || []).filter(p => p.id !== pid);
          saveFisherExtendedProfile(uid, { extraTrophyPhotos: updatedPhotos });
          renderMyAccountProfile(user, profiles, allCaptures);
        });
      });

      // Navegação da Galeria da Conta diretamente para Ranking & capturas -> Minhas capturas
      const navigateFromGalleryToRanking = (fig) => {
        const captureId = fig.getAttribute('data-gallery-capture-id');
        const accountDialog = $('accountDialog');
        if (accountDialog) {
          accountDialog.hidden = true;
          accountDialog.classList.remove('is-open');
          try { accountDialog.close(); } catch {}
        }
        const rankingTab = $('rankingTab');
        if (rankingTab) rankingTab.click();

        setTimeout(() => {
          const card = captureId && (document.getElementById(`capture-card-${captureId}`) ||
                       (typeof CSS !== 'undefined' && CSS.escape && document.querySelector(`[data-capture-id="${CSS.escape(captureId)}"]`)));
          const myCapturesSection = $('myCapturesSection');
          if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.classList.add('highlight-shared-capture');
            setTimeout(() => card.classList.remove('highlight-shared-capture'), 4500);
          } else if (myCapturesSection) {
            myCapturesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            myCapturesSection.classList.add('highlight-shared-capture');
            setTimeout(() => myCapturesSection.classList.remove('highlight-shared-capture'), 4500);
          } else {
            $('rankingPanel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 120);
      };

      galleryGrid.querySelectorAll('.profile-gallery-item').forEach(fig => {
        fig.addEventListener('click', (e) => {
          if (e.target.closest('[data-remove-extra-photo]')) return;
          navigateFromGalleryToRanking(fig);
        });
        fig.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            if (e.target.closest('[data-remove-extra-photo]')) return;
            e.preventDefault();
            navigateFromGalleryToRanking(fig);
          }
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

  const btnUseForecast = $('extUseForecastLocBtn');
  if (btnUseForecast) {
    btnUseForecast.onclick = () => {
      try {
        const curLoc = JSON.parse(localStorage.getItem('mare-certa-location') || 'null');
        if (curLoc?.name) {
          const locString = curLoc.admin1 ? `${curLoc.name} · ${curLoc.admin1}` : curLoc.name;
          if (extForm && extForm.elements.extLocation) {
            extForm.elements.extLocation.value = locString;
            if (extForm) extForm._selectedSpot = curLoc;
            extForm.elements.extLocation.focus();
          }
        }
      } catch {}
    };
  }

  const locInput = $('extLocationInput');
  const locDropdown = $('extLocationResults');
  if (locInput && locDropdown && !locInput._autocompleteInitialized) {
    locInput._autocompleteInitialized = true;
    setupLocationSearchAutocomplete(locInput, locDropdown, extForm);
  }
}

let locationSearchDebounceTimer = null;

export function setupLocationSearchAutocomplete(inputEl, dropdownEl, formEl) {
  if (!inputEl || !dropdownEl) return;

  const renderDropdownResults = (spots, query = '') => {
    if (!spots || !spots.length) {
      dropdownEl.innerHTML = `<p class="ext-loc-note">Nenhuma praia ou cidade encontrada para "${escapeHtml(query)}". Você pode continuar digitando seu local livremente.</p>`;
      dropdownEl.hidden = false;
      return;
    }

    dropdownEl.innerHTML = spots.map((spot, idx) => `
      <div class="ext-loc-result-item" data-loc-index="${idx}" role="option" tabindex="0">
        <span class="loc-pin-icon" aria-hidden="true">⚓</span>
        <div class="loc-text-col">
          <strong>${escapeHtml(spot.name)}</strong>
          <small>${escapeHtml(spot.admin1 || spot.country_code || 'Brasil')}</small>
        </div>
      </div>
    `).join('');
    dropdownEl.hidden = false;

    dropdownEl.querySelectorAll('.ext-loc-result-item').forEach(item => {
      const selectThis = () => {
        const chosen = spots[Number(item.dataset.locIndex)];
        if (chosen) {
          const locString = chosen.admin1 ? `${chosen.name} · ${chosen.admin1}` : chosen.name;
          inputEl.value = locString;
          if (formEl) {
            formEl._selectedSpot = chosen;
          }
          dropdownEl.hidden = true;
          inputEl.dispatchEvent(new Event('input', { bubbles: true }));
          inputEl.focus();
        }
      };
      item.addEventListener('click', selectThis);
      item.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectThis();
        }
      });
    });
  };

  inputEl.addEventListener('input', () => {
    clearTimeout(locationSearchDebounceTimer);
    const val = inputEl.value.trim();
    if (val.length < 2) {
      dropdownEl.hidden = true;
      return;
    }
    locationSearchDebounceTimer = setTimeout(async () => {
      try {
        const spots = await searchCoastalLocations(val);
        renderDropdownResults(spots, val);
      } catch {
        dropdownEl.hidden = true;
      }
    }, 220);
  });

  inputEl.addEventListener('focus', async () => {
    const val = inputEl.value.trim();
    if (val.length >= 2) {
      const spots = await searchCoastalLocations(val);
      renderDropdownResults(spots, val);
    } else if (!val) {
      renderDropdownResults(PRESET_SPOTS.slice(0, 6), '');
    }
  });

  document.addEventListener('click', event => {
    if (!inputEl.contains(event.target) && !dropdownEl.contains(event.target)) {
      dropdownEl.hidden = true;
    }
  });
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
  card.id = `capture-card-${id}`;
  card.setAttribute('data-capture-id', String(id));
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
          ${isUserPro(fisherUid, profiles?.[fisherUid]?.email) ? '<span class="pro-member-badge" title="Assinante Clube Pescador PRO">👑 PRO</span>' : '<span class="free-member-badge" title="Conta Gratuita">🔒 GRATUITO</span>'}
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
      <input type="text" name="commentText" maxlength="280" placeholder="${isUserPro() ? 'Pergunte a isca, praia ou dê os parabéns…' : '🔒 Assine o Clube PRO (R$ 8,33/mês) para comentar e responder…'}" autocomplete="off" />
      <button type="submit" class="social-send-btn">${isUserPro() ? 'Responder' : '👑 Liberar Chat'}</button>
    </form>
    <p class="social-comment-error" role="alert" hidden></p>
  `;

  const commentsListEl = commentsSection.querySelector('.social-comments-list');
  const commentForm = commentsSection.querySelector('.social-comment-form');
  const commentErrorEl = commentsSection.querySelector('.social-comment-error');
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
            <button type="button" class="social-report-comment-btn" data-report-post-id="${escapeHtml(id)}" data-report-comment-id="${escapeHtml(c.id)}" data-report-comment-text="${escapeHtml(c.text)}" data-report-offender="${escapeHtml(c.author)}" data-report-offender-uid="${escapeHtml(c.authorUid || '')}" title="Denunciar este comentário ao administrador">🚩 Denunciar</button>
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

    commentsListEl.querySelectorAll('.social-report-comment-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        openReportCommentDialog({
          postId: btn.dataset.reportPostId,
          commentId: btn.dataset.reportCommentId,
          commentText: btn.dataset.reportCommentText,
          offenderUid: btn.dataset.reportOffenderUid,
          offenderName: btn.dataset.reportOffender
        });
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

  // Comment toggle button focuses input or opens paywall and marks messages as read
  engagementBar.querySelector('.comment-toggle-btn').addEventListener('click', () => {
    markCaptureCommentsAsRead(id, currentUid, adminContext.currentUser?.email);
    if (!isUserPro()) {
      openProPaywallModal('comentar');
      return;
    }
    commentInput.focus();
  });

  commentInput.addEventListener('focus', () => {
    markCaptureCommentsAsRead(id, currentUid, adminContext.currentUser?.email);
    if (!isUserPro()) {
      commentInput.blur();
      openProPaywallModal('comentar');
    }
  });

  commentForm.addEventListener('submit', event => {
    event.preventDefault();
    if (commentErrorEl) commentErrorEl.hidden = true;
    const myMod = getUserModerationStatus(currentUid || 'local-current-user', adminContext.currentUser?.email || '');
    if (myMod.isRestricted) {
      if (commentErrorEl) {
        commentErrorEl.textContent = `🚫 ${myMod.message}`;
        commentErrorEl.hidden = false;
      }
      return;
    }
    if (!isUserPro()) {
      openProPaywallModal('comentar');
      return;
    }
    const text = String(commentInput.value || '').trim();
    if (text.length < 2) return;
    const modCheck = validateTextAgainstModeration(text, 'comentário');
    if (!modCheck.valid) {
      if (commentErrorEl) {
        commentErrorEl.textContent = `⚠️ ${modCheck.message}`;
        commentErrorEl.hidden = false;
      }
      return;
    }
    const state = loadSocialState();
    if (!Array.isArray(state.comments[id])) state.comments[id] = [];
    const extMe = currentUid ? getFisherExtendedProfile(currentUid, profiles?.[currentUid]) : null;
    const authorName = extMe?.displayName || profiles?.[currentUid]?.displayName || 'Você (Pescador PRO)';
    const commentObj = {
      id: `c-${Date.now()}`,
      author: authorName,
      authorUid: currentUid || 'me',
      isPro: true,
      time: 'agora mesmo',
      text
    };
    state.comments[id].push(commentObj);
    saveSocialState(state);
    commentInput.value = '';
    renderPostComments();
    updateNotificationBell();
    if (typeof window !== 'undefined') {
      try {
        push(ref(database, `mareCerta/comments/${id}`), commentObj).catch(() => {});
      } catch {}
    }
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

    photoInput.addEventListener('change', () => {
      const file = photoInput.files?.[0];
      if (!file) return;
      if (!isUserPro()) {
        photoInput.value = '';
        openProPaywallModal('foto');
        return;
      }
      if (statusEl) {
        statusEl.textContent = '✂️ Enquadre e ajuste o zoom do seu troféu…';
        statusEl.className = 'photo-compression-status is-working';
      }
      openImageCropper({
        file,
        shape: 'rect',
        title: 'Enquadrar Foto do seu Troféu',
        subtitle: 'Enquadramento 100% proporcional ao post. Posicione o peixe e seu troféu dentro da área.',
        onCropComplete: cropped => {
          pendingTrophyPhotoRemoved = false;
          pendingTrophyPhoto = {
            dataUrl: cropped.dataUrl,
            width: cropped.width,
            height: cropped.height,
            originalBytes: file.size || 1024,
            compressedBytes: Math.round((cropped.dataUrl.length * 3) / 4),
            summary: 'Foto recortada e otimizada',
            s3Key: `captures/${Date.now()}.webp`,
            mimeType: 'image/webp'
          };
          if (previewImg) previewImg.src = cropped.dataUrl;
          if (previewWrap) previewWrap.hidden = false;
          if (removePhotoBtn) removePhotoBtn.textContent = '🗑️ Apagar foto da captura';
          if (statusEl) {
            statusEl.textContent = '✓ Foto do troféu enquadrada e pronta para publicação!';
            statusEl.className = 'photo-compression-status is-success';
          }
        },
        onCancel: () => {
          photoInput.value = '';
          if (!pendingTrophyPhoto && statusEl) {
            statusEl.textContent = 'Seleção cancelada.';
            statusEl.className = 'photo-compression-status';
          }
        }
      });
    });
  }

  if (removePhotoBtn) {
    removePhotoBtn.addEventListener('click', () => {
      clearPendingTrophyPhoto();
      pendingTrophyPhotoRemoved = true;
      if (statusEl) {
        statusEl.textContent = '🗑️ Foto apagada. Clique em "Salvar alterações" para publicar sem foto.';
        statusEl.className = 'photo-compression-status is-photo-removed';
      }
    });
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

  const openAdminBtn = $('openAdminProBtn');
  if (openAdminBtn) {
    openAdminBtn.addEventListener('click', () => openAdminProModal());
  }

  const openAdminAccountBtn = $('openAdminFromAccountBtn');
  if (openAdminAccountBtn) {
    openAdminAccountBtn.addEventListener('click', () => {
      $('accountDialog')?.close();
      openAdminProModal();
    });
  }

  const closeAdminBtn = $('closeAdminProDialog');
  if (closeAdminBtn) {
    closeAdminBtn.addEventListener('click', () => $('adminProDialog')?.close());
  }

  const adminDoneBtn = $('adminProDoneBtn');
  if (adminDoneBtn) {
    adminDoneBtn.addEventListener('click', () => $('adminProDialog')?.close());
  }

  const adminSearchInput = $('adminUserSearchInput');
  if (adminSearchInput) {
    adminSearchInput.addEventListener('input', () => {
      adminContext.searchQuery = adminSearchInput.value.trim();
      renderAdminProPanel();
    });
  }

  document.querySelectorAll('[data-admin-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      adminContext.filterMode = btn.dataset.adminFilter || 'all';
      document.querySelectorAll('[data-admin-filter]').forEach(el => {
        const active = el.dataset.adminFilter === adminContext.filterMode;
        el.classList.toggle('is-active', active);
        el.setAttribute('aria-pressed', String(active));
      });
      renderAdminProPanel();
    });
  });

  const adminGrantMeBtn = $('adminGrantCurrentMeBtn');
  if (adminGrantMeBtn) {
    adminGrantMeBtn.addEventListener('click', () => {
      const user = adminContext.currentUser || (typeof auth !== 'undefined' && auth?.currentUser) || null;
      const uid = user?.uid || 'local-current-user';
      const email = user?.email || 'admin@marecerta.com.br';
      const displayName = user?.displayName || 'Minha Conta (Admin)';
      const alreadyPro = Boolean(isUserPro(uid, email));
      if (alreadyPro) {
        const confirmed = typeof window !== 'undefined' && typeof window.confirm === 'function'
          ? window.confirm('⚠️ SEGUNDA CONFIRMAÇÃO EXIGIDA:\n\nTem certeza que deseja colocar sua própria conta como GRATUITO?\n\nEssa ação revoga o status PRO imediatamente no site, no Firebase e no Mercado Pago.')
          : true;
        if (!confirmed) return;
        revokeFreeProFromUser(uid);
        if (email) revokeFreeProFromUser(email);
        try {
          localStorage.removeItem(STORAGE_PRO_KEY);
          localStorage.removeItem('mare-certa-pending-mp-checkout');
        } catch {}
        try {
          fetch('/api/mp/revoke_subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid, email })
          }).catch(() => {});
        } catch {}
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('mare-certa:pro-changed', { detail: { isPro: false } }));
        }
        updateProStatusUI();
      } else {
        grantFreeProToUser({
          uid,
          email,
          displayName,
          roleLabel: 'Admin / VIP Vitalício (Sem Custo)',
          grantedBy: 'Painel Admin'
        });
      }
      renderAdminProPanel();
    });
  }

  const adminForm = $('adminGrantByEmailForm');
  if (adminForm) {
    adminForm.addEventListener('submit', event => {
      event.preventDefault();
      const nameVal = String(adminForm.elements.vipName?.value || '').trim();
      const emailVal = String(adminForm.elements.vipEmail?.value || '').trim().toLowerCase();
      const roleVal = String(adminForm.elements.vipRole?.value || 'VIP Cortesia (Sem Custo)').trim();
      const durationVal = Number(adminForm.elements.vipDuration?.value || 365);
      if (!nameVal && !emailVal) return;

      grantFreeProToUser({
        uid: emailVal || `vip-${Date.now()}`,
        email: emailVal,
        displayName: nameVal || emailVal.split('@')[0] || 'Pescador Convidado',
        roleLabel: roleVal,
        grantedBy: 'Admin Master',
        durationDays: durationVal
      });

      adminForm.reset();
      const feedbackEl = $('adminGrantFeedback');
      if (feedbackEl) {
        feedbackEl.textContent = `✓ Acesso PRO Cortesia liberado gratuitamente para ${nameVal || emailVal}!`;
        feedbackEl.hidden = false;
        setTimeout(() => { feedbackEl.hidden = true; }, 4000);
      }
      renderAdminProPanel();
    });
  }

  const wordFilterForm = $('adminWordFilterForm');
  if (wordFilterForm) {
    wordFilterForm.addEventListener('submit', event => {
      event.preventDefault();
      const inputEl = wordFilterForm.elements.blockedWord;
      const val = String(inputEl?.value || '').trim().toLowerCase();
      if (!val || val.length < 2) return;
      addProhibitedWord(val);
      wordFilterForm.reset();
      const feedbackEl = $('adminWordFilterFeedback');
      if (feedbackEl) {
        feedbackEl.textContent = `✓ Termo "${val}" adicionado ao filtro de moderação!`;
        feedbackEl.hidden = false;
        setTimeout(() => { feedbackEl.hidden = true; }, 3500);
      }
      renderAdminProhibitedWordsList();
    });
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
      if (cardBtn.disabled || cardBtn.classList.contains('is-active-current-plan')) return;
      selectedPlanId = cardBtn.dataset.proPlanSelect || 'annual';
      syncProModalPlanCards();
    });
  });

  const checkoutBtn = $('mpCheckoutApproveBtn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', async () => {
      if (!auth.currentUser) {
        $('proPaywallDialog')?.close();
        $('accountButton')?.click();
        const authMsg = $('authMessage');
        if (authMsg) {
          authMsg.textContent = 'Entre ou cadastre-se primeiro para assinar o Clube Pescador PRO.';
          authMsg.className = 'form-message is-visible';
          authMsg.style.display = 'block';
        }
        return;
      }
      const plan = PRO_PLANS[selectedPlanId] || PRO_PLANS.annual;
      const user = auth.currentUser;
      const summaryEl = $('mpSelectedPlanSummary');

      if (summaryEl) {
        summaryEl.innerHTML = `⏳ <strong>Gerando cobrança oficial segura no Mercado Pago…</strong>`;
      }

      try {
        const res = await fetch('/api/mp/create_preference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: user?.uid || 'user-anon',
            email: user?.email || '',
            name: user?.displayName || 'Pescador PRO',
            planId: plan.id,
            returnUrl: window.location.origin + window.location.pathname
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.init_point) {
            try {
              localStorage.setItem('mare-certa-pending-mp-checkout', JSON.stringify({
                uid: user?.uid,
                email: user?.email,
                planId: plan.id,
                preferenceId: data.preference_id,
                timestamp: Date.now()
              }));
            } catch {}

            const liveUrl = data.init_point;

            window.open(liveUrl, '_blank');

            if (summaryEl) {
              summaryEl.innerHTML = `
                ⏳ <strong>Aguardando confirmação do pagamento no Mercado Pago…</strong><br>
                <small>Conclua seu PIX ou Cartão na aba oficial que abriu. Seu acesso PRO será ativado automaticamente aqui em tempo real assim que o Mercado Pago confirmar!</small>
              `;

              if (window._mpCheckPollTimer) clearInterval(window._mpCheckPollTimer);
              window._mpCheckPollTimer = setInterval(async () => {
                try {
                  const chkRes = await fetch(`/api/mp/check_subscription?uid=${encodeURIComponent(user?.uid || '')}&email=${encodeURIComponent(user?.email || '')}`);
                  if (!chkRes.ok) return;
                  const chkData = await chkRes.json();
                  if (chkData && chkData.active) {
                    clearInterval(window._mpCheckPollTimer);
                    setProSubscription(true, chkData.planId || plan.id, Date.now(), { paymentId: chkData.paymentId });
                    summaryEl.innerHTML = `🎉 <strong>Pagamento Aprovado pelo Mercado Pago!</strong> Seu Clube Pescador PRO já está ativo!`;
                    setTimeout(() => {
                      $('proPaywallDialog')?.close();
                    }, 1500);
                  }
                } catch {}
              }, 4000);
            }
            return;
          }
        }
      } catch (err) {
        console.warn('API Mercado Pago Local offline, usando fallback', err);
      }

      if (plan.paymentUrl) {
        try {
          localStorage.setItem('mare-certa-pending-mp-checkout', JSON.stringify({
            uid: auth.currentUser.uid,
            email: auth.currentUser.email || '',
            planId: plan.id,
            timestamp: Date.now()
          }));
        } catch {}
        window.open(plan.paymentUrl, '_blank');
        if (summaryEl) {
          summaryEl.innerHTML = `⏳ <strong>Aguardando pagamento no Mercado Pago…</strong><br><small>Conclua seu PIX ou Cartão na aba do Mercado Pago. Seu acesso PRO será ativado automaticamente assim que o Mercado Pago confirmar a aprovação da transação!</small>`;
        }
        return;
      }
    });
  }

  window.addEventListener('mare-certa:pro-changed', () => {
    const isPro = isUserPro();
    document.querySelectorAll('.social-comment-form input[name="commentText"]').forEach(input => {
      input.placeholder = isPro
        ? 'Pergunte a isca, praia ou dê os parabéns…'
        : '🔒 Assine o Clube PRO (R$ 8,33/mês) para comentar e responder…';
    });
    document.querySelectorAll('.social-comment-form .social-send-btn').forEach(btn => {
      btn.textContent = isPro ? 'Responder' : '👑 Liberar Chat';
    });
  });

  // Autocomplete do filtro de local no feed (estilo do perfil, sem interferência de autofill do Google)
  const filterLocInput = $('filterLocation');
  const filterLocDropdown = $('filterLocationResults');
  const filterForm = $('captureFilterForm');
  if (filterLocInput && filterLocDropdown && !filterLocInput._autocompleteInitialized) {
    filterLocInput._autocompleteInitialized = true;
    setupLocationSearchAutocomplete(filterLocInput, filterLocDropdown, filterForm);
  }

  // Diálogo de denúncia de comentários abusivos ao Administrador
  const reportDialog = $('reportCommentDialog');
  const closeReportBtn = $('closeReportCommentDialog');
  const cancelReportBtn = $('cancelReportBtn');
  const reportForm = $('reportCommentForm');

  const closeReport = () => {
    if (!reportDialog) return;
    if (typeof reportDialog.close === 'function') reportDialog.close();
    else reportDialog.hidden = true;
  };

  if (closeReportBtn) closeReportBtn.addEventListener('click', closeReport);
  if (cancelReportBtn) cancelReportBtn.addEventListener('click', closeReport);

  if (reportForm) {
    reportForm.addEventListener('submit', event => {
      event.preventDefault();
      const user = auth.currentUser;
      const reporterUid = user?.uid || 'anon';
      const reporterName = user?.displayName || user?.email?.split('@')[0] || 'Dono do Post';

      const postId = reportForm.elements.reportPostId?.value;
      const commentId = reportForm.elements.reportCommentId?.value;
      const offenderUid = reportForm.elements.reportOffenderUid?.value;
      const offenderName = reportForm.elements.reportOffenderName?.value;
      const reason = reportForm.elements.reportReason?.value;

      try {
        submitCommentReport({
          postId,
          commentId,
          offenderUid,
          offenderName,
          reporterUid,
          reporterName,
          reason
        });
        closeReport();
        if (typeof window !== 'undefined' && typeof window.alert === 'function') {
          window.alert('✓ Denúncia enviada com sucesso ao administrador. O comentário e o autor serão analisados.');
        }
      } catch (err) {
        if (typeof window !== 'undefined' && typeof window.alert === 'function') {
          window.alert(err.message || 'Erro ao enviar denúncia.');
        }
      }
    });
  }

  updateProStatusUI();
  setupNotificationBellListener();
  updateNotificationBell();
  initFirebaseRealtimeSync();
}

let firebaseSyncStarted = false;
export function initFirebaseRealtimeSync() {
  if (typeof window === 'undefined' || firebaseSyncStarted) return;
  firebaseSyncStarted = true;

  try {
    // 1. Sincroniza moderação e banimentos da nuvem
    onValue(ref(database, 'mareCerta/moderation/users'), snapshot => {
      const val = snapshot.val();
      if (val && typeof val === 'object') {
        const local = loadAdminModerationMap();
        const merged = { ...local, ...val };
        try { localStorage.setItem(STORAGE_ADMIN_MODERATION_KEY, JSON.stringify(merged)); } catch {}
        window.dispatchEvent(new CustomEvent('mare-certa:moderation-changed', { detail: merged }));
      }
    }, () => {});

    // 2. Sincroniza palavras bloqueadas da nuvem
    onValue(ref(database, 'mareCerta/moderation/prohibitedWords'), snapshot => {
      const val = snapshot.val();
      if (Array.isArray(val)) {
        try { localStorage.setItem(STORAGE_PROHIBITED_WORDS_KEY, JSON.stringify(val)); } catch {}
        renderAdminProhibitedWordsList();
      }
    }, () => {});

    // 3. Sincroniza cortesias VIP da nuvem
    onValue(ref(database, 'mareCerta/vipGrants'), snapshot => {
      const val = snapshot.val();
      if (val && typeof val === 'object') {
        const local = loadRawAdminVipGrantsMap();
        const merged = { ...local, ...val };
        // Limpa ativação de teste sem pagamento na conta russia33de4a@qr.kashre.com
        for (const [k, grant] of Object.entries(merged)) {
          const gEmail = String(grant?.email || '').trim().toLowerCase();
          if (
            (gEmail === 'russia33de4a@qr.kashre.com' || k.toLowerCase() === 'russia33de4a@qr.kashre.com' || (grant?.reason === 'Mercado Pago' && !grant?.paymentId)) &&
            grant?.active !== false &&
            grant?.reason === 'Mercado Pago' &&
            !grant?.paymentId
          ) {
            merged[k] = { ...grant, active: false, revokedAt: Date.now() };
            update(ref(database, `mareCerta/vipGrants/${k}`), { active: false, revokedAt: Date.now() }).catch(() => {});
            update(ref(database, `mareCerta/extendedProfiles/${k}`), { isPro: false }).catch(() => {});
          }
        }
        try { localStorage.setItem(STORAGE_ADMIN_VIP_KEY, JSON.stringify(merged)); } catch {}
        updateProStatusUI();
        window.dispatchEvent(new CustomEvent('mare-certa:pro-changed', { detail: getProSubscription() }));
        window.dispatchEvent(new CustomEvent('mare-certa:vip-grants-changed', { detail: merged }));
        renderAdminProPanel();
      }
    }, () => {});

    // Limpa assinatura local sem paymentId caso tenha sido ativada pelo botão de teste antigo
    try {
      const localSub = JSON.parse(localStorage.getItem(STORAGE_PRO_KEY) || 'null');
      const cleanupDone = localStorage.getItem('mare-certa-mp-fake-btn-cleaned-v1');
      if (!cleanupDone && localSub && localSub.active && !localSub.paymentId && !localSub.isFreeGrant) {
        localStorage.removeItem(STORAGE_PRO_KEY);
        localStorage.setItem('mare-certa-mp-fake-btn-cleaned-v1', '1');
        updateProStatusUI();
      }
    } catch {}

    // 4. Sincroniza perfis estendidos da nuvem
    onValue(ref(database, 'mareCerta/extendedProfiles'), snapshot => {
      const val = snapshot.val();
      if (val && typeof val === 'object') {
        const local = loadFisherExtendedProfiles();
        const merged = { ...local, ...val };
        try { localStorage.setItem(STORAGE_FISHER_PROFILES_KEY, JSON.stringify(merged)); } catch {}
        updateProStatusUI();
        window.dispatchEvent(new CustomEvent('mare-certa:pro-changed', { detail: getProSubscription() }));
        renderAdminProPanel();
      }
    }, () => {});

    // 5. Sincroniza perfis cadastrados do Firebase Auth (mareCerta/profiles e profiles)
    const handleProfilesSnapshot = snapshot => {
      const val = snapshot.val();
      if (val && typeof val === 'object') {
        adminContext.profiles = { ...adminContext.profiles, ...val };
        renderAdminProPanel();
      }
    };
    onValue(ref(database, 'mareCerta/profiles'), handleProfilesSnapshot, () => {});
    onValue(ref(database, 'profiles'), handleProfilesSnapshot, () => {});

    // 6. Sincroniza capturas do Diário/Ranking da comunidade (mareCerta/captures e captures)
    const handleCapturesSnapshot = snapshot => {
      const val = snapshot.val();
      if (val && typeof val === 'object') {
        adminContext.captures = { ...adminContext.captures, ...val };
        renderAdminProPanel();
      }
    };
    onValue(ref(database, 'mareCerta/captures'), handleCapturesSnapshot, () => {});
    onValue(ref(database, 'captures'), handleCapturesSnapshot, () => {});

    // 7. Sincroniza comentários sociais da nuvem
    onValue(ref(database, 'mareCerta/comments'), snapshot => {
      const val = snapshot.val();
      if (val && typeof val === 'object') {
        const state = loadSocialState();
        for (const [capId, commentsNode] of Object.entries(val)) {
          if (!commentsNode || typeof commentsNode !== 'object') continue;
          const remoteList = Object.entries(commentsNode).map(([k, c]) => ({ ...c, firebaseKey: k }));
          const existing = state.comments[capId] || [];
          const mapById = new Map();
          for (const item of [...existing, ...remoteList]) {
            if (item?.id) mapById.set(item.id, item);
          }
          state.comments[capId] = Array.from(mapById.values());
        }
        saveSocialState(state);
      }
    }, () => {});

    // 8. Sincroniza denúncias de moderação da nuvem
    onValue(ref(database, 'mareCerta/moderation/reports'), snapshot => {
      const val = snapshot.val();
      if (val && typeof val === 'object') {
        const local = loadAdminReportsMap();
        const merged = { ...local, ...val };
        try { localStorage.setItem(STORAGE_ADMIN_REPORTS_KEY, JSON.stringify(merged)); } catch {}
        renderAdminReportsList();
      }
    }, () => {});
    // 5. Verifica se o usuário retornou de um checkout aprovado do Mercado Pago (com status=approved + payment_id oficial)
    try {
      if (typeof window !== 'undefined' && window.location?.search) {
        const params = new URLSearchParams(window.location.search);
        const status = params.get('status') || params.get('collection_status');
        const paymentId = params.get('payment_id') || params.get('collection_id') || params.get('preference_id');
        if (status === 'approved' && paymentId) {
          const pendingRaw = localStorage.getItem('mare-certa-pending-mp-checkout');
          let planId = params.get('plan') || 'annual';
          try {
            if (pendingRaw) {
              const pendingData = JSON.parse(pendingRaw);
              if (pendingData?.planId) planId = pendingData.planId;
            }
          } catch {}
          setProSubscription(true, planId, Date.now(), { paymentId });
          localStorage.removeItem('mare-certa-pending-mp-checkout');
          setTimeout(() => {
            alert('🎉 Pagamento aprovado no Mercado Pago! Bem-vindo ao Clube Pescador PRO!');
          }, 350);
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
    } catch {}

    // 6. Verifica com o backend se há pagamento aprovado ou revogado para a conta do usuário
    try {
      if (typeof auth !== 'undefined' && auth) {
        import('firebase/auth').then(({ onAuthStateChanged }) => {
          onAuthStateChanged(auth, user => {
            if (!user?.uid) return;
            const uid = user.uid;
            const email = user.email || '';
            fetch(`/api/mp/check_subscription?uid=${encodeURIComponent(uid)}&email=${encodeURIComponent(email)}`)
              .then(r => r.ok ? r.json() : null)
              .then(data => {
                if (data && data.active && !isUserPro()) {
                  setProSubscription(true, data.planId || 'annual', Date.now(), { paymentId: data.paymentId });
                  console.log('👑 Assinatura PRO confirmada via backend Hostinger/Mercado Pago!');
                } else if (data && (data.revoked || data.active === false)) {
                  // Se o backend informa que a conta é gratuita ou foi revogada, remove qualquer cache divergente
                  const hasAdminGrant = isUserAdminGrantedPro(uid, email);
                  if (!hasAdminGrant) {
                    try {
                      localStorage.removeItem(STORAGE_PRO_KEY);
                      localStorage.removeItem('mare-certa-pending-mp-checkout');
                    } catch {}
                    updateProStatusUI();
                    window.dispatchEvent(new CustomEvent('mare-certa:pro-changed', { detail: getProSubscription() }));
                  }
                }
              })
              .catch(() => {});
          });
        }).catch(() => {});
      }
    } catch {}

    // 7. Sincroniza cortesias e planos salvos no backend local
    try {
      if (typeof fetch === 'function') {
        fetch('/api/mp/vip_grants')
          .then(r => r.ok ? r.json() : null)
          .then(backendSubs => {
            if (backendSubs && typeof backendSubs === 'object') {
              const local = loadRawAdminVipGrantsMap();
              let changed = false;
              for (const [k, sub] of Object.entries(backendSubs)) {
                if (!local[k]) {
                  local[k] = sub;
                  changed = true;
                } else if (sub.active === false && local[k].active !== false) {
                  local[k] = { ...local[k], ...sub, active: false };
                  changed = true;
                } else if (sub.revokedAt && (!local[k].revokedAt || sub.revokedAt >= local[k].revokedAt)) {
                  local[k] = { ...local[k], ...sub };
                  changed = true;
                } else if (sub.active === true && !local[k].active) {
                  local[k] = { ...local[k], ...sub };
                  changed = true;
                }
              }
              if (changed) {
                try { localStorage.setItem(STORAGE_ADMIN_VIP_KEY, JSON.stringify(local)); } catch {}
                updateProStatusUI();
                renderAdminProPanel();
              }
            }
          })
          .catch(() => {});
      }
    } catch {}
  } catch (err) {
    console.warn('Realtime database sync fallback', err);
  }
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

  const alertEl = $('shareStatusAlert');
  if (alertEl) {
    alertEl.hidden = true;
    alertEl.textContent = '';
  }

  dialog.showModal();
  await drawTrophyCanvas(canvas, capture, fisherName, photoDataUrl, caption);

  const slug = String(capture.species || 'pescaria').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const formattedDate = String(capture.date || '').split('-').reverse().join('/');
  const captionSnippet = caption ? ` — “${caption}”` : '';

  // Constrói a URL canônica com parâmetros diretos para abrir o ranking e a captura
  const origin = (typeof window !== 'undefined' && window.location.origin) || 'https://marecerta.com.br';
  const pathname = (typeof window !== 'undefined' && window.location.pathname) || '/';
  const targetId = captureId ? String(captureId).trim() : '';
  const shareUrl = `${origin}${pathname}?tab=ranking${targetId ? `&capture=${encodeURIComponent(targetId)}` : ''}#ranking`;

  const lines = [
    `🎣 *${capture.quantity} × ${capture.species}*${capture.weight ? ` (${Number(capture.weight).toLocaleString('pt-BR')} kg)` : ''}`,
    `📍 *Local:* ${capture.location || 'Litoral Brasileiro'}`,
    `📅 *Data:* ${formattedDate}`
  ];
  if (caption) {
    lines.push(`💬 *Relato:* “${caption}”`);
  }
  lines.push('');
  lines.push('🏆 *Veja a foto do troféu e o ranking da comunidade:*');
  lines.push(`👉 ${shareUrl}`);
  const fullShareText = lines.join('\n');

  const showAlert = (msg, isSuccess = true) => {
    if (!alertEl) return;
    alertEl.hidden = false;
    alertEl.className = `share-status-alert ${isSuccess ? 'is-success' : 'is-info'}`;
    alertEl.textContent = msg;
  };

  const downloadBtn = $('downloadTrophyBtn');
  if (downloadBtn) {
    downloadBtn.onclick = () => {
      const link = document.createElement('a');
      link.download = `mare-certa-${slug}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showAlert('💾 Imagem do troféu baixada com sucesso!');
    };
  }

  const copyLinkBtn = $('copyShareLinkBtn');
  if (copyLinkBtn) {
    copyLinkBtn.onclick = async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(shareUrl);
        } else {
          prompt('Copie o link da pescaria:', shareUrl);
        }
        showAlert('🔗 Link direto copiado! Ao clicar nele, a pessoa vai direto para o ranking e esta captura.');
      } catch {
        prompt('Copie o link da pescaria:', shareUrl);
      }
    };
  }

  const shareBtn = $('nativeShareTrophyBtn');
  if (shareBtn) {
    shareBtn.onclick = async () => {
      if (navigator.share && canvas.toBlob) {
        canvas.toBlob(async blob => {
          if (!blob) return;
          const file = new File([blob], `trofeu-mare-certa-${slug}.png`, { type: 'image/png' });

          // No mobile: passando files e text juntos SEM title, o WhatsApp agrupa o texto diretamente como LEGENDA (caption) da foto!
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                files: [file],
                text: fullShareText
              });
              showAlert('✅ Compartilhado no WhatsApp com a foto e o link!');
              return;
            } catch (err) {
              if (err.name === 'AbortError') return;
            }
          }

          // No desktop / WhatsApp Web: copia a imagem para o Clipboard para o usuário colar na conversa (Ctrl+V)
          let copiedImage = false;
          try {
            if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
              await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
              ]);
              copiedImage = true;
            }
          } catch {}

          const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullShareText)}`;
          window.open(waUrl, '_blank', 'noopener,noreferrer');

          if (copiedImage) {
            showAlert('📋 Imagem do troféu copiada! Na conversa do WhatsApp, pressione Ctrl+V para colar a foto junto com a mensagem e o link!');
          } else {
            showAlert('💬 WhatsApp aberto com a mensagem e o link! Baixe a imagem caso deseje anexar junto.');
          }
        }, 'image/png');
      } else {
        const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullShareText)}`;
        window.open(waUrl, '_blank', 'noopener,noreferrer');
        showAlert('💬 WhatsApp aberto com a mensagem e o link da captura!');
      }
    };
  }
}

export function handleSharedCaptureNavigation() {
  if (typeof window === 'undefined') return;
  try {
    const params = new URLSearchParams(window.location.search || '');
    const tabParam = params.get('tab');
    const captureId = params.get('capture');
    const hash = (window.location.hash || '').toLowerCase();

    const isRankingTarget = tabParam === 'ranking' || hash === '#ranking' || hash === '#capturas' || hash === '#diario' || Boolean(captureId);
    if (!isRankingTarget) return;

    // 1. Garante a seleção da aba de Ranking e Comunidade
    const rankingTab = $('rankingTab');
    const rankingPanel = $('rankingPanel');
    if (rankingTab && rankingTab.getAttribute('aria-selected') !== 'true') {
      rankingTab.click();
    }
    if (rankingPanel && rankingPanel.hidden) {
      rankingPanel.hidden = false;
    }

    // 2. Se houver captureId na URL, localiza o card no feed e rola suavemente com destaque
    if (captureId) {
      let attempts = 0;
      const maxAttempts = 30; // até ~3.6s
      const findAndScroll = () => {
        attempts++;
        const card = document.getElementById(`capture-card-${captureId}`) ||
                     document.querySelector(`[data-capture-id="${CSS.escape ? CSS.escape(captureId) : captureId}"]`);
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          card.classList.add('highlight-shared-capture');
          setTimeout(() => {
            card.classList.remove('highlight-shared-capture');
          }, 4500);
          return;
        }
        if (attempts < maxAttempts) {
          setTimeout(findAndScroll, 120);
        } else {
          const target = $('recentCatches') || $('rankingTopPodium') || rankingPanel;
          target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      };
      setTimeout(findAndScroll, 100);
    } else {
      setTimeout(() => {
        const target = $('rankingTopPodium') || rankingPanel;
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
  } catch (err) {
    console.warn('Navigation to shared capture fallback:', err);
  }
}

if (typeof document !== 'undefined') {
  const closeBtn = $('closeShareCard');
  if (closeBtn) closeBtn.addEventListener('click', () => $('shareCardDialog')?.close());
  initQuickSpeciesChips();
  initProSocialFeatures();
  setupImageCropperListeners();
  handleSharedCaptureNavigation();
  window.addEventListener('hashchange', handleSharedCaptureNavigation);
  window.addEventListener('popstate', handleSharedCaptureNavigation);
}

export function collectAdminManageableUsers(profiles = {}, captures = {}) {
  const extMap = loadFisherExtendedProfiles();
  const vipGrants = loadAdminVipGrants();
  const modMap = loadAdminModerationMap();
  const usersMap = new Map();

  const upsert = (uid, info = {}) => {
    if (!uid) return;
    const prev = usersMap.get(uid) || { uid, displayName: '', email: '', location: '', source: 'Comunidade' };
    const ext = extMap[uid] || {};
    usersMap.set(uid, {
      uid,
      displayName: info.displayName || ext.displayName || prev.displayName || 'Pescador',
      email: info.email || prev.email || (uid.includes('@') ? uid : `${uid}@comunidade.marecerta.com.br`),
      location: info.location || ext.location || prev.location || 'Litoral Brasileiro',
      source: info.source || prev.source
    });
  };

  // 1. Current logged-in user (or local current user)
  if (adminContext.currentUser) {
    upsert(adminContext.currentUser.uid, {
      displayName: adminContext.currentUser.displayName || 'Minha Conta Atual',
      email: adminContext.currentUser.email || '',
      source: 'Sua Conta'
    });
  } else {
    upsert('local-current-user', {
      displayName: 'Minha Conta Local (Navegador Atual)',
      email: 'admin@marecerta.com.br',
      location: 'Sessão Local',
      source: 'Sua Conta'
    });
  }

  // 2. Default & Extended Fisher Profiles
  for (const [uid, ext] of Object.entries(extMap)) {
    upsert(uid, {
      displayName: ext.displayName,
      location: ext.location,
      source: uid.startsWith('demo-') ? 'Comunidade' : 'Perfil Cadastrado'
    });
  }

  // 3. Firebase Profiles
  for (const [uid, prof] of Object.entries(profiles || {})) {
    if (prof && typeof prof === 'object') {
      upsert(uid, {
        displayName: prof.displayName,
        email: prof.email || '',
        source: 'Conta Firebase'
      });
    }
  }

  // 4. Captures authors
  for (const [, cap] of Object.entries(captures || {})) {
    if (cap?.uid) {
      upsert(cap.uid, {
        displayName: cap.authorName,
        location: cap.location,
        source: 'Autor no Ranking'
      });
    }
  }

  // 5. Manually granted VIP users by email/UID
  for (const [key, grant] of Object.entries(vipGrants)) {
    if (!grant || grant.active === false) continue;
    const targetKey = grant.uid || key;
    let existingByEmail = null;
    if (grant.email) {
      for (const item of usersMap.values()) {
        if (item.email && item.email.toLowerCase() === grant.email.toLowerCase()) {
          existingByEmail = item;
          break;
        }
      }
    }
    if (!existingByEmail) {
      upsert(targetKey, {
        displayName: grant.displayName,
        email: grant.email || key,
        source: 'Convidado VIP'
      });
    }
  }

  // 6. Moderated (banned / deleted) users so they remain visible in Admin Panel
  for (const [key, rec] of Object.entries(modMap)) {
    if (!rec) continue;
    const targetKey = rec.uid || key;
    if (!usersMap.has(targetKey)) {
      upsert(targetKey, {
        displayName: rec.displayName || 'Conta Moderada',
        email: rec.email || key,
        source: rec.status === 'deleted' ? 'Conta Excluída' : 'Conta Moderada'
      });
    }
  }

  return Array.from(usersMap.values()).map(u => {
    const grant = isUserAdminGrantedPro(u.uid, u.email);
    const mod = getUserModerationStatus(u.uid, u.email);
    const ext = extMap[u.uid] || {};
    const isExtPro = Boolean(ext.isPro && (!ext.proExpiresAt || ext.proExpiresAt > Date.now()));
    const isGrantPro = Boolean(grant && grant.active !== false && (!grant.expiresAt || grant.expiresAt > Date.now()));
    const isPro = (isGrantPro || isExtPro) && !mod.isRestricted;

    let roleLabel = grant?.roleLabel || grant?.planName || null;
    if (!roleLabel && isExtPro) {
      const planName = ext.proPlan === 'monthly' ? 'Mensal (Mercado Pago)' : 'Anual (Mercado Pago)';
      roleLabel = `Assinante PRO ${planName}`;
    }

    return {
      ...u,
      isVipPro: isPro,
      vipRoleLabel: roleLabel,
      grantedAt: grant?.grantedAt || ext.proActivatedAt || null,
      proExpiresAt: grant?.expiresAt || ext.proExpiresAt || null,
      moderationStatus: mod.status,
      isRestricted: mod.isRestricted,
      moderationLabel: mod.label,
      moderationMessage: mod.message,
      moderationRemainingDays: mod.remainingDays
    };
  });
}

export function renderAdminProhibitedWordsList() {
  if (typeof document === 'undefined') return;
  const listEl = $('adminProhibitedWordsList');
  const countEl = $('adminBlockedWordsCount');
  const allWords = loadProhibitedWords();
  const customWords = loadCustomProhibitedWords();

  if (countEl) countEl.textContent = `${allWords.length} termos bloqueados`;
  if (!listEl) return;

  listEl.innerHTML = allWords
    .map(word => {
      const isCustom = customWords.includes(word);
      return `
        <span class="admin-word-chip ${isCustom ? 'is-custom' : ''}">
          <span>🚫 ${escapeHtml(word)}</span>
          ${
            isCustom
              ? `<button type="button" class="admin-remove-word-btn" data-remove-word="${escapeHtml(word)}" aria-label="Remover termo ${escapeHtml(word)}" title="Remover palavra personalizada">×</button>`
              : ''
          }
        </span>
      `;
    })
    .join('');

  listEl.querySelectorAll('[data-remove-word]').forEach(btn => {
    btn.addEventListener('click', () => {
      removeProhibitedWord(btn.dataset.removeWord);
      renderAdminProhibitedWordsList();
    });
  });
}

export function renderAdminProPanel() {
  if (typeof document === 'undefined') return;
  renderAdminProhibitedWordsList();
  renderAdminReportsList();

  const listEl = $('adminUsersList');
  if (!listEl) return;

  const allUsers = collectAdminManageableUsers(adminContext.profiles, adminContext.captures);
  const vipCount = allUsers.filter(u => u.isVipPro).length;
  const restrictedCount = allUsers.filter(u => u.isRestricted).length;

  if ($('adminTotalUsersCount')) $('adminTotalUsersCount').textContent = String(allUsers.length);
  if ($('adminTotalVipCount')) $('adminTotalVipCount').textContent = String(vipCount);
  if ($('adminTotalBannedCount')) $('adminTotalBannedCount').textContent = String(restrictedCount);

  const myUser = adminContext.currentUser || (typeof auth !== 'undefined' && auth?.currentUser) || null;
  const myUid = myUser?.uid || 'local-current-user';
  const myEmail = myUser?.email || '';
  const meIsPro = Boolean(isUserPro(myUid, myEmail));

  if ($('adminMyCurrentStatus')) {
    $('adminMyCurrentStatus').textContent = meIsPro ? '👑 PRO Ativo' : '🔒 Gratuito';
  }
  const grantMeBtn = $('adminGrantCurrentMeBtn');
  if (grantMeBtn) {
    grantMeBtn.textContent = meIsPro
      ? '🔒 Colocar Minha Conta como Gratuito'
      : '👑 Liberar PRO Grátis na Minha Conta Atual';
    grantMeBtn.classList.toggle('is-active-vip', meIsPro);
  }

  const q = String(adminContext.searchQuery || '').toLowerCase();
  const filtered = allUsers.filter(u => {
    if (adminContext.filterMode === 'vip' && !u.isVipPro) return false;
    if (adminContext.filterMode === 'free' && (u.isVipPro || u.isRestricted)) return false;
    if (adminContext.filterMode === 'banned' && !u.isRestricted) return false;
    if (!q) return true;
    return (
      String(u.displayName || '').toLowerCase().includes(q) ||
      String(u.email || '').toLowerCase().includes(q) ||
      String(u.location || '').toLowerCase().includes(q) ||
      String(u.uid || '').toLowerCase().includes(q)
    );
  });

  if (!filtered.length) {
    listEl.innerHTML = `<p class="empty-note">Nenhum pescador encontrado com esse filtro. Use o formulário acima para liberar qualquer pessoa por e-mail ou nome.</p>`;
    return;
  }

  listEl.innerHTML = filtered
    .map(u => {
      const initials = getInitials(u.displayName);
      const isDeleted = u.moderationStatus === 'deleted';
      const isBanned = u.moderationStatus === 'banned_temp' || u.moderationStatus === 'banned_perm';

      let statusBadgeHtml = '';
      if (isDeleted) {
        statusBadgeHtml = `<span class="admin-mod-badge is-deleted">${escapeHtml(u.moderationLabel)}</span>`;
      } else if (isBanned) {
        statusBadgeHtml = `<span class="admin-mod-badge is-banned">${escapeHtml(u.moderationLabel)}</span>`;
      } else if (u.isVipPro) {
        statusBadgeHtml = `<span class="admin-vip-badge">👑 ${escapeHtml(u.vipRoleLabel || 'PRO Cortesia · R$ 0')}</span>`;
      } else {
        statusBadgeHtml = `<span class="admin-free-badge">🔒 Conta Gratuita</span>`;
      }

      return `
        <article class="admin-user-row ${u.isVipPro ? 'is-vip' : ''} ${u.isRestricted ? 'is-restricted' : ''}" data-admin-user-uid="${escapeHtml(u.uid)}">
          <div class="admin-user-ident">
            <div class="admin-user-avatar" aria-hidden="true">${escapeHtml(initials)}</div>
            <div class="admin-user-info">
              <div class="admin-user-name-line">
                <strong>${escapeHtml(u.displayName)}</strong>
                <span class="admin-source-tag">${escapeHtml(u.source)}</span>
                ${statusBadgeHtml}
              </div>
              <small class="admin-user-sub">✉️ ${escapeHtml(u.email)} · 📍 ${escapeHtml(u.location)}</small>
            </div>
          </div>
          <div class="admin-user-actions">
            ${
              !isDeleted
                ? u.isVipPro
                  ? `<button type="button" class="admin-toggle-vip-btn is-revoke" data-revoke-uid="${escapeHtml(u.uid)}" data-revoke-email="${escapeHtml(u.email)}" data-revoke-name="${escapeHtml(u.displayName)}">
                       🔒 Colocar como Gratuito
                     </button>`
                  : `<div class="admin-grant-controls-group" style="display:inline-flex;align-items:center;gap:6px;">
                       <select class="admin-grant-duration-select" data-grant-duration-uid="${escapeHtml(u.uid)}" aria-label="Duração do Premium para ${escapeHtml(u.displayName)}">
                         <option value="3">3 dias</option>
                         <option value="30">1 mês</option>
                         <option value="365" selected>1 ano</option>
                         <option value="3650">Vitalício</option>
                       </select>
                       <button type="button" class="admin-toggle-vip-btn is-grant" data-grant-uid="${escapeHtml(u.uid)}" data-grant-email="${escapeHtml(u.email)}" data-grant-name="${escapeHtml(u.displayName)}">
                         👑 Liberar PRO
                       </button>
                     </div>`
                : ''
            }
            <div class="admin-moderation-controls">
              ${
                isBanned
                  ? `<button type="button" class="admin-mod-btn is-unban" data-unban-uid="${escapeHtml(u.uid)}" data-unban-email="${escapeHtml(u.email)}">
                       ✓ Desbanir Conta
                     </button>`
                  : !isDeleted
                    ? `<select class="admin-ban-select" data-ban-select-uid="${escapeHtml(u.uid)}" aria-label="Duração do banimento para ${escapeHtml(u.displayName)}">
                         <option value="7">Banir 7 dias</option>
                         <option value="14">Banir 14 dias</option>
                         <option value="30">Banir 30 dias</option>
                         <option value="permanent">Banir Permanente</option>
                       </select>
                       <button type="button" class="admin-mod-btn is-ban" data-ban-uid="${escapeHtml(u.uid)}" data-ban-email="${escapeHtml(u.email)}" data-ban-name="${escapeHtml(u.displayName)}">
                         🚫 Banir
                       </button>`
                    : ''
              }
              ${
                isDeleted
                  ? `<button type="button" class="admin-mod-btn is-restore" data-restore-uid="${escapeHtml(u.uid)}" data-restore-email="${escapeHtml(u.email)}">
                       ↩ Restaurar Conta
                     </button>`
                  : `<button type="button" class="admin-mod-btn is-delete-account" data-delete-account-uid="${escapeHtml(u.uid)}" data-delete-account-email="${escapeHtml(u.email)}" data-delete-account-name="${escapeHtml(u.displayName)}">
                       🗑️ Deletar Conta
                     </button>`
              }
            </div>
          </div>
        </article>
      `;
    })
    .join('');

  listEl.querySelectorAll('[data-grant-uid]').forEach(btn => {
    btn.addEventListener('click', () => {
      const uid = btn.dataset.grantUid;
      const durationSelect = listEl.querySelector(`[data-grant-duration-uid="${CSS.escape ? CSS.escape(uid) : uid}"]`);
      const durationDays = durationSelect ? Number(durationSelect.value) : 365;

      grantFreeProToUser({
        uid,
        email: btn.dataset.grantEmail,
        displayName: btn.dataset.grantName,
        roleLabel: `PRO Cortesia (${durationDays === 3 ? '3 dias' : durationDays === 30 ? '1 mês' : durationDays === 365 ? '1 ano' : 'Vitalício'})`,
        grantedBy: 'Admin',
        durationDays
      });
      renderAdminProPanel();
    });
  });

  listEl.querySelectorAll('[data-revoke-uid]').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.revokeName || btn.dataset.revokeEmail || btn.dataset.revokeUid || 'este pescador';
      const confirmed = typeof window !== 'undefined' && typeof window.confirm === 'function'
        ? window.confirm(`⚠️ SEGUNDA CONFIRMAÇÃO EXIGIDA:\n\nTem certeza que deseja colocar a conta de "${name}" como GRATUITO?\n\nEssa ação revoga o status PRO imediatamente no site e no Firebase Realtime Database.`)
        : true;
      if (!confirmed) return;

      revokeFreeProFromUser(btn.dataset.revokeUid);
      if (btn.dataset.revokeEmail) revokeFreeProFromUser(btn.dataset.revokeEmail);
      if (typeof fetch === 'function') {
        fetch('/api/mp/revoke_subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: btn.dataset.revokeUid, email: btn.dataset.revokeEmail || '' })
        }).catch(() => {});
      }
      renderAdminProPanel();
    });
  });

  listEl.querySelectorAll('[data-ban-uid]').forEach(btn => {
    btn.addEventListener('click', () => {
      const uid = btn.dataset.banUid;
      const selectEl = listEl.querySelector(`[data-ban-select-uid="${CSS.escape ? CSS.escape(uid) : uid}"]`);
      const durationVal = selectEl ? selectEl.value : '7';
      banUserAccount({
        uid,
        email: btn.dataset.banEmail,
        displayName: btn.dataset.banName,
        durationDays: durationVal === 'permanent' ? 'permanent' : Number(durationVal)
      });
      renderAdminProPanel();
    });
  });

  listEl.querySelectorAll('[data-unban-uid]').forEach(btn => {
    btn.addEventListener('click', () => {
      unbanUserAccount(btn.dataset.unbanUid);
      if (btn.dataset.unbanEmail) unbanUserAccount(btn.dataset.unbanEmail);
      renderAdminProPanel();
    });
  });

  listEl.querySelectorAll('[data-delete-account-uid]').forEach(btn => {
    btn.addEventListener('click', () => {
      deleteUserAccountByAdmin({
        uid: btn.dataset.deleteAccountUid,
        email: btn.dataset.deleteAccountEmail,
        displayName: btn.dataset.deleteAccountName
      });
      renderAdminProPanel();
    });
  });

  listEl.querySelectorAll('[data-restore-uid]').forEach(btn => {
    btn.addEventListener('click', () => {
      restoreDeletedUserAccount(btn.dataset.restoreUid);
      if (btn.dataset.restoreEmail) restoreDeletedUserAccount(btn.dataset.restoreEmail);
      renderAdminProPanel();
    });
  });
}

export function openAdminProModal() {
  const dialog = $('adminProDialog');
  if (!dialog) return;
  setupAdminAutoRefresh();
  refreshAdminDataFromFirebase();
  renderAdminProPanel();
  if (!dialog.open) dialog.showModal();
}

/* ============================================================
   SINCRONIZAÇÃO EM TEMPO REAL E AUTO-REFRESH DO PAINEL ADMIN (15s)
   ============================================================ */

export async function refreshAdminDataFromFirebase() {
  const statusText = $('adminSyncStatusText');
  const refreshBtn = $('adminRefreshNowBtn');
  if (refreshBtn) refreshBtn.classList.add('is-refreshing');
  if (statusText) statusText.textContent = 'Buscando dados no Firebase…';

  try {
    // 1. Busca perfis cadastrados do Firebase
    let freshProfiles = {};
    try {
      const snapMare = await get(ref(database, 'mareCerta/profiles'));
      if (snapMare && typeof snapMare.exists === 'function' && snapMare.exists()) {
        freshProfiles = { ...freshProfiles, ...snapMare.val() };
      }
    } catch {}
    try {
      const snapLegacy = await get(ref(database, 'profiles'));
      if (snapLegacy && typeof snapLegacy.exists === 'function' && snapLegacy.exists()) {
        freshProfiles = { ...freshProfiles, ...snapLegacy.val() };
      }
    } catch {}
    adminContext.profiles = { ...adminContext.profiles, ...freshProfiles };

    // 2. Busca capturas
    let freshCaptures = {};
    try {
      const snapCaps = await get(ref(database, 'mareCerta/captures'));
      if (snapCaps && typeof snapCaps.exists === 'function' && snapCaps.exists()) {
        freshCaptures = { ...freshCaptures, ...snapCaps.val() };
      }
    } catch {}
    try {
      const snapLegacyCaps = await get(ref(database, 'captures'));
      if (snapLegacyCaps && typeof snapLegacyCaps.exists === 'function' && snapLegacyCaps.exists()) {
        freshCaptures = { ...freshCaptures, ...snapLegacyCaps.val() };
      }
    } catch {}
    adminContext.captures = { ...adminContext.captures, ...freshCaptures };

    // 3. Busca extendedProfiles
    try {
      const snapExt = await get(ref(database, 'mareCerta/extendedProfiles'));
      if (snapExt && typeof snapExt.exists === 'function' && snapExt.exists()) {
        const extVal = snapExt.val();
        const local = loadFisherExtendedProfiles();
        const merged = { ...local, ...extVal };
        try { localStorage.setItem(STORAGE_FISHER_PROFILES_KEY, JSON.stringify(merged)); } catch {}
      }
    } catch {}

    // 4. Busca vipGrants
    try {
      const snapVip = await get(ref(database, 'mareCerta/vipGrants'));
      if (snapVip && typeof snapVip.exists === 'function' && snapVip.exists()) {
        const vipVal = snapVip.val();
        const local = loadRawAdminVipGrantsMap();
        const merged = { ...local, ...vipVal };
        try { localStorage.setItem(STORAGE_ADMIN_VIP_KEY, JSON.stringify(merged)); } catch {}
      }
    } catch {}

    // 5. Busca moderação / banimentos
    try {
      const snapMod = await get(ref(database, 'mareCerta/moderation/users'));
      if (snapMod && typeof snapMod.exists === 'function' && snapMod.exists()) {
        const modVal = snapMod.val();
        const local = loadAdminModerationMap();
        const merged = { ...local, ...modVal };
        try { localStorage.setItem(STORAGE_ADMIN_MODERATION_KEY, JSON.stringify(merged)); } catch {}
      }
    } catch {}

    // 6. Busca denúncias
    try {
      const snapRep = await get(ref(database, 'mareCerta/moderation/reports'));
      if (snapRep && typeof snapRep.exists === 'function' && snapRep.exists()) {
        const repVal = snapRep.val();
        const local = loadAdminReportsMap();
        const merged = { ...local, ...repVal };
        try { localStorage.setItem(STORAGE_ADMIN_REPORTS_KEY, JSON.stringify(merged)); } catch {}
      }
    } catch {}

    renderAdminProPanel();
    renderAdminReportsList();
    renderAdminProhibitedWordsList();

    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-BR');
    if (statusText) statusText.textContent = `Atualizado com sucesso (${timeStr}) ✓`;
  } catch (err) {
    console.warn('Erro ao atualizar dados do admin via Firebase:', err);
    if (statusText) statusText.textContent = 'Erro ao sincronizar com o Firebase. Usando cache local.';
  } finally {
    if (refreshBtn) refreshBtn.classList.remove('is-refreshing');
  }
}

let adminCountdownSeconds = 15;
let adminAutoRefreshInterval = null;

export function setupAdminAutoRefresh() {
  if (typeof document === 'undefined') return;

  const refreshBtn = $('adminRefreshNowBtn');
  const autoCheck = $('adminAutoRefreshCheck');
  const countdownEl = $('adminSyncCountdown');
  const statusText = $('adminSyncStatusText');

  if (!refreshBtn && !autoCheck) return;

  const resetCountdown = () => {
    adminCountdownSeconds = 15;
    if (countdownEl) countdownEl.textContent = `· Atualizando em ${adminCountdownSeconds}s`;
  };

  const triggerRefresh = async () => {
    resetCountdown();
    await refreshAdminDataFromFirebase();
  };

  if (refreshBtn && !refreshBtn._listenerAttached) {
    refreshBtn._listenerAttached = true;
    refreshBtn.addEventListener('click', () => {
      triggerRefresh();
    });
  }

  // Timer com contagem regressiva de 15 segundos
  if (adminAutoRefreshInterval) clearInterval(adminAutoRefreshInterval);
  adminCountdownSeconds = 15;
  adminAutoRefreshInterval = setInterval(() => {
    const isChecked = autoCheck ? autoCheck.checked : true;
    if (!isChecked) {
      if (countdownEl) countdownEl.textContent = '· Atualização pausada';
      return;
    }

    adminCountdownSeconds--;
    if (adminCountdownSeconds <= 0) {
      triggerRefresh();
    } else {
      if (countdownEl) countdownEl.textContent = `· Atualizando em ${adminCountdownSeconds}s`;
    }
  }, 1000);

  if (autoCheck && !autoCheck._listenerAttached) {
    autoCheck._listenerAttached = true;
    autoCheck.addEventListener('change', () => {
      if (autoCheck.checked) {
        triggerRefresh();
      } else {
        if (countdownEl) countdownEl.textContent = '· Atualização pausada';
        if (statusText) statusText.textContent = 'Auto-atualização pausada';
      }
    });
  }
}
