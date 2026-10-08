import React, { useRef, useState, useEffect } from 'react';
import type { PageModule, ClientMetadata, PricingSettings, QuoteCalculations } from '../../types/quote';
import { formatEuros, formatFrenchDate, addDays, getClientUnitPrice, displayQuoteNumber, CORE_MODULE_IDS, LOCATOR_MODULE_ID } from '../../utils/formatters';
import { saveSignatureToSupabase } from '../../lib/supabase';
import { 
  FileText, 
  Printer, 
  CheckCircle, 
  Eraser, 
  CheckSquare,
  Send,
  CloudCheck
} from 'lucide-react';

interface DevisOfficialA4Props {
  modules: PageModule[];
  metadata: ClientMetadata;
  settings: PricingSettings;
  calculations: QuoteCalculations;
  onClose?: () => void;
}

export const DevisOfficialA4: React.FC<DevisOfficialA4Props> = ({
  modules,
  metadata,
  settings,
  calculations,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [signerName, setSignerName] = useState(metadata.clientContact);
  const [signedDate, setSignedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [signedAt, setSignedAt] = useState<Date | null>(null);
  const [isSavingSignature, setIsSavingSignature] = useState(false);
  const [signatureSavedInDb, setSignatureSavedInDb] = useState(false);

  // Filter active modules
  const activeModules = modules.filter((m) => m.quantity > 0);

  // Périmètre contractuel verrouillé : 8 pages + Store Locator
  const lockedModules = activeModules.filter(
    (m) => CORE_MODULE_IDS.includes(m.id) || m.id === LOCATOR_MODULE_ID
  );
  const lockedPageCount = lockedModules.filter((m) => CORE_MODULE_IDS.includes(m.id)).length;
  const lockedScopeTotal = lockedModules.reduce(
    (sum, m) => sum + getClientUnitPrice(m, settings) * m.quantity,
    0
  );

  // Expiry date calculation
  const expirationDate = addDays(metadata.issueDate, metadata.validityDays);

  // Interactive Signature canvas setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    if (!hasSigned) setSignedAt(new Date());
    setHasSigned(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
    setSignedAt(null);
    setSignatureSavedInDb(false);
  };

  const handleSaveSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const signatureDataUri = canvas.toDataURL('image/png');
    setIsSavingSignature(true);
    const res = await saveSignatureToSupabase(metadata.quoteNumber, signerName, signatureDataUri);
    setIsSavingSignature(false);
    if (res.success) {
      setSignatureSavedInDb(true);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-slate-100/70 p-4 md:p-8 min-h-screen">
      
      {/* Top action toolbar (Hidden when printing) */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between no-print bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-slate-800" />
          <h2 className="font-bold text-slate-900 text-sm md:text-base">
            Prévisualisation du Devis Proforma Officiel A4
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              Fermer la vue
            </button>
          )}
          <button
            onClick={handlePrint}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-white hover:bg-slate-800 shadow-xs transition-all"
          >
            <Printer className="w-4 h-4 text-emerald-300" />
            <span>Imprimer / Télécharger en PDF</span>
          </button>
        </div>
      </div>

      {/* A4 Sheet Container */}
      <div className="max-w-4xl mx-auto bg-white border border-slate-200/90 shadow-sm p-8 sm:p-12 text-slate-900 text-xs font-sans print:shadow-none print:border-none print:p-0">
        
        {/* Header: Company & Client Identity */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-8 pb-8 border-b-2 border-slate-900">
          
          {/* Émetteur : Roeum Mak (seul interlocuteur visible du client) */}
          <div className="space-y-1.5 max-w-sm">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold text-sm">
                RM
              </div>
              <span className="text-base font-extrabold tracking-tight text-slate-900">
                ROEUM MAK
              </span>
            </div>
            <p className="font-semibold text-slate-800">
              Conseil & Développement Web
            </p>
            <p className="text-slate-600 text-[11px] leading-tight">
              {metadata.partnerContact}<br />
              {metadata.partnerAddress && <>{metadata.partnerAddress}<br /></>}
              {metadata.partnerSiret && <>SIRET : {metadata.partnerSiret}<br /></>}
              {metadata.partnerPhone && <>Tél : {metadata.partnerPhone}<br /></>}
              Email : {metadata.partnerEmail}
            </p>
          </div>

          {/* Destinataire: Client Final */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 w-full sm:w-80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Destinataire & Donneur d’Ordre
            </span>
            <div className="font-bold text-slate-900 text-sm mb-1">
              {metadata.clientCompany}
            </div>
            <div className="text-slate-700 font-medium">
              À l'attention de : {metadata.clientContact}
            </div>
            <div className="text-slate-600 text-[11px] mt-1 leading-snug">
              {metadata.clientAddress}
            </div>
            <div className="text-slate-600 text-[11px] mt-1 font-mono">
              {metadata.clientEmail}
            </div>
          </div>
        </div>

        {/* Devis Metadata Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-5 border-b border-slate-100 bg-slate-50/50 my-4 px-4 rounded-xl">
          <div>
            <span className="block text-[10px] uppercase font-semibold text-slate-400">N° Devis Proforma</span>
            <span className="font-mono font-bold text-slate-900 text-sm">{displayQuoteNumber(metadata.quoteNumber)}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-semibold text-slate-400">Date d'Émission</span>
            <span className="font-medium text-slate-800">{formatFrenchDate(metadata.issueDate)}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-semibold text-slate-400">Validité de l'Offre</span>
            <span className="font-medium text-slate-800">{metadata.validityDays} jours ({formatFrenchDate(expirationDate)})</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-semibold text-slate-400">Délai Estimé de Réalisation</span>
            <span className="font-mono font-bold text-slate-800">{calculations.totalDays} jours ouvrés</span>
          </div>
        </div>

        {/* Project Title & Context */}
        <div className="mb-6">
          <h1 className="text-lg font-bold text-slate-900">
            Objet de la Prestation : {metadata.projectName}
          </h1>
          <p className="text-slate-600 mt-1 text-xs leading-relaxed">
            {metadata.notes}
          </p>
        </div>

        {/* Line Items Table */}
        <div className="mb-6 overflow-hidden border border-slate-200 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3 w-10 text-center">Qté</th>
                <th className="py-2.5 px-3">Description & Spécification des Livrables Inclus</th>
                <th className="py-2.5 px-3 w-28 text-right">Prix Unitaire HT</th>
                <th className="py-2.5 px-3 w-28 text-right">Total HT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeModules.map((mod, index) => {
                const unitPrice = getClientUnitPrice(mod, settings);
                const lineTotal = unitPrice * mod.quantity;

                return (
                  <tr key={mod.id} className={index % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                    <td className="py-3 px-3 text-center font-mono font-bold align-top">
                      {mod.quantity}
                    </td>
                    <td className="py-3 px-3 align-top">
                      <div className="font-bold text-slate-900 text-xs mb-0.5">
                        {mod.name}
                      </div>
                      <div className="text-slate-600 text-[11px] mb-1">
                        {mod.description}
                      </div>
                      <div className="text-[11px] bg-slate-50 text-slate-900 p-1.5 rounded border border-slate-100 font-sans">
                        <strong className="text-slate-800 font-semibold">Inclus au devis : </strong>
                        {mod.includedDetails}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700 align-top">
                      {formatEuros(unitPrice)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 align-top">
                      {formatEuros(lineTotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals & Financial Breakdown */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8 page-break-inside-avoid">
          {/* Payment schedule info */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 space-y-1.5 flex-1">
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block">
              Modalités de Paiement & Échéancier
            </span>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>{metadata.depositPercentage}% à la commande</strong> ({formatEuros(calculations.totalTTC * (metadata.depositPercentage / 100))} TTC) pour réservation du sprint.</li>
              <li><strong>40% à la validation des maquettes</strong> et livraison de la version de recettage (V1).</li>
              <li><strong>Solde ({100 - metadata.depositPercentage - 40}%) à la mise en production</strong> et livraison des accès de gestion.</li>
            </ul>
            <div className="pt-2 text-[10px] text-slate-500">
              Règlement par virement bancaire sous 30 jours date d'émission.
            </div>
          </div>

          {/* Financial summary numbers */}
          <div className="w-full sm:w-72 bg-slate-900 text-white p-4 rounded-xl space-y-2">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Sous-Total HT</span>
              <span className="font-mono">{formatEuros(calculations.sellingPriceHT)}</span>
            </div>

            {calculations.discountAmount > 0 && (
              <div className="flex justify-between text-xs text-rose-300">
                <span>Remise Commerciale ({settings.discountPercent}%)</span>
                <span className="font-mono">-{formatEuros(calculations.discountAmount)}</span>
              </div>
            )}

            <div className="flex justify-between text-xs text-slate-300 pt-1 border-t border-slate-800">
              <span>Total Net HT</span>
              <span className="font-mono font-bold">{formatEuros(calculations.finalSellingPriceHT)}</span>
            </div>

            <div className="flex justify-between text-xs text-slate-300">
              <span>TVA (20,00 %)</span>
              <span className="font-mono">{formatEuros(calculations.vatAmount)}</span>
            </div>

            <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-slate-700">
              <span>Total Net TTC</span>
              <span className="font-mono text-emerald-300 text-base">{formatEuros(calculations.totalTTC)}</span>
            </div>

            <div className="pt-2 text-[11px] text-emerald-200 border-t border-slate-800 flex justify-between">
              <span>Acompte Requis ({metadata.depositPercentage}%) :</span>
              <span className="font-mono font-bold">{formatEuros(calculations.totalTTC * (metadata.depositPercentage / 100))}</span>
            </div>
          </div>
        </div>

        {/* Legal Terms & Safeguards (Contrat & Gouvernance) */}
        <div className="mb-6 p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[10px] text-slate-500 leading-snug space-y-1 page-break-inside-avoid">
          <strong className="text-slate-700 block">Conditions Générales d'Exécution & Cadre Contractuel :</strong>
          <p>
            1. <strong>Périmètre & Révisions</strong> : La prestation comprend deux (2) vagues d'ajustements/retours sur les maquettes et livrables inclus listés ci-dessus. Toute demande de révision supplémentaire, refonte de charte graphique, intégration de fonctionnalités non spécifiées ou retards dus à l’absence de fourniture des contenus entraînera l'émission d'un avenant tarifaire au taux journalier standard (TJM).
          </p>
          <p>
            2. <strong>Hébergement & Propriété Intellectuelle</strong> : Le code source est la propriété pleine et entière du client final après règlement intégral de l'ensemble des factures émises.
          </p>
          <p>
            3. <strong>Livrables verrouillés</strong> : le périmètre ferme du présent devis est limité à {lockedPageCount} pages + 1 module Store Locator, soit {formatEuros(lockedScopeTotal)} HT, dans les termes exacts des descriptifs « Inclus au devis » ci-dessus. Tout élément non listé est hors périmètre et fera l'objet d'un avenant signé avant réalisation.
          </p>
          <p>
            4. <strong>Pénalités de retard</strong> : Conformément aux articles L. 441-10 et D. 441-5 du Code de commerce, tout retard de règlement donne lieu de plein droit à des pénalités au taux légal en vigueur majoré de 10 points, ainsi qu’à une indemnité forfaitaire pour frais de recouvrement de 40 €.
          </p>
        </div>

        {/* Signature & Bon pour Accord Block */}
        <div className="border-2 border-slate-300 rounded-xl p-5 bg-white page-break-inside-avoid">
          <div className="flex justify-between items-center mb-3">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center space-x-1.5">
              <CheckSquare className="w-4 h-4 text-slate-800" />
              <span>Bon pour Accord & Ordre d'Exécution</span>
            </span>
            <span className="text-[11px] text-slate-500">
              Mention obligatoire : <em>"Bon pour accord et exécution de la prestation"</em>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 text-xs">
              <div>
                <label className="block text-slate-500 text-[11px] mb-1">Nom et prénom du signataire habilité :</label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-900 font-semibold"
                />
              </div>
              <div>
                <label className="block text-slate-500 text-[11px] mb-1">Fait à Lyon, le :</label>
                <input
                  type="date"
                  value={signedDate}
                  onChange={(e) => setSignedDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-900 font-mono"
                />
              </div>
              <div className="pt-2 text-[10px] text-slate-400 italic">
                En signant électroniquement, vous confirmez avoir le pouvoir légal d'engager la société {metadata.clientCompany} et acceptez l'intégralité des termes et livrables spécifiés au présent devis.
              </div>
            </div>

            {/* Signature Canvas */}
            <div>
              <div className="flex items-center justify-between mb-1 text-[11px]">
                <span className="text-slate-500">Signature tactile ou à la souris :</span>
                {hasSigned && (
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="text-rose-600 hover:text-rose-800 flex items-center space-x-1 no-print"
                  >
                    <Eraser className="w-3 h-3" />
                    <span>Effacer</span>
                  </button>
                )}
              </div>
              <div className="border border-slate-300 rounded-lg bg-slate-50/50 relative overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={340}
                  height={110}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-[110px] cursor-crosshair touch-none"
                />
                {!hasSigned && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs italic">
                    Signez ici
                  </div>
                )}
              </div>
              
              {/* Signature Action Buttons */}
              <div className="mt-2 flex items-center justify-between gap-2 no-print">
                {hasSigned && !signatureSavedInDb && (
                  <button
                    type="button"
                    onClick={handleSaveSignature}
                    disabled={isSavingSignature}
                    className="py-1.5 px-3 bg-slate-800 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-all shadow-xs"
                  >
                    <Send className="w-3 h-3" />
                    <span>{isSavingSignature ? 'Enregistrement...' : 'Valider & Transmettre la Signature'}</span>
                  </button>
                )}

                {signatureSavedInDb && (
                  <div className="flex items-center space-x-1 text-xs text-slate-800 font-bold bg-slate-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    <CloudCheck className="w-4 h-4 text-emerald-600" />
                    <span>Signature enregistrée</span>
                  </div>
                )}
              </div>

              {hasSigned && (
                <div className="mt-1 flex items-center space-x-1 text-[10px] text-emerald-700 font-medium">
                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                  <span>
                    Signé électroniquement le {signedAt ? formatFrenchDate(signedAt) : ''} à{' '}
                    <span className="font-mono">
                      {signedAt ? signedAt.toLocaleTimeString('fr-FR') : ''}
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
