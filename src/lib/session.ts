// Le jeton de session vit dans sessionStorage : propre à l'onglet, jamais partagé entre deux comptes.
const KEY = 'rm_session_v4';

export function loadToken(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function saveToken(token: string): void {
  try {
    sessionStorage.setItem(KEY, token);
  } catch {
    // stockage indisponible : la session ne survivra pas au rechargement
  }
}

export function clearToken(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

/** Lien client : #/devis/<jeton de partage> */
const CLIENT_HASH = /^#\/devis\/([a-f0-9]{16,64})$/i;

export function readClientToken(): string | null {
  const m = CLIENT_HASH.exec(window.location.hash);
  return m ? m[1] : null;
}

export function buildClientLink(shareToken: string): string {
  return `${window.location.origin}${window.location.pathname}#/devis/${shareToken}`;
}

export function clearHash(): void {
  history.replaceState(null, '', window.location.pathname + window.location.search);
}
