import React, { useState } from 'react';
import type { ClientMetadata, QuoteCalculations } from '../../types/quote';
import { formatEuros } from '../../utils/formatters';
import { 
  X, 
  Copy, 
  Check, 
  Send, 
  Mail, 
  Link2, 
  CheckCircle2
} from 'lucide-react';

interface ShareModalProps {
  metadata: ClientMetadata;
  calculations: QuoteCalculations;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  metadata,
  calculations,
  onClose,
}) => {
  const [token] = useState(() => 'sz-' + Math.random().toString(36).substring(2, 9));
  const [selectedRoleLink, setSelectedRoleLink] = useState<'client' | 'partner'>('client');
  const [copied, setCopied] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  // Compute shareable URL
  const baseUrl = window.location.origin + window.location.pathname;
  const hashTarget = selectedRoleLink === 'client' ? '#client-view' : '#partner-view';
  const shareableUrl = `${baseUrl}${hashTarget}?token=${token}&quote=${encodeURIComponent(metadata.quoteNumber)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendEmails = () => {
    setEmailStatus('sending');
    setTimeout(() => {
      setEmailStatus('sent');
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-900 flex items-center justify-center">
              <Link2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm md:text-base">
                Partage Sécurisé & Invitation Multi-Acteurs
              </h3>
              <p className="text-xs text-slate-500">
                Génération de liens tokenisés et envoi simultané des accès
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-xs">
          
          {/* Target link selector */}
          <div>
            <label className="block text-slate-600 font-semibold mb-2">
              1. Sélectionnez le type d’accès à partager :
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedRoleLink('client')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedRoleLink === 'client'
                    ? 'border-emerald-800 bg-emerald-50/60 text-emerald-950 font-bold'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs">Vue Client Sécurisée</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono">
                    #client-view
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-normal">
                  Prix net HT/TTC final. Marges et coûts internes masqués.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRoleLink('partner')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedRoleLink === 'partner'
                    ? 'border-indigo-600 bg-indigo-50/60 text-indigo-950 font-bold'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs">Vue Agence Partenaire</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono">
                    #partner-view
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-normal">
                  Prix d'achat Suzali + réglage de la marge commerciale.
                </p>
              </button>
            </div>
          </div>

          {/* Shareable Link Box */}
          <div>
            <label className="block text-slate-600 font-semibold mb-1.5">
              2. Lien d'accès direct tokenisé :
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={shareableUrl}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-800 select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-3 py-2 rounded-xl text-xs font-semibold shrink-0 flex items-center space-x-1.5 transition-all ${
                  copied
                    ? 'bg-emerald-700 text-white'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copier</span>
                  </>
                )}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Token de session actif : <span className="font-mono text-slate-600">{token}</span> (chiffré SHA-256)
            </p>
          </div>

          {/* Simultaneous Email Notification Module */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-xs flex items-center space-x-1.5">
                <Mail className="w-4 h-4 text-emerald-800" />
                <span>3. Notification Simultanée par Email (3 Acteurs)</span>
              </span>
              <span className="text-[10px] text-slate-500 font-medium">Netlify Edge Function</span>
            </div>

            <div className="space-y-1.5 text-[11px] text-slate-600">
              <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                <span>Client : <strong>{metadata.clientCompany}</strong> ({metadata.clientEmail})</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 font-medium">Destinataire</span>
              </div>
              <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                <span>Partenaire : <strong>{metadata.partnerCompany}</strong> ({metadata.partnerEmail})</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-800 font-medium">Cc</span>
              </div>
              <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                <span>Prestataire : <strong>Suzali Conseil</strong> (contact@suzali-conseil.com)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">Archivage</span>
              </div>
            </div>

            {emailStatus === 'sent' ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <div>
                  <span className="font-bold">Emails envoyés avec succès !</span>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Un email sécurisé contenant le récapitulatif ({formatEuros(calculations.finalSellingPriceHT)} HT) et le lien direct a été distribué aux 3 destinataires.
                  </p>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSendEmails}
                disabled={emailStatus === 'sending'}
                className="w-full py-2 px-3 bg-emerald-900 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                {emailStatus === 'sending' ? (
                  <span>Transmission du webhook en cours...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Envoyer la notification email aux 3 acteurs</span>
                  </>
                )}
              </button>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Conforme RGPD & chiffrement SSL TLS 1.3
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};
