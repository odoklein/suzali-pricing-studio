import { createClient } from '@supabase/supabase-js';
import type { PageModule, ClientMetadata, PricingSettings } from '../types/quote';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// If environment variables are missing during initial build or preview, use dummy fallback
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);

export interface SupabaseSyncState {
  isConfigured: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  error: string | null;
}

/**
 * Fetch a quote from Supabase by quote number
 */
export async function fetchQuoteFromSupabase(quoteNumber: string) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  try {
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('quote_number', quoteNumber)
      .single();

    if (quoteError || !quote) {
      console.warn('Quote not found or error in Supabase:', quoteError?.message);
      return null;
    }

    const { data: modules, error: modError } = await supabase
      .from('quote_modules')
      .select('*')
      .eq('quote_id', quote.id)
      .order('sort_order', { ascending: true });

    if (modError) {
      console.warn('Error fetching modules from Supabase:', modError.message);
    }

    return {
      quote,
      modules: modules || [],
    };
  } catch (err) {
    console.error('Failed to fetch from Supabase:', err);
    return null;
  }
}

/**
 * Save / Update quote and modules in Supabase
 */
export async function saveQuoteToSupabase(
  metadata: ClientMetadata,
  settings: PricingSettings,
  modules: PageModule[]
) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { success: false, error: 'Supabase credentials not configured' };
  }
  try {
    // 1. Upsert master quote
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .upsert(
        {
          quote_number: metadata.quoteNumber,
          project_name: metadata.projectName,
          client_company: metadata.clientCompany,
          client_contact: metadata.clientContact,
          client_email: metadata.clientEmail,
          client_address: metadata.clientAddress,
          partner_company: metadata.partnerCompany,
          partner_contact: metadata.partnerContact,
          partner_email: metadata.partnerEmail,
          pricing_mode: settings.mode,
          tjm_suzali: settings.tjmSuzali,
          partner_margin_percent: settings.partnerMarginPercent,
          management_days_fixed: settings.managementDaysFixed,
          vat_rate: settings.vatRate,
          discount_percent: settings.discountPercent,
          validity_days: metadata.validityDays,
          deposit_percentage: metadata.depositPercentage,
          notes: metadata.notes,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'quote_number' }
      )
      .select('id')
      .single();

    if (quoteError || !quote) {
      console.error('Error saving quote to Supabase:', quoteError);
      return { success: false, error: quoteError?.message };
    }

    // 2. Upsert quote modules
    const modulesPayload = modules.map((m, index) => ({
      quote_id: quote.id,
      module_id: m.id,
      name: m.name,
      category: m.category,
      description: m.description,
      included_details: m.includedDetails,
      base_price: m.basePrice,
      days: m.days,
      quantity: m.quantity,
      min_quantity: m.minQuantity || 0,
      is_custom: !!m.isCustom,
      sort_order: index + 1,
    }));

    const { error: modError } = await supabase
      .from('quote_modules')
      .upsert(modulesPayload, { onConflict: 'quote_id,module_id' });

    if (modError) {
      console.error('Error saving modules to Supabase:', modError);
      return { success: false, error: modError.message };
    }

    return { success: true, quoteId: quote.id };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Supabase save failed:', errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Save client signature to Supabase
 */
export async function saveSignatureToSupabase(
  quoteNumber: string,
  signerName: string,
  signatureDataUri: string
) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { success: false, error: 'Supabase credentials not configured' };
  }
  try {
    const { error } = await supabase
      .from('quotes')
      .update({
        signed_by: signerName,
        signed_at: new Date().toISOString(),
        signature_data_uri: signatureDataUri,
        status: 'approved',
        updated_at: new Date().toISOString(),
      })
      .eq('quote_number', quoteNumber);

    if (error) {
      console.error('Error updating signature in Supabase:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Supabase signature save failed:', errorMsg);
    return { success: false, error: errorMsg };
  }
}
