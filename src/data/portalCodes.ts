import type { UserRole } from '../types/quote';

/** Codes d'accès par portail (source unique pour l'écran PIN et le changement d'espace) */
export const PORTAL_CODES: Record<UserRole, string[]> = {
  client: ['1234', '0000'],
  partner: ['5678', '2026'],
  admin: ['9999'],
};
