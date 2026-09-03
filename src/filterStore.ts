import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

const ADMIN_PASSCODE = '110106';

export interface AdminFilter {
  id: string;
  filter_id: string;
  name: string;
  css: string;
  is_builtin: boolean;
  enabled: boolean;
  sort_order: number;
  created_at: string;
}

type Listener = (filters: AdminFilter[]) => void;

const filters: AdminFilter[] = [];
const listeners = new Set<Listener>();
let loaded = false;

function notify() {
  listeners.forEach((l) => l([...filters]));
}

export function subscribeFilters(listener: Listener): () => void {
  listeners.add(listener);
  listener([...filters]);
  return () => listeners.delete(listener);
}

export function getEnabledFilters(): AdminFilter[] {
  return filters.filter((f) => f.enabled);
}

export function getFilters(): AdminFilter[] {
  return [...filters];
}

export async function fetchFilters(): Promise<void> {
  if (loaded) return;
  try {
    const { data, error } = await supabase.rpc('admin_select_filters', {
      p_passcode: ADMIN_PASSCODE,
    });
    if (error) throw error;
    if (data) {
      filters.length = 0;
      filters.push(...(data as AdminFilter[]));
      loaded = true;
      notify();
    }
  } catch {
    // fall back to built-in defaults if DB is unreachable
    if (filters.length === 0) {
      const defaults: AdminFilter[] = [
        { id: 'b-normal', filter_id: 'normal', name: 'Normal', css: 'none', is_builtin: true, enabled: true, sort_order: 0, created_at: '' },
        { id: 'b-thermal', filter_id: 'thermal', name: 'Thermal', css: 'invert(100%) hue-rotate(180deg) saturate(300%)', is_builtin: true, enabled: true, sort_order: 1, created_at: '' },
        { id: 'b-xray', filter_id: 'xray', name: 'X-Ray', css: 'invert(100%) grayscale(100%)', is_builtin: true, enabled: true, sort_order: 2, created_at: '' },
        { id: 'b-popart', filter_id: 'popart', name: 'Pop Art', css: 'contrast(200%) saturate(300%) hue-rotate(90deg)', is_builtin: true, enabled: true, sort_order: 3, created_at: '' },
        { id: 'b-glow', filter_id: 'glow', name: 'Glow', css: 'brightness(130%) contrast(120%) drop-shadow(0 0 10px rgba(255,255,255,0.8))', is_builtin: true, enabled: true, sort_order: 4, created_at: '' },
        { id: 'b-comic', filter_id: 'comic', name: 'Comic', css: 'contrast(300%) grayscale(50%)', is_builtin: true, enabled: true, sort_order: 5, created_at: '' },
        { id: 'b-scifi', filter_id: 'scifi', name: 'Sci-Fi', css: 'hue-rotate(240deg) saturate(200%) contrast(150%)', is_builtin: true, enabled: true, sort_order: 6, created_at: '' },
        { id: 'b-tunnel', filter_id: 'tunnel', name: 'Tunnel', css: 'contrast(150%) hue-rotate(300deg)', is_builtin: true, enabled: true, sort_order: 7, created_at: '' },
        { id: 'b-bw', filter_id: 'bw', name: 'B&W', css: 'grayscale(100%) contrast(120%)', is_builtin: true, enabled: true, sort_order: 8, created_at: '' },
        { id: 'b-sepia', filter_id: 'sepia', name: 'Sepia', css: 'sepia(100%)', is_builtin: true, enabled: true, sort_order: 9, created_at: '' },
        { id: 'b-hue', filter_id: 'hue', name: 'Hue Shift', css: 'hue-rotate(180deg)', is_builtin: true, enabled: true, sort_order: 10, created_at: '' },
        { id: 'b-invert', filter_id: 'invert', name: 'Invert', css: 'invert(100%)', is_builtin: true, enabled: true, sort_order: 11, created_at: '' },
        { id: 'b-blur', filter_id: 'blur', name: 'Soft Blur', css: 'blur(3px)', is_builtin: true, enabled: true, sort_order: 12, created_at: '' },
        { id: 'b-saturate', filter_id: 'saturate', name: 'Vivid', css: 'saturate(500%)', is_builtin: true, enabled: true, sort_order: 13, created_at: '' },
        { id: 'b-contrast', filter_id: 'contrast', name: 'High Contrast', css: 'contrast(300%)', is_builtin: true, enabled: true, sort_order: 14, created_at: '' },
      ];
      filters.push(...defaults);
      notify();
    }
  }
}

export async function addCustomFilter(
  filterId: string,
  name: string,
  css: string,
): Promise<{ success: boolean; error?: string }> {
  const existing = filters.find((f) => f.filter_id === filterId);
  if (existing) {
    return { success: false, error: 'A filter with this ID already exists' };
  }
  try {
    const { data, error } = await supabase.rpc('admin_insert_filter', {
      p_passcode: ADMIN_PASSCODE,
      p_filter_id: filterId,
      p_name: name,
      p_css: css,
      p_is_builtin: false,
    });
    if (error) throw error;
    if (data) {
      filters.push(data as unknown as AdminFilter);
      notify();
    }
    return { success: true };
  } catch {
    return { success: false, error: 'Could not save filter to database' };
  }
}

export async function updateFilter(
  id: string,
  updates: { name?: string; css?: string; enabled?: boolean },
): Promise<void> {
  try {
    const { error } = await supabase.rpc('admin_update_filter', {
      p_passcode: ADMIN_PASSCODE,
      p_id: id,
      p_name: updates.name ?? null,
      p_css: updates.css ?? null,
      p_enabled: updates.enabled ?? null,
    });
    if (error) throw error;
    const idx = filters.findIndex((f) => f.id === id);
    if (idx >= 0) {
      if (updates.name !== undefined) filters[idx].name = updates.name;
      if (updates.css !== undefined) filters[idx].css = updates.css;
      if (updates.enabled !== undefined) filters[idx].enabled = updates.enabled;
      notify();
    }
  } catch {
    // update local cache anyway
    const idx = filters.findIndex((f) => f.id === id);
    if (idx >= 0) {
      if (updates.name !== undefined) filters[idx].name = updates.name;
      if (updates.css !== undefined) filters[idx].css = updates.css;
      if (updates.enabled !== undefined) filters[idx].enabled = updates.enabled;
      notify();
    }
  }
}

export async function deleteFilter(id: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('admin_delete_filter', {
      p_passcode: ADMIN_PASSCODE,
      p_id: id,
    });
    if (error) throw error;
  } catch {
    // ignore
  }
  const idx = filters.findIndex((f) => f.id === id);
  if (idx >= 0) {
    filters.splice(idx, 1);
    notify();
  }
}

export function buildFilterCSS(): string {
  return filters
    .map((f) => `.filter-${f.filter_id} { filter: ${f.css}; }`)
    .join('\n');
}
