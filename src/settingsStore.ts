import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder-anon-key',
);

const ADMIN_PASSCODE = '110106';

export interface DockSettings {
  size: number;
  magnification: boolean;
  position: 'bottom' | 'left' | 'right';
  autoHide: boolean;
  iconSpacing: number;
}

export interface CustomIcon {
  [appId: string]: string | null;
}

export interface MenuBarSettings {
  showBattery: boolean;
  showWifi: boolean;
  showBluetooth: boolean;
  showClock: boolean;
}

export interface BrandingAssets {
  logoUrl: string | null;
  faviconUrl: string | null;
  startupUrl: string | null;
}

export const DEFAULT_DOCK_SETTINGS: DockSettings = {
  size: 48,
  magnification: true,
  position: 'bottom',
  autoHide: true,
  iconSpacing: 8,
};

export const DEFAULT_MENU_BAR_SETTINGS: MenuBarSettings = {
  showBattery: true,
  showWifi: true,
  showBluetooth: true,
  showClock: true,
};

export const DEFAULT_BRANDING: BrandingAssets = {
  logoUrl: null,
  faviconUrl: null,
  startupUrl: null,
};

type Listener = () => void;
const listeners = new Set<Listener>();
function notify() {
  listeners.forEach((l) => l());
}

export function subscribeSettings(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let dockSettings: DockSettings = { ...DEFAULT_DOCK_SETTINGS };
let customDockIcons: CustomIcon = {};
let customAppIcons: CustomIcon = {};
let menuBarSettings: MenuBarSettings = { ...DEFAULT_MENU_BAR_SETTINGS };
let brandingAssets: BrandingAssets = { ...DEFAULT_BRANDING };
let loaded = false;

export function getDockSettings(): DockSettings {
  return { ...dockSettings };
}

export function getCustomDockIcons(): CustomIcon {
  return { ...customDockIcons };
}

export function getCustomAppIcons(): CustomIcon {
  return { ...customAppIcons };
}

export function getMenuBarSettings(): MenuBarSettings {
  return { ...menuBarSettings };
}

export function getBrandingAssets(): BrandingAssets {
  return { ...brandingAssets };
}

export async function fetchSettings(): Promise<void> {
  if (loaded) return;
  try {
    const { data } = await supabase.from('admin_settings').select('key, value');
    if (data) {
      for (const row of data as { key: string; value: Record<string, unknown> }[]) {
        if (row.key === 'dock_settings') dockSettings = { ...DEFAULT_DOCK_SETTINGS, ...(row.value as Partial<DockSettings>) };
        if (row.key === 'custom_dock_icons') customDockIcons = row.value as CustomIcon;
        if (row.key === 'custom_app_icons') customAppIcons = row.value as CustomIcon;
        if (row.key === 'menu_bar_settings') menuBarSettings = { ...DEFAULT_MENU_BAR_SETTINGS, ...(row.value as Partial<MenuBarSettings>) };
        if (row.key === 'branding_assets') brandingAssets = { ...DEFAULT_BRANDING, ...(row.value as Partial<BrandingAssets>) };
      }
      loaded = true;
      notify();
    }
  } catch {
    // use defaults
  }
}

async function saveSetting(key: string, value: unknown): Promise<void> {
  const { error } = await supabase.rpc('admin_set_setting', {
    p_passcode: ADMIN_PASSCODE,
    p_key: key,
    p_value: value,
  });
  if (error) throw new Error(`Failed to save setting "${key}": ${error.message}`);
}

export async function updateDockSettings(updates: Partial<DockSettings>): Promise<void> {
  const newSettings = { ...dockSettings, ...updates };
  await saveSetting('dock_settings', newSettings);
  dockSettings = newSettings;
  notify();
}

export async function updateMenuBarSettings(updates: Partial<MenuBarSettings>): Promise<void> {
  const newSettings = { ...menuBarSettings, ...updates };
  await saveSetting('menu_bar_settings', newSettings);
  menuBarSettings = newSettings;
  notify();
}

export async function uploadIcon(appId: string, file: File, isDock: boolean): Promise<string | null> {
  try {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const fileName = `${isDock ? 'dock' : 'app'}-${appId}-${Date.now()}.${ext}`;
    const path = `icons/${fileName}`;
    const { error } = await supabase.storage.from('system-assets').upload(path, file, {
      contentType: file.type || 'image/png',
      upsert: false,
    });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('system-assets').getPublicUrl(path);
    const url = urlData.publicUrl;
    if (isDock) {
      customDockIcons[appId] = url;
      await saveSetting('custom_dock_icons', customDockIcons);
    } else {
      customAppIcons[appId] = url;
      await saveSetting('custom_app_icons', customAppIcons);
    }
    notify();
    return url;
  } catch {
    return null;
  }
}

export async function resetIcon(appId: string, isDock: boolean): Promise<void> {
  if (isDock) {
    delete customDockIcons[appId];
    await saveSetting('custom_dock_icons', customDockIcons);
  } else {
    delete customAppIcons[appId];
    await saveSetting('custom_app_icons', customAppIcons);
  }
  notify();
}

export async function uploadBrandingAsset(type: 'logoUrl' | 'faviconUrl' | 'startupUrl', file: File): Promise<string | null> {
  try {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const fileName = `branding-${type}-${Date.now()}.${ext}`;
    const path = `branding/${fileName}`;
    const { error } = await supabase.storage.from('system-assets').upload(path, file, {
      contentType: file.type || 'image/png',
      upsert: false,
    });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('system-assets').getPublicUrl(path);
    const url = urlData.publicUrl;
    brandingAssets[type] = url;
    await saveSetting('branding_assets', brandingAssets);
    notify();
    return url;
  } catch {
    return null;
  }
}

export async function resetBrandingAsset(type: 'logoUrl' | 'faviconUrl' | 'startupUrl'): Promise<void> {
  brandingAssets[type] = null;
  await saveSetting('branding_assets', brandingAssets);
  notify();
}

export async function uploadWallpaper(file: File): Promise<{ id: string; url: string; name: string } | null> {
  try {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `wallpaper-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
    const path = `uploads/${fileName}`;
    const { error } = await supabase.storage.from('wallpapers').upload(path, file, {
      contentType: file.type || 'image/jpeg',
      upsert: false,
    });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('wallpapers').getPublicUrl(path);
    const url = urlData.publicUrl;
    const { data, error: dbError } = await supabase
      .from('wallpapers')
      .insert({ url, name: file.name })
      .select('id, url, name')
      .single();
    if (dbError) throw dbError;
    return data as { id: string; url: string; name: string };
  } catch {
    return null;
  }
}

export async function renameWallpaper(id: string, name: string): Promise<void> {
  try {
    await supabase.rpc('admin_rename_wallpaper', { p_passcode: ADMIN_PASSCODE, p_id: id, p_name: name });
  } catch {
    // ignore
  }
}

export async function deleteWallpaper(id: string): Promise<void> {
  try {
    await supabase.rpc('admin_delete_wallpaper', { p_passcode: ADMIN_PASSCODE, p_id: id });
  } catch {
    // ignore
  }
}

export async function resetAllSettings(): Promise<void> {
  await saveSetting('dock_settings', DEFAULT_DOCK_SETTINGS);
  await saveSetting('custom_dock_icons', {});
  await saveSetting('custom_app_icons', {});
  await saveSetting('menu_bar_settings', DEFAULT_MENU_BAR_SETTINGS);
  await saveSetting('branding_assets', DEFAULT_BRANDING);
  dockSettings = { ...DEFAULT_DOCK_SETTINGS };
  customDockIcons = {};
  customAppIcons = {};
  menuBarSettings = { ...DEFAULT_MENU_BAR_SETTINGS };
  brandingAssets = { ...DEFAULT_BRANDING };
  notify();
}

export { supabase };
