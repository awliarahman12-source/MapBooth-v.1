import { supabase, subscribeSettings } from '@/settingsStore';

const ADMIN_PASSCODE = '110106';

export interface SystemSettings {
  deviceName: string;
  model: string;
  chip: string;
  ram: string;
  storage: string;
  resolution: string;
  display: string;
  refreshRate: string;
  macosVersion: string;
  graphics: string;
  battery: string;
  wifi: string;
  bluetooth: string;
}

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  deviceName: 'MacBook Pro',
  model: 'MacBook Pro 16-inch',
  chip: 'Apple M3 Max',
  ram: '36 GB',
  storage: '1 TB SSD',
  resolution: '3456 x 2234',
  display: 'Liquid Retina XDR 16"',
  refreshRate: '120Hz ProMotion',
  macosVersion: 'macOS Tahoe 15.0',
  graphics: '40-core GPU',
  battery: '100% — Charged',
  wifi: 'Connected — TahoeNet',
  bluetooth: 'On',
};

let systemSettings: SystemSettings = { ...DEFAULT_SYSTEM_SETTINGS };
type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l());
}

export function subscribeSystemSettings(listener: Listener): () => void {
  listeners.add(listener);
  listener();
  return () => listeners.delete(listener);
}

export function getSystemSettings(): SystemSettings {
  return { ...systemSettings };
}

export async function fetchSystemSettings(): Promise<void> {
  try {
    const { data } = await supabase.rpc('admin_get_setting', { p_key: 'system_settings' });
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      systemSettings = { ...DEFAULT_SYSTEM_SETTINGS, ...(data as Partial<SystemSettings>) };
      notify();
    }
  } catch {
    // use defaults
  }
}

export async function updateSystemSettings(updates: Partial<SystemSettings>): Promise<void> {
  const newSettings = { ...systemSettings, ...updates };
  const { error } = await supabase.rpc('admin_set_setting', {
    p_passcode: ADMIN_PASSCODE,
    p_key: 'system_settings',
    p_value: newSettings,
  });
  if (error) throw new Error(`Failed to save system settings: ${error.message}`);
  systemSettings = newSettings;
  notify();
}

export async function resetSystemSettings(): Promise<void> {
  const { error } = await supabase.rpc('admin_set_setting', {
    p_passcode: ADMIN_PASSCODE,
    p_key: 'system_settings',
    p_value: DEFAULT_SYSTEM_SETTINGS,
  });
  if (error) throw new Error(`Failed to reset system settings: ${error.message}`);
  systemSettings = { ...DEFAULT_SYSTEM_SETTINGS };
  notify();
}

// Re-export subscribeSettings so consumers can listen to the settings bus
export { subscribeSettings };
