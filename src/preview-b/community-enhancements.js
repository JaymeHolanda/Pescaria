import {
  computeAchievements,
  PRO_PLANS,
  calculateImageDimensions,
  formatCompressionSavings,
  canUseProSocialFeature
} from './model.js';

const $ = id => (typeof document !== 'undefined' ? document.getElementById(id) : null);

const STORAGE_PRO_KEY = 'mare-certa-pro-subscription-v1';
const STORAGE_SOCIAL_KEY = 'mare-certa-social-state-v1';
const STORAGE_PHOTOS_KEY = 'mare-certa-local-s3-photos-v1';
const STORAGE_CAPTURE_CAPTIONS_KEY = 'mare-certa-capture-captions-v1';
const STORAGE_FISHER_PROFILES_KEY = 'mare-certa-fisher-profiles-v1';
const STORAGE_ADMIN_VIP_KEY = 'mare-certa-admin-vip-grants-v1';
const STORAGE_ADMIN_MODERATION_KEY = 'mare-certa-admin-moderation-v1';
const STORAGE_PROHIBITED_WORDS_KEY = 'mare-certa-prohibited-words-v1';

let pendingTrophyPhoto = null;
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

export function loadAdminVipGrants() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_ADMIN_VIP_KEY) || 'null');
    if (raw && typeof raw === 'object') {
      const merged = { ...DEFAULT_ADMIN_VIP_GRANTS, ...raw };
      // Filter out explicitly revoked entries (active === false)
      const activeOnly = {};
      for (const [k, val] of Object.entries(merged)) {
        if (val && val.active !== false) activeOnly[k] = val;
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

export function saveAdminVipGrants(grantsMap) {
  try {
    localStorage.setItem(STORAGE_ADMIN_VIP_KEY, JSON.stringify(grantsMap));
  } catch {}
  updateProStatusUI();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mare-certa:pro-changed', { detail: getProSubscription() }));
    window.dispatchEvent(new CustomEvent('mare-certa:vip-grants-changed', { detail: grantsMap }));
  }
}

export function isUserAdminGrantedPro(uid = null, email = null) {
  const grants = loadAdminVipGrants();
  const targetUid = uid || adminContext.currentUser?.uid || 'local-current-user';
  const targetEmail = String(email || adminContext.currentUser?.email || '').trim().toLowerCase();

  if (targetUid && grants[targetUid]?.active) return grants[targetUid];
  if (targetEmail && grants[targetEmail]?.active) return grants[targetEmail];

  for (const grant of Object.values(grants)) {
    if (!grant || grant.active === false) continue;
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
  grantedBy = 'Admin'
} = {}) {
  const cleanUid = String(uid || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const key = cleanUid || cleanEmail || `vip-${Date.now()}`;
  const rawMap = loadRawAdminVipGrantsMap();

  const record = {
    key,
    uid: cleanUid || key,
    email: cleanEmail,
    displayName: String(displayName || cleanEmail || cleanUid || 'Pescador VIP').trim(),
    roleLabel: String(roleLabel || 'PRO Cortesia (Liberado pelo Admin)').trim(),
    grantedBy,
    grantedAt: Date.now(),
    active: true
  };

  rawMap[key] = record;
  if (cleanEmail && cleanEmail !== key) {
    rawMap[cleanEmail] = { ...record, key: cleanEmail };
  }
  saveAdminVipGrants(rawMap);
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
      rawMap[k] = { ...grant, active: false, revokedAt: Date.now() };
      changed = true;
    }
  }

  // If revoking the current local user who also had sandbox PRO active, turn it off so revocation takes immediate effect
  const currentUid = adminContext.currentUser?.uid || 'local-current-user';
  const currentEmail = String(adminContext.currentUser?.email || '').trim().toLowerCase();
  if (cleanId === currentUid || cleanLower === currentEmail || cleanId === 'local-current-user') {
    try {
      const sub = JSON.parse(localStorage.getItem(STORAGE_PRO_KEY) || 'null');
      if (sub?.isFreeGrant) {
        localStorage.removeItem(STORAGE_PRO_KEY);
      }
    } catch {}
  }

  saveAdminVipGrants(rawMap);
  return changed;
}

export function setAdminCommunityContext(user, profiles = {}, captures = {}) {
  adminContext.currentUser = user || null;
  adminContext.profiles = profiles || {};
  adminContext.captures = captures || {};
  updateProStatusUI();
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
    } catch {}
  }
  return loadProhibitedWords();
}

