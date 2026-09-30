import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, updateProfile, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { ref, set, get, onValue, push, remove, serverTimestamp } from 'firebase/database';
import { auth, database } from './firebase.js';
import { makeRanking, validateCapture } from './ranking-model.js';

const $ = id => document.getElementById(id);
let mode = 'login', profiles = {}, captures = {}, readyProfiles = false, readyCaptures = false;
let profileReady = false;
let signupInProgress = false;
const today = () => new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const message = (id, text, error = false) => { $(id).textContent = text; $(id).classList.toggle('is-error', error); };
const errors = {
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/email-already-in-use': 'Este e-mail já tem uma conta. Use Entrar.',
  'auth/weak-password': 'Use uma senha de pelo menos 6 caracteres.',
  'auth/invalid-email': 'Informe um e-mail válido.',
  'auth/operation-not-allowed': 'O cadastro por e-mail ainda precisa ser ativado no Firebase deste site.',
  'auth/configuration-not-found': 'O Authentication ainda precisa ser configurado no Firebase deste site.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco e tente novamente.',
  'auth/network-request-failed': 'Verifique sua conexão e tente novamente.',
  'PERMISSION_DENIED': 'O banco ainda não permite esta operação. As regras do Firebase precisam ser publicadas.',
  'permission-denied': 'O banco ainda não permite esta operação. As regras do Firebase precisam ser publicadas.'
};
const explain = error => errors[error.code] || (error.message?.startsWith('Informe') || error.message?.startsWith('Escolha') || error.message?.startsWith('A quantidade') ? error.message : 'Não foi possível concluir. Tente novamente.');

function selectTab(name) {
  for (const tab of ['forecast', 'ranking']) {
    const active = tab === name;
    $(`${tab}Tab`).setAttribute('aria-selected', String(active));
    $(`${tab}Tab`).tabIndex = active ? 0 : -1;
    $(`${tab}Panel`).hidden = !active;
  }
}
['forecast', 'ranking'].forEach(name => {
  $(`${name}Tab`).addEventListener('click', () => selectTab(name));
  $(`${name}Tab`).addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 'forecast' : event.key === 'End' ? 'ranking' : name === 'forecast' ? 'ranking' : 'forecast';
    selectTab(next); $(`${next}Tab`).focus();
  });
});

function openAccount() { message('authMessage', ''); $('accountDialog').showModal(); }
$('accountButton').addEventListener('click', openAccount);
$('captureLoginButton').addEventListener('click', openAccount);
$('closeAccount').addEventListener('click', () => $('accountDialog').close());
function setMode(next) {
  mode = next;
  $('nameField').hidden = next !== 'signup';
  $('authForm').elements.displayName.required = next === 'signup';
  $('authForm').elements.password.autocomplete = next === 'signup' ? 'new-password' : 'current-password';
  $('loginMode').setAttribute('aria-pressed', String(next === 'login'));
  $('signupMode').setAttribute('aria-pressed', String(next === 'signup'));
  $('authSubmit').textContent = next === 'signup' ? 'Criar conta' : 'Entrar';
  $('resetPassword').hidden = next !== 'login'; message('authMessage', '');
}
$('loginMode').addEventListener('click', () => setMode('login'));
$('signupMode').addEventListener('click', () => setMode('signup'));

async function ensureProfile(user, requestedName) {
  const path = ref(database, `mareCerta/profiles/${user.uid}`);
  const existing = await get(path);
  if (!existing.exists()) {
    await set(path, { displayName: requestedName || user.displayName || 'Pescador', createdAt: serverTimestamp() });
  }
  profileReady = true;
}

$('authForm').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget, signup = mode === 'signup';
  const name = form.elements.displayName.value.trim();
  if (signup && (name.length < 2 || name.length > 40)) return message('authMessage', 'Informe um nome entre 2 e 40 caracteres.', true);
  $('authSubmit').disabled = true; message('authMessage', signup ? 'Criando sua conta...' : 'Entrando...');
  try {
    if (signup) {
      signupInProgress = true;
      const { user } = await createUserWithEmailAndPassword(auth, form.elements.email.value.trim(), form.elements.password.value);
      await updateProfile(user, { displayName: name });
      // Auth may notify before updateProfile: use the chosen name for the public record.
      await set(ref(database, `mareCerta/profiles/${user.uid}`), { displayName: name, createdAt: serverTimestamp() });
      profileReady = true;
    } else {
      const { user } = await signInWithEmailAndPassword(auth, form.elements.email.value.trim(), form.elements.password.value);
      await ensureProfile(user);
    }
    form.reset(); renderAccount(auth.currentUser); $('accountDialog').close();
    message('captureMessage', 'Conta conectada. Você já pode registrar suas capturas.');
  } catch (error) {
    message('authMessage', auth.currentUser ? 'Sua conta foi conectada, mas o perfil não foi salvo no banco. Confira as regras do Firebase e tente entrar novamente.' : explain(error), true);
  } finally { signupInProgress = false; $('authSubmit').disabled = false; }
});
$('resetPassword').addEventListener('click', async () => {
  const email = $('authForm').elements.email.value.trim();
  if (!email) return message('authMessage', 'Informe seu e-mail acima para recuperar a senha.', true);
  try { await sendPasswordResetEmail(auth, email); message('authMessage', 'Se este e-mail tiver uma conta, você receberá instruções para redefinir a senha.'); }
  catch (error) { message('authMessage', explain(error), true); }
});
$('logoutButton').addEventListener('click', async () => {
  try { await signOut(auth); $('accountDialog').close(); }
  catch (error) { message('authMessage', explain(error), true); }
});

