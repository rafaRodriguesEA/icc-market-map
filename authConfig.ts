import { AccessLevel, UserProfile } from './types';

/** Desative definindo VITE_SKIP_AUTH=false na Vercel antes de ir para produção. */
export const SKIP_AUTH = import.meta.env.VITE_SKIP_AUTH !== 'false';

export const normalizeProfile = (profile: UserProfile): UserProfile => ({
  ...profile,
  displayName: profile.displayName?.trim() || profile.email?.split('@')[0] || 'Usuário',
  email: profile.email || '',
  role: profile.role || 'N/A',
  department: profile.department || 'N/A',
});

export const firstName = (displayName?: string) =>
  (displayName?.trim() || 'Usuário').split(/\s+/)[0] || 'Usuário';

export const formatMoney = (value?: number) =>
  (value ?? 0).toLocaleString('pt-BR');

export const TEST_USER: UserProfile = {
  uid: 'dev-test-user',
  email: 'teste@icc.local',
  displayName: 'Usuário Teste',
  role: 'Admin (modo teste)',
  department: 'Testes',
  accessLevel: AccessLevel.SUPERADMIN,
  photoUrl: '',
};
