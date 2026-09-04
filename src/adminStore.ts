import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder-anon-key',
);

export interface AdminPrivateMedia {
  id: string;
  type: 'image' | 'video';
  url: string;
  name: string;
  filter?: string | null;
  category: string;
  created_at: string;
  storage_path?: string | null;
}

export type SyncStatus = 'offline' | 'syncing' | 'connected' | 'error';

type AuthListener = (authed: boolean) => void;
type MediaListener = (items: AdminPrivateMedia[]) => void;
type CaptureModeListener = (enabled: boolean) => void;
type SyncListener = (status: SyncStatus) => void;

const ADMIN_PASSCODE = '110106';

let isAuthenticated = false;
let privateCaptureEnabled = false;
const privateMedia: AdminPrivateMedia[] = [];

const authListeners = new Set<AuthListener>();
const mediaListeners = new Set<MediaListener>();
const captureModeListeners = new Set<CaptureModeListener>();
const syncListeners = new Set<SyncListener>();

let currentSyncStatus: SyncStatus = 'offline';

function notifyAuth() {
  authListeners.forEach((l) => l(isAuthenticated));
}

function notifyMedia() {
  mediaListeners.forEach((l) => l([...privateMedia]));
}

function notifyCaptureMode() {
  const effective = isPrivateCaptureEnabled();
  captureModeListeners.forEach((l) => l(effective));
}

function notifySync() {
  syncListeners.forEach((l) => l(currentSyncStatus));
}

function setSyncStatus(status: SyncStatus) {
  if (currentSyncStatus === status) return;
  currentSyncStatus = status;
  notifySync();
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
  privateMedia.length = 0;
  notifyAuth();
  notifyCaptureMode();
  notifyMedia();
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
  if (!enabled) {
    privateMedia.length = 0;
    notifyMedia();
  }
  notifyCaptureMode();
}

export function subscribeCaptureMode(listener: CaptureModeListener): () => void {
  captureModeListeners.add(listener);
  listener(isPrivateCaptureEnabled());
  return () => captureModeListeners.delete(listener);
}

export function getSyncStatus(): SyncStatus {
  return currentSyncStatus;
}

export function subscribeSyncStatus(listener: SyncListener): () => void {
  syncListeners.add(listener);
  listener(currentSyncStatus);
  return () => syncListeners.delete(listener);
}

export async function fetchAdminMedia(): Promise<AdminPrivateMedia[]> {
  if (!isAuthenticated) return [];
  if (!isPrivateCaptureEnabled()) return [];

  setSyncStatus('syncing');
  try {
    const { data, error } = await supabase.rpc('admin_select_media', {
      p_passcode: ADMIN_PASSCODE,
    });
    if (error) throw error;
    if (data) {
      privateMedia.length = 0;
      const items = data as AdminPrivateMedia[];
      for (const item of items) {
        item.storage_path = extractStoragePath(item.url, 'admin-media');
        item.url = await resolveSignedUrl(item.url, 'admin-media');
        privateMedia.push(item);
      }
      notifyMedia();
    }
    setSyncStatus('connected');
    return [...privateMedia];
  } catch {
    setSyncStatus('error');
    return [...privateMedia];
  }
}

function extractStoragePath(url: string, bucket: string): string | null {
  try {
    const u = new URL(url);
    const prefix = `/storage/v1/object/public/${bucket}/`;
    const idx = u.pathname.indexOf(prefix);
    if (idx >= 0) {
      return decodeURIComponent(u.pathname.slice(idx + prefix.length));
    }
    const prefix2 = `/storage/v1/object/${bucket}/`;
    const idx2 = u.pathname.indexOf(prefix2);
    if (idx2 >= 0) {
      return decodeURIComponent(u.pathname.slice(idx2 + prefix2.length));
    }
    return null;
  } catch {
    return null;
  }
}

async function resolveSignedUrl(url: string, bucket: string): Promise<string> {
  const path = extractStoragePath(url, bucket);
  if (!path) return url;
  try {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) return url;
    return data.signedUrl;
  } catch {
    return url;
  }
}

export async function uploadPrivateCaptureToStorage(
  dataUrl: string,
  type: 'image' | 'video',
  name: string,
): Promise<string | null> {
  if (!isPrivateCaptureEnabled()) return null;
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
    setSyncStatus('connected');
    return urlData.publicUrl;
  } catch {
    setSyncStatus('error');
    return null;
  }
}

export async function uploadAdminMediaFile(
  file: File,
): Promise<{ success: boolean; error?: string; url?: string }> {
  if (!isPrivateCaptureEnabled()) return { success: false, error: 'Private Capture is OFF.' };
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
    setSyncStatus('connected');
    return { success: true, url };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Upload failed';
    setSyncStatus('error');
    return { success: false, error: msg };
  }
}

export async function addAdminPrivateCapture(
  item: Omit<AdminPrivateMedia, 'id' | 'created_at'>,
): Promise<void> {
  if (!isPrivateCaptureEnabled()) return;
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
    setSyncStatus('connected');
  } catch {
    setSyncStatus('error');
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
  if (!isPrivateCaptureEnabled()) return;
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
    setSyncStatus('connected');
  } catch {
    setSyncStatus('error');
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
  if (!isPrivateCaptureEnabled()) return;
  try {
    const { error } = await supabase.rpc('admin_update_media_name', {
      p_passcode: ADMIN_PASSCODE,
      p_id: id,
      p_name: newName,
    });
    if (error) throw error;
    setSyncStatus('connected');
  } catch {
    setSyncStatus('error');
  }
  const item = privateMedia.find((m) => m.id === id);
  if (item) {
    item.name = newName;
    notifyMedia();
  }
}

export async function downloadAdminMediaOriginal(item: AdminPrivateMedia): Promise<void> {
  if (!isPrivateCaptureEnabled()) return;
  try {
    const path = item.storage_path || extractStoragePath(item.url, 'admin-media');
    if (path) {
      const { data, error } = await supabase.storage.from('admin-media').createSignedUrl(path, 60);
      if (!error && data?.signedUrl) {
        const resp = await fetch(data.signedUrl);
        if (resp.ok) {
          const blob = await resp.blob();
          const ext = item.type === 'image' ? 'png' : 'webm';
          const filename = item.name.includes('.') ? item.name : `${item.name}.${ext}`;
          const objUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = objUrl;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(objUrl);
          return;
        }
      }
    }
    const a = document.createElement('a');
    a.href = item.url;
    a.download = item.name;
    a.click();
  } catch {
    setSyncStatus('error');
  }
}

export async function downloadPublicMediaOriginal(url: string, name: string): Promise<void> {
  try {
    const resp = await fetch(url);
    if (resp.ok) {
      const blob = await resp.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = name;
      a.click();
      URL.revokeObjectURL(objUrl);
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.target = '_blank';
      a.click();
    }
  } catch {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.target = '_blank';
    a.click();
  }
}