function renderAccount(user) {
  $('accountButton').textContent = user ? user.displayName || 'Minha conta' : 'Entrar / cadastrar';
  $('authForms').hidden = !!user; $('accountProfile').hidden = !user;
  $('captureLogin').hidden = !!user; $('captureForm').hidden = !user;
  if (user) { $('profileName').textContent = user.displayName || 'Minha conta'; $('profileEmail').textContent = user.email; }
  renderCommunity();
}
onAuthStateChanged(auth, async user => {
  profileReady = false; renderAccount(user);
  if (!user || signupInProgress) return;
  try { await ensureProfile(user); }
  catch (error) { message('captureMessage', explain(error), true); }
});

$('captureForm').elements.date.value = today();
$('captureForm').elements.date.max = today();
try { const local = JSON.parse(localStorage.getItem('mare-certa-location')); if (local?.name) $('captureForm').elements.location.value = local.name; } catch {}
$('captureForm').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget, button = form.querySelector('button[type="submit"]');
  if (!auth.currentUser) return openAccount();
  button.disabled = true; message('captureMessage', 'Salvando captura...');
  try {
    if (!profileReady) await ensureProfile(auth.currentUser);
    const capture = validateCapture(Object.fromEntries(new FormData(form)), auth.currentUser.uid, serverTimestamp(), today());
    await push(ref(database, 'mareCerta/captures'), capture);
    form.elements.species.value = ''; form.elements.quantity.value = '1'; form.elements.weight.value = '';
    message('captureMessage', 'Captura salva! Seu ranking foi atualizado.');
  } catch (error) { message('captureMessage', explain(error), true); }
  finally { button.disabled = false; }
});

function addCell(row, value, className) {
  const td = document.createElement('td'); td.textContent = value; if (className) td.className = className; row.append(td); return td;
}
function renderCommunity() {
  const ranking = makeRanking(profiles, captures);
  $('rankingCount').textContent = `${ranking.length} participante${ranking.length === 1 ? '' : 's'}`;
  $('rankingEmpty').hidden = !!ranking.length || !(readyProfiles && readyCaptures);
  $('rankingRows').replaceChildren();
  for (const person of ranking) {
    const row = document.createElement('tr');
    if (person.uid === auth.currentUser?.uid) row.className = 'my-ranking';
    addCell(row, String(person.rank).padStart(2, '0'), 'rank-position');
    addCell(row, `${person.name}${person.uid === auth.currentUser?.uid ? ' (você)' : ''}`);
    addCell(row, person.quantity, 'rank-total'); addCell(row, person.species);
    $('rankingRows').append(row);
  }
  $('recentCatches').replaceChildren();
  const recent = Object.entries(captures).sort((a, b) => b[1].createdAt - a[1].createdAt).slice(0, 30);
  if (!recent.length && readyCaptures) { const empty = document.createElement('p'); empty.className = 'empty-note'; empty.textContent = 'As próximas capturas aparecerão aqui.'; $('recentCatches').append(empty); }
  for (const [id, capture] of recent) {
    const card = document.createElement('article'); card.className = 'catch-item';
    const title = document.createElement('h3'); title.textContent = `${capture.quantity} × ${capture.species}`;
    const author = document.createElement('p'); author.textContent = profiles[capture.uid]?.displayName || 'Pescador';
    const details = document.createElement('small');
    details.textContent = `${capture.date.split('-').reverse().join('/')} · ${capture.location}${capture.weight ? ` · ${Number(capture.weight).toLocaleString('pt-BR')} kg` : ''}`;
    card.append(title, author, details);
    if (capture.uid === auth.currentUser?.uid) {
      const button = document.createElement('button'); button.className = 'text-button'; button.textContent = 'Excluir minha captura';
      button.addEventListener('click', async () => {
        if (!window.confirm('Excluir esta captura? Ela será removida do ranking.')) return;
        button.disabled = true;
        try { await remove(ref(database, `mareCerta/captures/${id}`)); message('captureMessage', 'Captura excluída.'); }
        catch (error) { message('captureMessage', explain(error), true); button.disabled = false; }
      }); card.append(button);
    }
    $('recentCatches').append(card);
  }
}
function connected() { if (readyProfiles && readyCaptures) message('communityMessage', 'Ranking atualizado em tempo real.'); renderCommunity(); }
onValue(ref(database, 'mareCerta/profiles'), snapshot => { profiles = snapshot.val() || {}; readyProfiles = true; connected(); }, error => message('communityMessage', explain(error), true));
onValue(ref(database, 'mareCerta/captures'), snapshot => { captures = snapshot.val() || {}; readyCaptures = true; connected(); }, error => message('communityMessage', explain(error), true));
