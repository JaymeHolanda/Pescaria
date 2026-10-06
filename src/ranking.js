import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, updateProfile, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { ref, runTransaction, onValue, push, remove, serverTimestamp } from 'firebase/database';
import { auth, database } from './firebase.js';
import { makeRanking, validateCapture, profileRecord } from './ranking-model.js';
import { explainError, localDate } from './ranking-errors.js';

const $ = id => document.getElementById(id);
let mode = 'login', profiles = {}, captures = {}, readyProfiles = false, readyCaptures = false;
let profileReady = false;
let signupInProgress = false;
const today = () => localDate();
const message = (id, text, error = false) => { $(id).textContent = text; $(id).classList.toggle('is-error', error); };
const explain = explainError;

function openAccount() { message('authMessage', ''); renderAccount(auth.currentUser); $('accountDialog').showModal(); }
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
  // Login and the auth observer can run together. Preserve createdAt atomically.
  await runTransaction(path, existing => profileRecord(existing, requestedName, user.displayName, serverTimestamp()), { applyLocally: false });
  profileReady = true;
  renderAccount(user);
  message('profileStatus', 'Perfil salvo no ranking.');
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
      await ensureProfile(user, name);
    } else {
      const { user } = await signInWithEmailAndPassword(auth, form.elements.email.value.trim(), form.elements.password.value);
      await ensureProfile(user);
    }
    form.reset(); renderAccount(auth.currentUser); $('accountDialog').close();
    message('captureMessage', 'Conta conectada. Você já pode registrar suas capturas.');
  } catch (error) {
    renderAccount(auth.currentUser);
    message('authMessage', auth.currentUser ? `Sua conta já existe. O perfil ainda não foi salvo: ${explain(error)} Depois de liberar o banco, use Concluir perfil acima.` : explain(error), true);
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
  $('profileForm').hidden = !user || profileReady;
  if (user) {
    $('profileName').textContent = user.displayName || 'Minha conta'; $('profileEmail').textContent = user.email;
    if (document.activeElement !== $('profileForm').elements.displayName) $('profileForm').elements.displayName.value = user.displayName || '';
    if (!profileReady) message('profileStatus', 'Seu cadastro está conectado; falta salvar o perfil no ranking.');
  }
  renderCommunity();
}
onAuthStateChanged(auth, async user => {
  profileReady = false; renderAccount(user);
  if (!user || signupInProgress) return;
  try { await ensureProfile(user); }
  catch (error) { message('captureMessage', explain(error), true); message('profileStatus', explain(error), true); }
});

$('profileForm').addEventListener('submit', async event => {
  event.preventDefault();
  const user = auth.currentUser, form = event.currentTarget, button = form.querySelector('button');
  if (!user) return;
  const name = form.elements.displayName.value.trim();
  if (name.length < 2 || name.length > 40) return message('profileStatus', 'Informe um nome entre 2 e 40 caracteres.', true);
  button.disabled = true; message('profileStatus', 'Salvando perfil...');
  try {
    await updateProfile(user, { displayName: name });
    await ensureProfile(user, name);
    message('authMessage', 'Perfil salvo. Você já pode registrar suas capturas.');
  } catch (error) { message('profileStatus', explain(error), true); }
  finally { button.disabled = false; }
});

$('captureForm').elements.date.value = today();
$('captureForm').elements.date.max = today();
try { const local = JSON.parse(localStorage.getItem('mare-certa-location')); if (local?.name) $('captureForm').elements.location.value = local.name; } catch {}
$('captureForm').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget, button = form.querySelector('button[type="submit"]');
  const user = auth.currentUser;
  if (!user) return openAccount();
  button.disabled = true; message('captureMessage', 'Salvando captura...');
  let stage = 'Dados da captura';
  try {
    const fields = Object.fromEntries(['species', 'quantity', 'weight', 'date', 'location'].map(name => [name, form.elements.namedItem(name).value]));
    const capture = validateCapture(fields, user.uid, serverTimestamp(), today());
    stage = 'Perfil do pescador';
    if (!profileReady) await ensureProfile(user);
    stage = 'Gravação da captura';
    await push(ref(database, 'mareCerta/captures'), capture);
  } catch (error) {
    console.error('Falha ao salvar captura', { stage, code: error.code, name: error.name, message: error.message });
    message('captureMessage', `${explain(error, stage)} Os campos foram mantidos; sua captura não foi confirmada.`, true);
    return;
  } finally { button.disabled = false; }
  // Only clear the form after Firebase confirms the write, outside the save catch.
    form.elements.species.value = ''; form.elements.quantity.value = '1'; form.elements.weight.value = '';
    message('captureMessage', 'Captura salva! Seu ranking foi atualizado.');
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
