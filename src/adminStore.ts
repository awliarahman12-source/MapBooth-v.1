import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

export interface AdminPrivateMedia {
  id: string;
  type: 'image' | 'video';
  url: string;
  name: string;
  filter?: string | null;
  category: string;
  created_at: string;
}

type AuthListener = (authed: boolean) => void;
type MediaListener = (items: AdminPrivateMedia[]) => void;
type CaptureModeListener = (enabled: boolean) => void;

const ADMIN_PASSCODE = '110106';

let isAuthenticated = false;
let privateCaptureEnabled = false;
const privateMedia: AdminPrivateMedia[] = [];

const authListeners = new Set<AuthListener>();
const mediaListeners = new Set<MediaListener>();
const captureModeListeners = new Set<CaptureModeListener>();

function notifyAuth() {
  authListeners.forEach((l) => l(isAuthenticated));
}

function notifyMedia() {
  mediaListeners.forEach((l) => l([...privateMedia]));
}

function notifyCaptureMode() {
  captureModeListeners.forEach((l) => l(privateCaptureEnabled));
}

export function isAdminAuthenticated(): boolean {
  return isAuthenticated;
}

export function adminLogin(passcode: string): boolean {
  if (passcode === ADMIN_PASSCODE) {
    isAuthenticated = true;
    notifyAuth();
    return true;
  }
  return false;
}

export function adminLogout() {
  isAuthenticated = false;
  privateCaptureEnabled = false;
  notifyAuth();
  notifyCaptureMode();
}

export function subscribeAdminAuth(listener: AuthListener): () => void {
  authListeners.add(listener);
  listener(isAuthenticated);
  return () => authListeners.delete(listener);
}

export function isPrivateCaptureEnabled(): boolean {
  return privateCaptureEnabled && isAuthenticated;
}

export function setPrivateCaptureEnabled(enabled: boolean) {
  privateCaptureEnabled = enabled;
  notifyCaptureMode();
}

export function subscribeCaptureMode(listener: CaptureModeListener): () => void {
  captureModeListeners.add(listener);
  listener(isPrivateCaptureEnabled());
  return () => captureModeListeners.delete(listener);
}

export async function fetchAdminMedia(): Promise<AdminPrivateMedia[]> {
  if (!isAuthenticated) return [];
  try {
    const { data, error } = await supabase.rpc('admin_select_media', {
      p_passcode: ADMIN_PASSCODE,
    });
    if (error) throw error;
    if (data) {
      privateMedia.length = 0;
      privateMedia.push(...(data as AdminPrivateMedia[]));
      notifyMedia();
    }
    return [...privateMedia];
  } catch {
    return [...privateMedia];
  }
}

export async function uploadPrivateCaptureToStorage(
  dataUrl: string,
  type: 'image' | 'video',
  name: string,
): Promise<string | null> {
  try {
    const ext = type === 'image' ? 'png' : 'webm';
    const fileName = `capture-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const path = `private/${fileName}`;
    const blob = await (await fetch(dataUrl)).blob();
    const { error } = await supabase.storage.from('admin-media').upload(path, blob, {
      contentType: type === 'image' ? 'image/png' : 'video/webm',
      upsert: false,
    });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('admin-media').getPublicUrl(path);
    return urlData.publicUrl;
  } catch {
    return null;
  }
}

export async function uploadAdminMediaFile(
  file: File,
): Promise<{ success: boolean; error?: string; url?: string }> {
  try {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const path = `media/${fileName}`;
    const { error } = await supabase.storage.from('system-assets').upload(path, file, {
      contentType: file.type || 'image/jpeg',
      upsert: false,
    });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('system-assets').getPublicUrl(path);
    const url = urlData.publicUrl;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      return { success: false, error: 'Unsupported file type. Use images or videos.' };
    }

    const { data, error: dbError } = await supabase.rpc('admin_insert_media', {
      p_passcode: ADMIN_PASSCODE,
      p_type: isImage ? 'image' : 'video',
      p_url: url,
      p_name: file.name.replace(/\.[^/.]+$/, ''),
      p_filter: null,
      p_category: 'upload',
    });
    if (dbError) throw dbError;
    if (data) {
      privateMedia.unshift(data as unknown as AdminPrivateMedia);
      notifyMedia();
    }
    return { success: true, url };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Upload failed';
    return { success: false, error: msg };
  }
}

export async function addAdminPrivateCapture(
  item: Omit<AdminPrivateMedia, 'id' | 'created_at'>,
): Promise<void> {
  if (!isAuthenticated) return;
  try {
    const { data, error } = await supabase.rpc('admin_insert_media', {
      p_passcode: ADMIN_PASSCODE,
      p_type: item.type,
      p_url: item.url,
      p_name: item.name,
      p_filter: item.filter ?? null,
      p_category: item.category,
    });
    if (error) throw error;
    if (data) {
      privateMedia.unshift(data as unknown as AdminPrivateMedia);
      notifyMedia();
    }
  } catch {
    const fallback: AdminPrivateMedia = {
      id: `local-${Date.now()}`,
      type: item.type,
      url: item.url,
      name: item.name,
      filter: item.filter ?? null,
      category: item.category,
      created_at: new Date().toISOString(),
    };
    privateMedia.unshift(fallback);
    notifyMedia();
  }
}

export async function deleteAdminMedia(id: string): Promise<void> {
  if (!isAuthenticated) return;
  try {
    const { error } = await supabase.rpc('admin_delete_media', {
      p_passcode: ADMIN_PASSCODE,
      p_id: id,
    });
    if (error) throw error;
    const idx = privateMedia.findIndex((m) => m.id === id);
    if (idx >= 0) {
      privateMedia.splice(idx, 1);
      notifyMedia();
    }
  } catch {
    // remove from local cache even if server delete fails
    const idx = privateMedia.findIndex((m) => m.id === id);
    if (idx >= 0) {
      privateMedia.splice(idx, 1);
      notifyMedia();
    }
  }
}

export function subscribeAdminMedia(listener: MediaListener): () => void {
  mediaListeners.add(listener);
  listener([...privateMedia]);
  return () => mediaListeners.delete(listener);
}

export async function renameAdminMedia(id: string, newName: string): Promise<void> {
  if (!isAuthenticated) return;
  try {
    const { error } = await supabase.rpc('admin_update_media_name', {
      p_passcode: ADMIN_PASSCODE,
      p_id: id,
      p_name: newName,
    });
    if (error) throw error;
  } catch {
    // ignore
  }
  const item = privateMedia.find((m) => m.id === id);
  if (item) {
    item.name = newName;
    notifyMedia();
  }
}
