export class CaptureValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CaptureValidationError';
  }
}

export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function explainError(error, stage = '') {
  if (error instanceof CaptureValidationError) return error.message;
  const code = String(error?.code || '').toLowerCase().replaceAll('_', '-');
  const messages = {
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/email-already-in-use': 'Este e-mail já tem uma conta. Use Entrar.',
    'auth/weak-password': 'Use uma senha de pelo menos 6 caracteres.',
    'auth/invalid-email': 'Informe um e-mail válido.',
    'auth/operation-not-allowed': 'Ative o login por e-mail no Firebase Authentication.',
    'auth/configuration-not-found': 'Configure o Firebase Authentication deste site.',
    'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco e tente novamente.',
    'auth/network-request-failed': 'Verifique sua conexão e tente novamente.',
    'permission-denied': 'O Firebase recusou a gravação. Publique as regras de database.rules.json no Realtime Database (não no Firestore).',
    'database/permission-denied': 'O Firebase recusou a gravação. Confira as regras do Realtime Database.',
    'unavailable': 'O Firebase está temporariamente indisponível. Aguarde e tente novamente.',
    'disconnected': 'A conexão com o Firebase caiu. Reconecte e tente novamente.',
    'expired-token': 'Sua sessão expirou. Saia da conta e entre novamente.',
    'invalid-token': 'Sua sessão não é válida. Saia da conta e entre novamente.'
  };
  const detail = messages[code] || `Erro ${error?.code || error?.name || 'desconhecido'}. ${error instanceof TypeError ? error.message : 'Não foi possível concluir esta operação.'}`;
  return `${stage ? `${stage}: ` : ''}${detail}`;
}
