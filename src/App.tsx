import React, { useCallback, useEffect, useState } from 'react';
import type { Account } from './types/quote';
import { login, getSession, logout, onUnauthorized } from './lib/api';
import { loadToken, saveToken, clearToken, readClientToken, readResetToken, clearHash } from './lib/session';
import { PortalGate } from './components/portal/PortalGate';
import { PasswordChangeGate } from './components/portal/PasswordChangeGate';
import { ResetPasswordPage } from './components/portal/ResetPasswordPage';
import { ForgotPassword } from './components/portal/ForgotPassword';
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
  const [resetToken, setResetToken] = useState<string | null>(readResetToken);
  const [requestingReset, setRequestingReset] = useState(false);

  // Lien client (#/devis/<jeton>) : espace client, indépendant de toute session interne
  useEffect(() => {
    const onHash = () => {
      setClientToken(readClientToken());
      setResetToken(readResetToken());
    };
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

  const handleLogin = async (email: string, password: string) => {
    try {
      const res = await login(email, password);
      if (!res.ok || !res.token || !res.account) return res.error ?? 'invalid_credentials';
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

  // Lien reçu par e-mail (#/reset/<jeton>) : le jeton quitte l'adresse dès l'ouverture
  if (resetToken) {
    const leave = () => {
      clearHash();
      setResetToken(null);
    };
    if (requestingReset) {
      return <ForgotPassword onBack={() => { setRequestingReset(false); leave(); }} />;
    }
    return <ResetPasswordPage token={resetToken} onDone={leave} onRequestNew={() => setRequestingReset(true)} />;
  }

  if (booting) {
    return <div className="min-h-screen bg-white" />;
  }

  if (!session) {
    return <PortalGate onSubmit={handleLogin} notice={notice} />;
  }

  // Mot de passe provisoire : aucun accès à l'application avant son remplacement
  if (session.account.mustChangePassword) {
    return (
      <PasswordChangeGate
        token={session.token}
        onLogout={handleLogout}
        onDone={() =>
          getSession(session.token)
            .then((res) => {
              if (res) setSession({ token: session.token, account: res.account });
              else endSession('Votre session a expiré. Veuillez vous reconnecter.');
            })
            .catch(() => endSession('Connexion impossible. Veuillez vous reconnecter.'))
        }
      />
    );
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
