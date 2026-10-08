import { supabase } from './supabase';
import type {
  Account,
  PartnerAccount,
  QuoteSummary,
  QuoteRecord,
  QuoteData,
  QuoteStatus,
  ClientQuoteView,
} from '../types/quote';

export class ApiError extends Error {
  code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

/** Notifie l'application quand le serveur refuse le jeton (expiré, révoqué, compte désactivé). */
export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

async function call<T>(fn: string, args: Record<string, unknown>, authenticated = true): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    const code = /^[a-z_]+$/.test(error.message) ? error.message : 'network';
    if (code === 'unauthorized' && authenticated) {
      unauthorizedListeners.forEach((l) => l());
    }
    throw new ApiError(code);
  }
  return data as T;
}

export const ERROR_LABELS: Record<string, string> = {
  unauthorized: 'Session expirée. Reconnectez-vous.',
  forbidden: "Vous n'avez pas accès à cette ressource.",
  not_found: 'Élément introuvable.',
  locked: 'Ce devis est signé et ne peut plus être modifié.',
  network: 'Connexion au serveur impossible. Réessayez.',
  pin_unavailable: 'Ce code est déjà utilisé, choisissez-en un autre.',
  pin_required: 'Un code à 4 chiffres est requis.',
  invalid_pin_format: 'Le code doit comporter 4 chiffres.',
  name_required: 'Le nom est requis.',
  invalid_rate: 'Tarif journalier invalide.',
  invalid_signature: 'Signature invalide.',
};

export const errorMessage = (e: unknown): string =>
  e instanceof ApiError ? ERROR_LABELS[e.code] ?? 'Une erreur est survenue.' : 'Une erreur est survenue.';

// ----------------------------------------------------------------- session --

export interface LoginResult {
  ok: boolean;
  error?: 'invalid_pin' | 'too_many_attempts';
  token?: string;
  expiresAt?: string;
  account?: Account;
}

export const login = (pin: string) => call<LoginResult>('app_login', { p_pin: pin }, false);

export const getSession = (token: string) =>
  call<{ expiresAt: string; account: Account } | null>('app_session', { p_token: token }, false);

export const logout = (token: string) => call<boolean>('app_logout', { p_token: token }, false);

export const changePin = (token: string, oldPin: string, newPin: string) =>
  call<{ ok: boolean; error?: 'invalid_format' | 'wrong_pin' | 'pin_unavailable' }>('app_change_pin', {
    p_token: token,
    p_old: oldPin,
    p_new: newPin,
  });

export type AccountProfile = Pick<
  Account,
  'name' | 'tagline' | 'dailyRate' | 'contactName' | 'email' | 'phone' | 'address' | 'siret'
>;

export const updateAccount = (token: string, p: AccountProfile) =>
  call<Account>('app_account_update', {
    p_token: token,
    p_name: p.name,
    p_tagline: p.tagline,
    p_daily_rate: p.dailyRate,
    p_contact_name: p.contactName,
    p_email: p.email,
    p_phone: p.phone,
    p_address: p.address,
    p_siret: p.siret,
  });

// ---------------------------------------------------------------- partners --

export const listPartners = (token: string) =>
  call<PartnerAccount[]>('app_partners_list', { p_token: token });

export const savePartner = (
  token: string,
  id: string | null,
  p: AccountProfile & { active: boolean },
  pin: string | null
) =>
  call<Account>('app_partner_save', {
    p_token: token,
    p_id: id,
    p_name: p.name,
    p_tagline: p.tagline,
    p_daily_rate: p.dailyRate,
    p_contact_name: p.contactName,
    p_email: p.email,
    p_phone: p.phone,
    p_address: p.address,
    p_siret: p.siret,
    p_pin: pin,
    p_active: p.active,
  });

// ------------------------------------------------------------------ quotes --

export const listQuotes = (token: string) => call<QuoteSummary[]>('app_quote_list', { p_token: token });

export const getQuote = (token: string, id: string) =>
  call<QuoteRecord>('app_quote_get', { p_token: token, p_id: id });

export interface SaveQuoteInput {
  id: string | null;
  title: string;
  clientName: string;
  clientEmail: string;
  status: Exclude<QuoteStatus, 'signed'>;
  totalHt: number;
  data: QuoteData;
  expectedUpdatedAt: string | null;
}

export const saveQuote = (token: string, q: SaveQuoteInput) =>
  call<{ ok: boolean; conflict?: boolean; quote?: QuoteRecord }>('app_quote_save', {
    p_token: token,
    p_id: q.id,
    p_title: q.title,
    p_client_name: q.clientName,
    p_client_email: q.clientEmail,
    p_status: q.status,
    p_total_ht: q.totalHt,
    p_data: q.data,
    p_expected_updated_at: q.expectedUpdatedAt,
  });

export const deleteQuote = (token: string, id: string) =>
  call<boolean>('app_quote_delete', { p_token: token, p_id: id });

// ------------------------------------------------------------------ client --

export const getClientQuote = (shareToken: string) =>
  call<ClientQuoteView | null>('client_quote_get', { p_share_token: shareToken }, false);

export const updateClientOptions = (shareToken: string, quantities: Record<string, number>) =>
  call<{ ok: boolean; totalHt: number; updatedAt: string }>(
    'client_quote_update',
    { p_share_token: shareToken, p_quantities: quantities },
    false
  );

export const signClientQuote = (shareToken: string, name: string, signature: string) =>
  call<{ ok: boolean; signedAt: string }>(
    'client_quote_sign',
    { p_share_token: shareToken, p_name: name, p_signature: signature },
    false
  );
