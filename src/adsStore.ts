import { supabase } from '@/settingsStore';

const ADMIN_PASSCODE = '110106';

export interface AdItem {
  id: string;
  enabled: boolean;
  title: string;
  description: string;
  image: string | null;
  targetUrl: string;
  label: string;
  order: number;
}

export interface AdSettings {
  enabled: boolean;
  items: AdItem[];
}

export const DEFAULT_AD_SETTINGS: AdSettings = {
  enabled: false,
  items: [],
};

type SettingsListener = () => void;
const listeners = new Set<SettingsListener>();

let adSettings: AdSettings = { ...DEFAULT_AD_SETTINGS };
let loaded = false;

function notify() {
  listeners.forEach((l) => l());
}

export function subscribeAdSettings(listener: SettingsListener): () => void {
  listeners.add(listener);
  listener();
  return () => listeners.delete(listener);
}

export function getAdSettings(): AdSettings {
  return { ...adSettings, items: adSettings.items.map((i) => ({ ...i })) };
}

export async function fetchAdSettings(): Promise<void> {
  if (loaded) return;
  try {
    const { data, error } = await supabase.rpc('admin_get_setting', { p_key: 'ad_settings' });
    if (error) throw error;
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const parsed = data as Partial<AdSettings>;
      adSettings = {
        enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : false,
        items: Array.isArray(parsed.items) ? (parsed.items as unknown as Record<string, unknown>[]).map(normalizeAdItem) : [],
      };
      loaded = true;
      notify();
    }
  } catch {
    // use defaults
  }
}

export async function updateAdSettings(updates: Partial<AdSettings>): Promise<void> {
  const newSettings = { ...adSettings, ...updates };
  const { error } = await supabase.rpc('admin_set_setting', {
    p_passcode: ADMIN_PASSCODE,
    p_key: 'ad_settings',
    p_value: newSettings,
  });
  if (error) throw new Error(`Failed to save ad settings: ${error.message}`);
  adSettings = newSettings;
  notify();
}

export async function uploadAdImage(file: File): Promise<string | null> {
  try {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `ad-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
    const path = `ads/${fileName}`;
    const { error } = await supabase.storage.from('system-assets').upload(path, file, {
      contentType: file.type || 'image/jpeg',
      upsert: false,
    });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('system-assets').getPublicUrl(path);
    return urlData.publicUrl;
  } catch {
    return null;
  }
}

function normalizeAdItem(raw: Record<string, unknown>): AdItem {
  return {
    id: typeof raw.id === 'string' ? raw.id : String(raw.id ?? `ad-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : false,
    title: typeof raw.title === 'string' ? raw.title : '',
    description: typeof raw.description === 'string' ? raw.description : '',
    image: typeof raw.image === 'string' ? raw.image : null,
    targetUrl: typeof raw.targetUrl === 'string' ? raw.targetUrl : '',
    label: typeof raw.label === 'string' ? raw.label : '',
    order: typeof raw.order === 'number' ? raw.order : 0,
  };
}
