import { supabase } from './supabase';
import type {
  Account,
  PartnerAccount,
  PriceList,
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
  password_change_required: 'Choisissez un nouveau mot de passe pour continuer.',
  password_required: 'Un mot de passe est requis.',
  invalid_password_format: 'Le mot de passe doit comporter au moins 10 caractères.',
  email_required: "Une adresse e-mail valide est requise : elle sert d'identifiant.",
  email_taken: 'Cette adresse e-mail est déjà utilisée par un autre compte.',
  name_required: 'Le nom est requis.',
  invalid_rate: 'Tarif journalier invalide.',
  invalid_signature: 'Signature invalide.',
  invalid_price_list: 'Grille de prix invalide : chaque prix doit être un montant positif.',
  price_list_required: 'Une grille de prix est requise pour un client du revendeur.',
  invalid_email: 'Adresse e-mail invalide.',
  no_reseller: 'Aucun compte revendeur actif pour rattacher ce client.',
};

export const errorMessage = (e: unknown): string =>
  e instanceof ApiError ? ERROR_LABELS[e.code] ?? 'Une erreur est survenue.' : 'Une erreur est survenue.';

// ----------------------------------------------------------------- session --

export interface LoginResult {
  ok: boolean;
  error?: 'invalid_credentials' | 'too_many_attempts';
  token?: string;
  expiresAt?: string;
  account?: Account;
}

export const login = (email: string, password: string) =>
  call<LoginResult>('app_login', { p_email: email, p_password: password }, false);

export const getSession = (token: string) =>
  call<{ expiresAt: string; account: Account } | null>('app_session', { p_token: token }, false);

export const logout = (token: string) => call<boolean>('app_logout', { p_token: token }, false);

export type ChangePasswordError = 'invalid_format' | 'wrong_password' | 'same_password' | 'too_many_attempts';

export const changePassword = (token: string, oldPassword: string, newPassword: string) =>
  call<{ ok: boolean; error?: ChangePasswordError }>('app_change_password', {
    p_token: token,
    p_old: oldPassword,
    p_new: newPassword,
  });

export type AccountProfile = Pick<
  Account,
  'name' | 'tagline' | 'dailyRate' | 'contactName' | 'email' | 'phone' | 'address' | 'siret'
>;

/** Coordonnées et mentions légales modifiables par le titulaire du compte */
export type OwnProfile = AccountProfile &
  Required<Pick<Account, 'legalForm' | 'shareCapital' | 'rcs' | 'vatNumber' | 'website'>>;

export const updateAccount = (token: string, p: OwnProfile) =>
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
    p_legal_form: p.legalForm,
    p_share_capital: p.shareCapital,
    p_rcs: p.rcs,
    p_vat_number: p.vatNumber,
    p_website: p.website,
  });

// ------------------------------------------------------- password recovery --

/** Envoie le lien de réinitialisation. Réponse identique que l'adresse existe ou non. */
export async function requestPasswordReset(email: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch('/.netlify/functions/request-reset', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    });
  } catch {
    throw new ApiError('network');
  }
  if (!res.ok) throw new ApiError(res.status === 400 ? 'invalid_email' : 'network');
}

export const checkResetToken = (token: string) => call<boolean>('app_reset_check', { p_token: token }, false);

export const resetPassword = (token: string, newPassword: string) =>
  call<{ ok: boolean; error?: 'invalid_format' | 'invalid_token' }>(
    'app_reset_password',
    { p_token: token, p_new: newPassword },
    false
  );

// ---------------------------------------------------------------- partners --

export const listPartners = (token: string) =>
  call<PartnerAccount[]>('app_partners_list', { p_token: token });

/**
 * `managed` : compte client du revendeur (prix imposés par sa grille). Ignoré pour le revendeur, dont tous les comptes le sont ;
 * `null` conserve l'état actuel. `priceList` : grille initiale d'un nouveau client (`null` conserve la grille actuelle).
 */
export const savePartner = (
  token: string,
  id: string | null,
  p: AccountProfile & { active: boolean },
  password: string | null,
  options: { managed: boolean | null; priceList: PriceList | null } = { managed: null, priceList: null }
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
    p_password: password,
    p_active: p.active,
    p_managed: options.managed,
    p_price_list: options.priceList,
  });

export const savePartnerPrices = (token: string, id: string, priceList: PriceList) =>
  call<Account>('app_partner_prices_save', { p_token: token, p_id: id, p_price_list: priceList });

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
  /** Compte pour lequel le devis est créé (revendeur ou régie) ; par défaut, le compte connecté */
  accountId?: string | null;
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
    p_account_id: q.accountId ?? null,
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
