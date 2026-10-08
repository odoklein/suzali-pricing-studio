import React, { useCallback, useEffect, useState } from 'react';
import type { Account } from './types/quote';
import { login, getSession, logout, onUnauthorized } from './lib/api';
import { loadToken, saveToken, clearToken, readClientToken, clearHash } from './lib/session';
import { PortalGate } from './components/portal/PortalGate';
import { ClientPortal } from './components/client/ClientPortal';
import { StaffApp } from './components/staff/StaffApp';

interface Session {
  token: string;
  account: Account;
}

export const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [booting, setBooting] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [clientToken, setClientToken] = useState<string | null>(readClientToken);

  // Lien client (#/devis/<jeton>) : espace client, indépendant de toute session interne
  useEffect(() => {
    const onHash = () => setClientToken(readClientToken());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const endSession = useCallback((message: string | null) => {
    clearToken();
    clearHash();
    setSession(null);
    setNotice(message);
  }, []);

  // Reprise de session au chargement : le serveur dit si le jeton est encore valide
  useEffect(() => {
    const token = loadToken();
    if (!token) {
      setBooting(false);
      return;
    }
    let cancelled = false;
    getSession(token)
      .then((res) => {
        if (cancelled) return;
        if (res) setSession({ token, account: res.account });
        else clearToken();
      })
      .catch(() => {
        if (!cancelled) clearToken();
      })
      .finally(() => {
        if (!cancelled) setBooting(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Le serveur peut révoquer une session (expiration, compte désactivé) : retour à l'écran de code
  useEffect(
    () => onUnauthorized(() => endSession('Votre session a expiré. Veuillez vous reconnecter.')),
    [endSession]
  );

  // Re-validation au retour sur l'onglet (session expirée ou révoquée pendant l'absence)
  useEffect(() => {
    if (!session) return;
    const check = () => {
      if (document.visibilityState !== 'visible') return;
      getSession(session.token)
        .then((res) => {
          if (!res) endSession('Votre session a expiré. Veuillez vous reconnecter.');
        })
        .catch(() => undefined);
    };
    document.addEventListener('visibilitychange', check);
    return () => document.removeEventListener('visibilitychange', check);
  }, [session, endSession]);

  const handleLogin = async (pin: string) => {
    try {
      const res = await login(pin);
      if (!res.ok || !res.token || !res.account) return res.error ?? 'invalid_pin';
      saveToken(res.token);
      clearHash();
      setNotice(null);
      setSession({ token: res.token, account: res.account });
      return null;
    } catch {
      return 'network' as const;
    }
  };

  const handleLogout = async () => {
    const token = session?.token;
    // l'état local est vidé immédiatement, la révocation serveur suit
    endSession(null);
    if (token) {
      try {
        await logout(token);
      } catch {
        // à défaut, la session expirera d'elle-même côté serveur (12 h)
      }
    }
  };

  if (clientToken) {
    return <ClientPortal key={clientToken} shareToken={clientToken} />;
  }

  if (booting) {
    return <div className="min-h-screen bg-white" />;
  }

  if (!session) {
    return <PortalGate onSubmit={handleLogin} notice={notice} />;
  }

  return (
    <StaffApp
      // une nouvelle session repart toujours d'un état vierge
      key={session.token}
      token={session.token}
      account={session.account}
      onAccountUpdated={(account) => setSession((s) => (s ? { ...s, account } : s))}
      onLogout={handleLogout}
    />
  );
};

export default App;
