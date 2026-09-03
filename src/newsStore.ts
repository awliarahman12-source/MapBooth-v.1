import { supabase } from '@/settingsStore';

const ADMIN_PASSCODE = '110106';

export interface NewsItem {
  id: string;
  title: string;
  subtitle: string;
  cover_url: string | null;
  photos: string[];
  date: string;
  active: boolean;
  sort_order: number;
  created_at: string;
}

export interface NewsSettings {
  enabled: boolean;
  showOnStartup: boolean;
  oncePerSession: boolean;
  allowClose: boolean;
  autoOpenDelay: number;
  defaultNewsId: string | null;
  animation: 'fade' | 'slide' | 'scale' | 'none';
}

export const DEFAULT_NEWS_SETTINGS: NewsSettings = {
  enabled: true,
  showOnStartup: false,
  oncePerSession: true,
  allowClose: true,
  autoOpenDelay: 1500,
  defaultNewsId: null,
  animation: 'scale',
};

type NewsListener = (items: NewsItem[]) => void;
type SettingsListener = () => void;

const newsListeners = new Set<NewsListener>();
const settingsListeners = new Set<SettingsListener>();

let publicNews: NewsItem[] = [];
let adminNews: NewsItem[] = [];
let newsSettings: NewsSettings = { ...DEFAULT_NEWS_SETTINGS };
let settingsLoaded = false;
let newsLoaded = false;

function notifyNews() {
  newsListeners.forEach((l) => l([...adminNews]));
}

function notifySettings() {
  settingsListeners.forEach((l) => l());
}

// === Subscriptions ===

export function subscribeNews(listener: NewsListener): () => void {
  newsListeners.add(listener);
  listener([...adminNews]);
  return () => newsListeners.delete(listener);
}

export function subscribeNewsSettings(listener: SettingsListener): () => void {
  settingsListeners.add(listener);
  listener();
  return () => settingsListeners.delete(listener);
}

// === Getters ===

export function getNewsSettings(): NewsSettings {
  return { ...newsSettings };
}

export function getPublicNews(): NewsItem[] {
  return [...publicNews];
}

// === Fetch ===

export async function fetchPublicNews(): Promise<void> {
  if (newsLoaded) return;
  try {
    const { data, error } = await supabase
      .from('news')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) throw error;
    if (data) {
      publicNews = (data as unknown as NewsItem[]).map(normalizeNewsRow);
      newsLoaded = true;
    }
  } catch {
    // use empty
  }
}

export async function fetchAdminNews(): Promise<void> {
  try {
    const { data, error } = await supabase.rpc('admin_select_news_all', {
      p_passcode: ADMIN_PASSCODE,
    });
    if (error) throw error;
    if (data) {
      adminNews = (data as unknown as NewsItem[]).map(normalizeNewsRow);
      notifyNews();
    }
  } catch {
    // ignore
  }
}

export async function fetchNewsSettings(): Promise<void> {
  if (settingsLoaded) return;
  try {
    const { data } = await supabase.rpc('admin_get_setting', { p_key: 'news_settings' });
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      newsSettings = { ...DEFAULT_NEWS_SETTINGS, ...(data as Partial<NewsSettings>) };
      settingsLoaded = true;
      notifySettings();
    }
  } catch {
    // use defaults
  }
}

// === Settings ===

export async function updateNewsSettings(updates: Partial<NewsSettings>): Promise<void> {
  const newSettings = { ...newsSettings, ...updates };
  const { error } = await supabase.rpc('admin_set_setting', {
    p_passcode: ADMIN_PASSCODE,
    p_key: 'news_settings',
    p_value: newSettings,
  });
  if (error) throw new Error(`Failed to save news settings: ${error.message}`);
  newsSettings = newSettings;
  notifySettings();
}

export async function resetNewsSettings(): Promise<void> {
  const { error } = await supabase.rpc('admin_set_setting', {
    p_passcode: ADMIN_PASSCODE,
    p_key: 'news_settings',
    p_value: DEFAULT_NEWS_SETTINGS,
  });
  if (error) throw new Error(`Failed to reset news settings: ${error.message}`);
  newsSettings = { ...DEFAULT_NEWS_SETTINGS };
  notifySettings();
}

// === CRUD ===