export function removeProhibitedWord(word) {
  const clean = String(word || '').trim().toLowerCase();
  const custom = loadCustomProhibitedWords().filter(w => w !== clean);
  try {
    localStorage.setItem(STORAGE_PROHIBITED_WORDS_KEY, JSON.stringify(custom));
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

export function getProSubscription(uid = null, email = null) {
  const adminGrant = isUserAdminGrantedPro(uid, email);
  if (adminGrant) {
    return {
      active: true,
      planId: 'vip_admin',
      planName: adminGrant.roleLabel || 'PRO Cortesia (Liberado pelo Admin)',
      priceMonthly: 0,
      billingTotal: 0,
      activatedAt: adminGrant.grantedAt || Date.now(),
      expiresAt: Date.now() + 10 * 365 * 86400000,
      isFreeGrant: true,
      gateway: 'Cortesia Admin (Sem Custo)'
    };
  }
  try {
    const sub = JSON.parse(localStorage.getItem(STORAGE_PRO_KEY) || 'null');
    if (sub && typeof sub === 'object') return sub;
  } catch {}
  return { active: false, planId: null, expiresAt: null, gateway: 'Mercado Pago' };
}

export function isUserPro(uid = null, email = null) {
  if (isUserAdminGrantedPro(uid, email)) return true;
  return canUseProSocialFeature(getProSubscription(uid, email));
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
    if (pro && sub.isFreeGrant) {
      statusPill.textContent = `👑 Membro PRO Cortesia (${sub.planName || 'Liberado pelo Admin · Sem Custo'})`;
    } else if (pro) {
      statusPill.textContent = `👑 Assinante PRO Ativo (${sub.planId === 'monthly' ? 'R$ 14,90/mês' : 'Anual · R$ 8,33/mês'})`;
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
    openModalBtn.textContent = pro ? '👑 Gerenciar Assinatura PRO' : '⚡ Assinar PRO · R$ 8,33/mês';
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
      const uid = adminContext.currentUser?.uid || 'local-current-user';
      const email = adminContext.currentUser?.email || 'admin@marecerta.com.br';
      const displayName = adminContext.currentUser?.displayName || 'Minha Conta (Admin)';
      const alreadyVip = Boolean(isUserAdminGrantedPro(uid, email));
      if (alreadyVip) {
        revokeFreeProFromUser(uid);
        if (email) revokeFreeProFromUser(email);
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
      if (!nameVal && !emailVal) return;

      grantFreeProToUser({
        uid: emailVal || `vip-${Date.now()}`,
        email: emailVal,
        displayName: nameVal || emailVal.split('@')[0] || 'Pescador Convidado',
        roleLabel: roleVal,
        grantedBy: 'Admin Master'
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
      selectedPlanId = cardBtn.dataset.proPlanSelect || 'annual';
      document.querySelectorAll('[data-pro-plan-select]').forEach(el => {
        el.classList.toggle('selected', el.dataset.proPlanSelect === selectedPlanId);
        el.setAttribute('aria-pressed', String(el.dataset.proPlanSelect === selectedPlanId));
      });
      const summaryEl = $('mpSelectedPlanSummary');
      if (summaryEl) {
        summaryEl.innerHTML = selectedPlanId === 'annual'
          ? 'Plano Anual selecionado: <strong>R$ 8,33/mês</strong> (R$ 99,90/ano via PIX ou Cartão em até 12x)'
          : 'Plano Mensal selecionado: <strong>R$ 14,90/mês</strong> (cobrança avulsa via PIX ou Cartão)';
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
        : '🔒 Assine o Clube PRO (R$ 8,33/mês) para comentar e responder…';
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
    return {
      ...u,
      isVipPro: Boolean(grant) && !mod.isRestricted,
      vipRoleLabel: grant?.roleLabel || null,
      grantedAt: grant?.grantedAt || null,
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

  const listEl = $('adminUsersList');
  if (!listEl) return;

  const allUsers = collectAdminManageableUsers(adminContext.profiles, adminContext.captures);
  const vipCount = allUsers.filter(u => u.isVipPro).length;
  const restrictedCount = allUsers.filter(u => u.isRestricted).length;

  if ($('adminTotalUsersCount')) $('adminTotalUsersCount').textContent = String(allUsers.length);
  if ($('adminTotalVipCount')) $('adminTotalVipCount').textContent = String(vipCount);
  if ($('adminTotalBannedCount')) $('adminTotalBannedCount').textContent = String(restrictedCount);

  const myUid = adminContext.currentUser?.uid || 'local-current-user';
  const myEmail = adminContext.currentUser?.email || '';
  const meIsVip = Boolean(isUserAdminGrantedPro(myUid, myEmail));

  if ($('adminMyCurrentStatus')) {
    $('adminMyCurrentStatus').textContent = meIsVip ? '👑 PRO Cortesia Ativo' : 'Padrão';
  }
  const grantMeBtn = $('adminGrantCurrentMeBtn');
  if (grantMeBtn) {
    grantMeBtn.textContent = meIsVip
      ? '✕ Remover Cortesia da Minha Conta Atual'
      : '👑 Liberar PRO Grátis na Minha Conta Atual';
    grantMeBtn.classList.toggle('is-active-vip', meIsVip);
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
                  ? `<button type="button" class="admin-toggle-vip-btn is-revoke" data-revoke-uid="${escapeHtml(u.uid)}" data-revoke-email="${escapeHtml(u.email)}">
                       ✕ Revogar Cortesia
                     </button>`
                  : `<button type="button" class="admin-toggle-vip-btn is-grant" data-grant-uid="${escapeHtml(u.uid)}" data-grant-email="${escapeHtml(u.email)}" data-grant-name="${escapeHtml(u.displayName)}">
                       👑 Liberar PRO Sem Pagar
                     </button>`
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
      grantFreeProToUser({
        uid: btn.dataset.grantUid,
        email: btn.dataset.grantEmail,
        displayName: btn.dataset.grantName,
        roleLabel: 'PRO Cortesia (Liberado pelo Admin)',
        grantedBy: 'Admin'
      });
      renderAdminProPanel();
    });
  });

  listEl.querySelectorAll('[data-revoke-uid]').forEach(btn => {
    btn.addEventListener('click', () => {
      revokeFreeProFromUser(btn.dataset.revokeUid);
      if (btn.dataset.revokeEmail) revokeFreeProFromUser(btn.dataset.revokeEmail);
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
  renderAdminProPanel();
  if (!dialog.open) dialog.showModal();
}
