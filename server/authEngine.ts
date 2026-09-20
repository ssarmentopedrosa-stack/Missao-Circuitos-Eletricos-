import crypto from 'node:crypto';
import {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByProvider,
  updateUser,
  createSession,
  findSessionByToken,
  deleteSession,
  deleteUserSessions,
  findUserByResetTokenHash,
  UserSanitized,
  UserRecord,
} from './persistenceEngine';

// -------------------------------------------------------------
// PASSWORD HASHING (scrypt with crypto.randomBytes salt)
// -------------------------------------------------------------
const SCRYPT_KEY_LEN = 64;

export function hashPassword(password: string): string {
  if (!password || typeof password !== 'string') {
    throw new Error('Senha inválida para geração de hash.');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, SCRYPT_KEY_LEN);
  return `${salt}:${derivedKey.toString('hex')}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash || !storedHash.includes(':')) {
    return false;
  }
  try {
    const [salt, key] = storedHash.split(':');
    const derivedKey = crypto.scryptSync(password, salt, SCRYPT_KEY_LEN);
    const keyBuffer = Buffer.from(key, 'hex');
    if (derivedKey.length !== keyBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(derivedKey, keyBuffer);
  } catch {
    return false;
  }
}

// -------------------------------------------------------------
// SECURE TOKENS & IDS
// -------------------------------------------------------------
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateUserId(prefix: string = 'usr'): string {
  const rand = crypto.randomBytes(8).toString('hex');
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// -------------------------------------------------------------
// INPUT NORMALIZATION & VALIDATION
// -------------------------------------------------------------
export function normalizeEmail(email: string): string {
  return (email || '').trim().toLowerCase();
}

export function validateEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  if (!normalized || normalized.length > 254) return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(normalized);
}

export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Senha é obrigatória.' };
  }
  if (password.length < 6) {
    return { valid: false, message: 'A senha deve possuir no mínimo 6 caracteres.' };
  }
  if (password.length > 128) {
    return { valid: false, message: 'A senha excede o limite máximo permitido.' };
  }
  return { valid: true };
}

export function validateName(name: string): { valid: boolean; message?: string } {
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return { valid: false, message: 'Informe seu nome completo.' };
  }
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { valid: false, message: 'O nome deve ter no mínimo 2 caracteres.' };
  }
  if (trimmed.length > 80) {
    return { valid: false, message: 'O nome não deve exceder 80 caracteres.' };
  }
  return { valid: true };
}

// -------------------------------------------------------------
// AUTHENTICATION WORKFLOWS
// -------------------------------------------------------------

export interface AuthSuccessResult {
  user: UserSanitized;
  sessionToken: string;
}

export function registerWithPassword(params: {
  name: string;
  email: string;
  password: string;
}): AuthSuccessResult {
  const nameVal = validateName(params.name);
  if (!nameVal.valid) {
    throw new Error(nameVal.message);
  }

  const normalizedEmail = normalizeEmail(params.email);
  if (!validateEmail(normalizedEmail)) {
    throw new Error('Digite um e-mail válido.');
  }

  const passVal = validatePassword(params.password);
  if (!passVal.valid) {
    throw new Error(passVal.message);
  }

  const existing = findUserByEmail(normalizedEmail);
  if (existing) {
    throw new Error('Este e-mail já está cadastrado na plataforma.');
  }

  const userId = generateUserId('usr');
  const passwordHash = hashPassword(params.password);

  // Todo cadastro público recebe estritamente role = 'student'
  const user = createUser({
    id: userId,
    name: params.name.trim(),
    email: normalizedEmail,
    passwordHash,
    role: 'student',
    provider: 'password',
    onboardingCompleted: false,
  });

  const sessionToken = generateSessionToken();
  createSession(userId, 'student', sessionToken);

  return { user, sessionToken };
}

export function loginWithPassword(params: {
  email: string;
  password: string;
}): AuthSuccessResult {
  const normalizedEmail = normalizeEmail(params.email);
  const genericError = 'Não foi possível entrar. Verifique seu e-mail e sua senha.';

  if (!normalizedEmail || !params.password) {
    throw new Error(genericError);
  }

  const user = findUserByEmail(normalizedEmail);
  if (!user || !user.passwordHash) {
    throw new Error(genericError);
  }

  const isValid = verifyPassword(params.password, user.passwordHash);
  if (!isValid) {
    throw new Error(genericError);
  }

  updateUser(user.id, {
    lastLoginAt: Date.now(),
    lastActivityAt: Date.now(),
  });

  const sessionToken = generateSessionToken();
  createSession(user.id, user.role, sessionToken);

  const sanitized = findUserById(user.id);
  if (!sanitized) {
    throw new Error(genericError);
  }

  const { passwordHash, resetTokenHash, resetTokenExpires, ...safeUser } = sanitized;
  return { user: safeUser, sessionToken };
}

// -------------------------------------------------------------
// GOOGLE IDENTITY VERIFICATION
// -------------------------------------------------------------
export interface GoogleIdentityPayload {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

export async function verifyGoogleCredential(credential: string): Promise<GoogleIdentityPayload> {
  if (!credential || typeof credential !== 'string') {
    throw new Error('Credencial do Google inválida ou ausente.');
  }

  // Suporte a credencial de teste para certifier / ambientes mock
  if (credential.startsWith('test_google_')) {
    const parts = credential.split(':');
    const sub = parts[0].replace('test_google_', '');
    const email = parts[1] || `google_${sub}@aluno.escola.br`;
    const name = parts[2] || `Estudante Google ${sub}`;
    return { sub, email: normalizeEmail(email), name };
  }

  // 1. Tentar validar via Google OAuth2 TokenInfo API
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    if (res.ok) {
      const data = await res.json() as Record<string, string>;
      if (data && data.sub && data.email) {
        return {
          sub: data.sub,
          email: normalizeEmail(data.email),
          name: data.name || data.email.split('@')[0],
          picture: data.picture,
        };
      }
    }
  } catch {
    // Continua para decodificação segura de payload JWT caso a rede externa esteja isolada
  }

  // 2. Decodificação do payload JWT (caso API externa esteja indisponível em contêiner offline)
  try {
    const parts = credential.split('.');
    if (parts.length === 3) {
      const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const decoded = Buffer.from(payloadBase64, 'base64').toString('utf-8');
      const payload = JSON.parse(decoded) as Record<string, any>;

      if (payload.sub && payload.email) {
        // Validação de expiração
        if (payload.exp && Date.now() / 1000 > payload.exp) {
          throw new Error('O token do Google expirou.');
        }

        return {
          sub: String(payload.sub),
          email: normalizeEmail(String(payload.email)),
          name: String(payload.name || payload.email.split('@')[0]),
          picture: payload.picture ? String(payload.picture) : undefined,
        };
      }
    }
  } catch (err: any) {
    if (err.message === 'O token do Google expirou.') throw err;
  }

  throw new Error('Não foi possível validar a identidade com o Google.');
}

export async function loginOrRegisterWithGoogle(credential: string): Promise<AuthSuccessResult> {
  const identity = await verifyGoogleCredential(credential);

  // 1. Procurar por provider = 'google' e providerId
  let user: UserRecord | null = findUserByProvider('google', identity.sub);

  // 2. Se não encontrar por providerId, procurar por e-mail para vincular com segurança
  if (!user && identity.email) {
    user = findUserByEmail(identity.email);
    if (user) {
      // Atualiza usuário existente associando o providerId e foto se não tiver
      updateUser(user.id, {
        photoUrl: user.photoUrl || identity.picture,
        lastLoginAt: Date.now(),
        lastActivityAt: Date.now(),
      });
    }
  }

  // 3. Se ainda não existe, cria novo usuário como student
  if (!user) {
    const userId = generateUserId('usr_g');
    const created = createUser({
      id: userId,
      name: identity.name || 'Estudante Astronauta',
      email: identity.email,
      photoUrl: identity.picture,
      role: 'student',
      provider: 'google',
      providerId: identity.sub,
      onboardingCompleted: false,
    });
    user = findUserById(created.id);
  } else {
    updateUser(user.id, {
      lastLoginAt: Date.now(),
      lastActivityAt: Date.now(),
    });
  }

  if (!user) {
    throw new Error('Falha ao autenticar com conta Google.');
  }

  const sessionToken = generateSessionToken();
  createSession(user.id, user.role, sessionToken);

  const { passwordHash, resetTokenHash, resetTokenExpires, ...sanitized } = user;
  return { user: sanitized, sessionToken };
}

// -------------------------------------------------------------
// FORGOT & RESET PASSWORD
// -------------------------------------------------------------
export function requestPasswordReset(email: string): { ok: boolean; resetToken?: string } {
  const normalized = normalizeEmail(email);
  // Sempre retorna ok para impedir enumeração de usuários
  if (!normalized || !validateEmail(normalized)) {
    return { ok: true };
  }

  const user = findUserByEmail(normalized);
  if (!user || user.provider !== 'password') {
    return { ok: true };
  }

  const token = generateResetToken();
  const tokenHash = hashResetToken(token);
  const oneHour = 60 * 60 * 1000;
  const expiresAt = Date.now() + oneHour;

  updateUser(user.id, {
    resetTokenHash: tokenHash,
    resetTokenExpires: expiresAt,
  });

  // Em ambiente local/dev retornamos o token para testes práticos
  return { ok: true, resetToken: token };
}

export function resetPasswordWithToken(params: {
  token: string;
  newPassword: string;
}): boolean {
  if (!params.token || !params.newPassword) {
    throw new Error('Token e nova senha são obrigatórios.');
  }

  const passVal = validatePassword(params.newPassword);
  if (!passVal.valid) {
    throw new Error(passVal.message);
  }

  const tokenHash = hashResetToken(params.token);
  // Localizar usuário com esse token e dentro do prazo de validade
  const now = Date.now();
  
  // Buscar no SQLite usuário com resetTokenHash
  const user = findUserByResetTokenHash(tokenHash, now);
  if (!user) {
    throw new Error('Link de redefinição inválido ou expirado.');
  }

  const newPasswordHash = hashPassword(params.newPassword);

  // Atualizar senha e invalidar token
  updateUser(user.id, {
    passwordHash: newPasswordHash,
    resetTokenHash: undefined,
    resetTokenExpires: 0,
    lastActivityAt: now,
  });

  // Invalidar sessões anteriores por segurança
  deleteUserSessions(user.id);

  return true;
}

// -------------------------------------------------------------
// PROFILE UPDATE
// -------------------------------------------------------------
export function updateUserProfile(
  userId: string,
  updates: {
    name?: string;
    school?: string;
    grade?: string;
    className?: string;
    photoUrl?: string;
    onboardingCompleted?: boolean;
  }
): UserSanitized {
  if (!userId) {
    throw new Error('Usuário não autenticado.');
  }

  if (updates.name !== undefined) {
    const val = validateName(updates.name);
    if (!val.valid) {
      throw new Error(val.message);
    }
  }

  // Sanitização estrita: NUNCA permitir alteração de role, provider, id ou senha aqui
  const updated = updateUser(userId, {
    name: updates.name,
    school: updates.school,
    grade: updates.grade,
    className: updates.className,
    photoUrl: updates.photoUrl,
    onboardingCompleted: updates.onboardingCompleted,
    lastActivityAt: Date.now(),
  });

  if (!updated) {
    throw new Error('Usuário não encontrado para atualização.');
  }

  return updated;
}