export async function addNews(
  title: string,
  subtitle: string,
  coverUrl: string | null,
  photos: string[],
  date: string,
): Promise<NewsItem | null> {
  try {
    const { data, error } = await supabase.rpc('admin_insert_news', {
      p_passcode: ADMIN_PASSCODE,
      p_title: title,
      p_subtitle: subtitle,
      p_cover_url: coverUrl,
      p_photos: JSON.stringify(photos),
      p_date: date,
    });
    if (error) throw error;
    if (data) {
      const item = normalizeNewsRow(data as unknown as Record<string, unknown>);
      adminNews = [item, ...adminNews];
      // Also update publicNews if active
      if (item.active) {
        publicNews = [item, ...publicNews].sort((a, b) => a.sort_order - b.sort_order);
      }
      notifyNews();
      return item;
    }
  } catch {
    // ignore
  }
  return null;
}

export async function updateNews(
  id: string,
  updates: Partial<Pick<NewsItem, 'title' | 'subtitle' | 'cover_url' | 'photos' | 'date' | 'active' | 'sort_order'>>,
): Promise<void> {
  try {
    const { error } = await supabase.rpc('admin_update_news', {
      p_passcode: ADMIN_PASSCODE,
      p_id: id,
      p_title: updates.title ?? null,
      p_subtitle: updates.subtitle ?? null,
      p_cover_url: updates.cover_url !== undefined ? updates.cover_url : null,
      p_photos: updates.photos ? JSON.stringify(updates.photos) : null,
      p_date: updates.date ?? null,
      p_active: updates.active ?? null,
      p_sort_order: updates.sort_order ?? null,
    });
    if (error) throw error;
    // Update local cache
    const idx = adminNews.findIndex((n) => n.id === id);
    if (idx >= 0) {
      adminNews[idx] = { ...adminNews[idx], ...updates };
      notifyNews();
    }
    // Refresh public news
    await refreshPublicNews();
  } catch {
    // ignore
  }
}

export async function deleteNews(id: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('admin_delete_news', {
      p_passcode: ADMIN_PASSCODE,
      p_id: id,
    });
    if (error) throw error;
    adminNews = adminNews.filter((n) => n.id !== id);
    publicNews = publicNews.filter((n) => n.id !== id);
    notifyNews();
  } catch {
    // ignore
  }
}

export async function reorderNews(id: string, sortOrder: number): Promise<void> {
  try {
    const { error } = await supabase.rpc('admin_reorder_news', {
      p_passcode: ADMIN_PASSCODE,
      p_id: id,
      p_sort_order: sortOrder,
    });
    if (error) throw error;
    const idx = adminNews.findIndex((n) => n.id === id);
    if (idx >= 0) {
      adminNews[idx].sort_order = sortOrder;
      adminNews = [...adminNews].sort((a, b) => a.sort_order - b.sort_order);
      notifyNews();
    }
    await refreshPublicNews();
  } catch {
    // ignore
  }
}

async function refreshPublicNews(): Promise<void> {
  try {
    const { data } = await supabase
      .from('news')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });
    if (data) {
      publicNews = (data as unknown as NewsItem[]).map(normalizeNewsRow);
    }
  } catch {
    // ignore
  }
}

// === Storage ===

export async function uploadNewsImage(file: File): Promise<string | null> {
  try {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `news-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
    const path = `news/${fileName}`;
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

// === Helpers ===

function normalizeNewsRow(row: Record<string, unknown> | NewsItem): NewsItem {
  if (isNewsItem(row)) return row;
  let photos: string[] = [];
  const rawPhotos = (row as Record<string, unknown>).photos;
  if (Array.isArray(rawPhotos)) {
    photos = rawPhotos as string[];
  } else if (typeof rawPhotos === 'string') {
    try {
      const parsed = JSON.parse(rawPhotos as string);
      if (Array.isArray(parsed)) photos = parsed as string[];
    } catch {
      // ignore
    }
  }
  const r = row as Record<string, unknown>;
  return {
    id: typeof r.id === 'string' ? r.id : String(r.id ?? `news-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
    title: typeof r.title === 'string' ? r.title : (r.title != null ? String(r.title) : 'Untitled'),
    subtitle: typeof r.subtitle === 'string' ? r.subtitle : (r.subtitle != null ? String(r.subtitle) : ''),
    cover_url: typeof r.cover_url === 'string' ? r.cover_url : null,
    photos,
    date: r.date != null ? String(r.date) : new Date().toISOString().slice(0, 10),
    active: typeof r.active === 'boolean' ? r.active : true,
    sort_order: typeof r.sort_order === 'number' ? r.sort_order : 0,
    created_at: typeof r.created_at === 'string' ? r.created_at : new Date().toISOString(),
  };
}

function isNewsItem(row: unknown): row is NewsItem {
  return typeof row === 'object' && row !== null && 'id' in row && 'title' in row && typeof (row as NewsItem).id === 'string';
}
