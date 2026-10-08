import React, { useCallback, useEffect, useState } from 'react';
import type { PartnerAccount } from '../../types/quote';
import { listPartners, savePartner, errorMessage, type AccountProfile } from '../../lib/api';
import { formatEuros } from '../../utils/formatters';
import { Plus, X } from 'lucide-react';

interface PartnersPanelProps {
  token: string;
}

interface FormState extends AccountProfile {
  id: string | null;
  active: boolean;
  pin: string;
}

const emptyForm: FormState = {
  id: null,
  name: '',
  tagline: '',
  dailyRate: 175,
  contactName: '',
  email: '',
  phone: '',
  address: '',
  siret: '',
  active: true,
  pin: '',
};

const inputCls =
  'w-full px-3 py-2 rounded-xl border border-slate-100 shadow-sm bg-white text-sm text-slate-900 focus:outline-none focus:border-slate-900 transition-colors';

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="block text-[11px] text-slate-400 mb-1">{label}</span>
    {children}
  </label>
);

export const PartnersPanel: React.FC<PartnersPanelProps> = ({ token }) => {
  const [partners, setPartners] = useState<PartnerAccount[] | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [createdPin, setCreatedPin] = useState<{ name: string; pin: string } | null>(null);

  const refresh = useCallback(async () => {
    try {
      setPartners(await listPartners(token));
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const pin = form.pin.trim() === '' ? null : form.pin.trim();
      await savePartner(token, form.id, form, pin);
      if (form.id === null && pin) setCreatedPin({ name: form.name, pin });
      setForm(null);
      await refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Partenaires</h1>
          <p className="text-sm text-slate-500 mt-1">
            Chaque partenaire a son espace, son code et son tarif journalier de base.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setForm({ ...emptyForm });
            setCreatedPin(null);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau partenaire</span>
        </button>
      </div>

      {error && (
        <p className="mb-6 text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{error}</p>
      )}

      {createdPin && (
        <p className="mb-6 text-sm text-slate-700 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
          Compte créé pour <strong>{createdPin.name}</strong>. Code d'accès à lui transmettre :{' '}
          <span className="font-mono font-semibold text-slate-900">{createdPin.pin}</span> (il ne sera plus affiché).
        </p>
      )}

      {form && (
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-slate-900">{form.id ? 'Modifier le partenaire' : 'Nouveau partenaire'}</h2>
            <button type="button" onClick={() => setForm(null)} className="p-1.5 text-slate-400 hover:text-slate-800">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Nom de la société">
              <input required className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} />
            </Field>
            <Field label="Accroche (sous le nom)">
              <input className={inputCls} value={form.tagline} onChange={(e) => set('tagline', e.target.value)} />
            </Field>
            <Field label="Tarif journalier de base (€ HT / jour)">
              <input
                type="number"
                min={0}
                max={5000}
                step={5}
                required
                className={`${inputCls} font-mono`}
                value={form.dailyRate}
                onChange={(e) => set('dailyRate', Number(e.target.value))}
              />
            </Field>
            <Field label="Contact">
              <input className={inputCls} value={form.contactName} onChange={(e) => set('contactName', e.target.value)} />
            </Field>
            <Field label="E-mail">
              <input type="email" className={inputCls} value={form.email} onChange={(e) => set('email', e.target.value)} />
            </Field>
            <Field label="Téléphone">
              <input className={inputCls} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </Field>
            <Field label="Adresse">
              <input className={inputCls} value={form.address} onChange={(e) => set('address', e.target.value)} />
            </Field>
            <Field label="SIRET">
              <input className={inputCls} value={form.siret} onChange={(e) => set('siret', e.target.value)} />
            </Field>
            <Field label={form.id ? 'Nouveau code (laisser vide pour conserver)' : "Code d'accès (4 chiffres)"}>
              <input
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                required={!form.id}
                className={`${inputCls} font-mono tracking-widest`}
                value={form.pin}
                onChange={(e) => set('pin', e.target.value.replace(/\D/g, ''))}
              />
            </Field>
          </div>
          <div className="mt-5 flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} />
              Compte actif
            </label>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium disabled:opacity-60"
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {partners === null && <p className="text-sm text-slate-400">Chargement…</p>}
        {partners?.length === 0 && (
          <p className="text-sm text-slate-400">Aucun partenaire. Créez le premier avec le bouton ci-dessus.</p>
        )}
        {partners?.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-900">{p.name}</p>
                <p className="text-xs text-slate-400">{p.contactName || p.email || '—'}</p>
              </div>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full border ${
                  p.active ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-100'
                }`}
              >
                {p.active ? 'Actif' : 'Désactivé'}
              </span>
            </div>
            <dl className="grid grid-cols-3 gap-4 mt-5 text-sm">
              <div>
                <dt className="text-[11px] text-slate-400">Tarif / jour</dt>
                <dd className="font-mono text-slate-900">{formatEuros(p.dailyRate, false)}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-400">Devis</dt>
                <dd className="font-mono text-slate-900">{p.quoteCount}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-400">Signés</dt>
                <dd className="font-mono text-slate-900">{p.signedCount}</dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={() => {
                setForm({ ...p, pin: '' });
                setCreatedPin(null);
              }}
              className="mt-5 text-xs font-medium text-slate-600 hover:text-slate-900 underline underline-offset-4"
            >
              Modifier
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
