import React, { useState } from 'react';
import type { Account } from '../../types/quote';
import { changePin, updateAccount, errorMessage, type AccountProfile } from '../../lib/api';
import { X } from 'lucide-react';

interface AccountModalProps {
  token: string;
  account: Account;
  onUpdated: (account: Account) => void;
  onClose: () => void;
}

const inputCls =
  'w-full px-3 py-2 rounded-xl border border-slate-100 shadow-sm bg-white text-sm text-slate-900 focus:outline-none focus:border-slate-900 transition-colors';

const PIN_ERRORS: Record<string, string> = {
  invalid_format: 'Le nouveau code doit comporter 4 chiffres.',
  wrong_pin: 'Code actuel incorrect.',
  pin_unavailable: 'Ce code est indisponible, choisissez-en un autre.',
};

export const AccountModal: React.FC<AccountModalProps> = ({ token, account, onUpdated, onClose }) => {
  const [profile, setProfile] = useState<AccountProfile>({
    name: account.name,
    tagline: account.tagline,
    dailyRate: account.dailyRate,
    contactName: account.contactName,
    email: account.email,
    phone: account.phone,
    address: account.address,
    siret: account.siret,
  });
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const canEditRate = account.role === 'owner' || account.role === 'admin';
  const set = <K extends keyof AccountProfile>(k: K, v: AccountProfile[K]) => setProfile((p) => ({ ...p, [k]: v }));

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      onUpdated(await updateAccount(token, profile));
      setMessage({ kind: 'ok', text: 'Profil enregistré. Il sera repris sur vos prochains devis.' });
    } catch (err) {
      setMessage({ kind: 'error', text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const savePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await changePin(token, oldPin, newPin);
      if (res.ok) {
        setOldPin('');
        setNewPin('');
        setMessage({ kind: 'ok', text: "Code d'accès modifié." });
      } else {
        setMessage({ kind: 'error', text: PIN_ERRORS[res.error ?? ''] ?? 'Modification impossible.' });
      }
    } catch (err) {
      setMessage({ kind: 'error', text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
      <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl border border-slate-100">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Mon compte</h2>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {message && (
            <p
              className={`text-xs rounded-xl px-4 py-3 border ${
                message.kind === 'ok'
                  ? 'text-emerald-800 bg-emerald-50 border-emerald-100'
                  : 'text-rose-700 bg-rose-50 border-rose-100'
              }`}
            >
              {message.text}
            </p>
          )}

          <form onSubmit={saveProfile} className="space-y-4">
            <h3 className="text-xs font-medium uppercase tracking-widest text-slate-400">Coordonnées sur les devis</h3>
            {(
              [
                ['Société', 'name'],
                ['Accroche', 'tagline'],
                ['Contact', 'contactName'],
                ['E-mail', 'email'],
                ['Téléphone', 'phone'],
                ['Adresse', 'address'],
                ['SIRET', 'siret'],
              ] as const
            ).map(([label, key]) => (
              <label key={key} className="block">
                <span className="block text-[11px] text-slate-400 mb-1">{label}</span>
                <input className={inputCls} value={profile[key]} onChange={(e) => set(key, e.target.value)} />
              </label>
            ))}
            {canEditRate && (
              <label className="block">
                <span className="block text-[11px] text-slate-400 mb-1">Tarif journalier par défaut (€ HT)</span>
                <input
                  type="number"
                  min={0}
                  max={5000}
                  step={5}
                  className={`${inputCls} font-mono`}
                  value={profile.dailyRate}
                  onChange={(e) => set('dailyRate', Number(e.target.value))}
                />
              </label>
            )}
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium disabled:opacity-60"
            >
              Enregistrer
            </button>
          </form>

          <form onSubmit={savePin} className="space-y-4">
            <h3 className="text-xs font-medium uppercase tracking-widest text-slate-400">Code d'accès</h3>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="Code actuel"
                className={`${inputCls} font-mono`}
                value={oldPin}
                onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ''))}
              />
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="Nouveau code"
                className={`${inputCls} font-mono`}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <button
              type="submit"
              disabled={busy || oldPin.length !== 4 || newPin.length !== 4}
              className="px-5 py-2.5 rounded-xl border border-slate-100 shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Changer mon code
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
