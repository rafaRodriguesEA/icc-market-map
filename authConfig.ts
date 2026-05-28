import { AccessLevel, UserProfile } from './types';

/** Desative definindo VITE_SKIP_AUTH=false na Vercel antes de ir para produção. */
export const SKIP_AUTH = import.meta.env.VITE_SKIP_AUTH !== 'false';

export const TEST_USER: UserProfile = {
  uid: 'dev-test-user',
  email: 'teste@icc.local',
  displayName: 'Usuário Teste',
  role: 'Admin (modo teste)',
  department: 'Testes',
  accessLevel: AccessLevel.SUPERADMIN,
  photoUrl: '',
};
