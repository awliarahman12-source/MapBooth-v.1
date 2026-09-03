import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

const ADMIN_PASSCODE = '110106';

export interface PublicPhoto {
  id: string;
  url: string;
  name: string;
  file_type: string;
  album_id: string | null;
  featured: boolean;
  display_enabled: boolean;
  display_order: number;
  sort_order: number;
  created_at: string;
}

export interface PublicAlbum {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

type PhotoListener = (photos: PublicPhoto[]) => void;
type AlbumListener = (albums: PublicAlbum[]) => void;

const photos: PublicPhoto[] = [];
const albums: PublicAlbum[] = [];
const photoListeners = new Set<PhotoListener>();
const albumListeners = new Set<AlbumListener>();
let photosLoaded = false;
let albumsLoaded = false;

function notifyPhotos() {
  photoListeners.forEach((l) => l([...photos]));
}

function notifyAlbums() {
  albumListeners.forEach((l) => l([...albums]));
}

export function subscribePhotos(listener: PhotoListener): () => void {
  photoListeners.add(listener);
  listener([...photos]);
  return () => photoListeners.delete(listener);
}

export function subscribeAlbums(listener: AlbumListener): () => void {
  albumListeners.add(listener);
  listener([...albums]);
  return () => albumListeners.delete(listener);
}

export function getPhotos(): PublicPhoto[] {
  return [...photos];
}

export function getDisplayPhotos(): PublicPhoto[] {
  return photos.filter((p) => p.display_enabled).sort((a, b) => a.display_order - b.display_order);
}

export function getFeaturedPhotos(): PublicPhoto[] {
  return photos.filter((p) => p.featured);
}

export async function fetchPublicPhotos(): Promise<void> {
  if (photosLoaded) return;
  try {
    const { data, error } = await supabase
      .from('public_photos')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    if (data) {
      photos.length = 0;
      photos.push(...(data as PublicPhoto[]));
      photosLoaded = true;
      notifyPhotos();
    }
  } catch {
    // no data available
  }
}

export async function fetchPublicAlbums(): Promise<void> {
  if (albumsLoaded) return;
  try {
    const { data, error } = await supabase
      .from('public_albums')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    if (data) {
      albums.length = 0;
      albums.push(...(data as PublicAlbum[]));
      albumsLoaded = true;
      notifyAlbums();
    }
  } catch {
    // no data available
  }
}

async function uploadPhotoFile(file: File): Promise<string | null> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `uploads/${fileName}`;
  try {
    const { error } = await supabase.storage.from('public-photos').upload(path, file, {
      contentType: file.type || 'image/jpeg',
      upsert: false,
    });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('public-photos').getPublicUrl(path);
    return urlData.publicUrl;
  } catch {
    return null;
  }
}

export async function uploadPhotos(
  files: File[],
  albumId: string | null = null,
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;
  for (const file of files) {
    const allowed = ['jpg', 'jpeg', 'png', 'webp'];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!allowed.includes(ext)) {
      failed++;
      continue;
    }
    const url = await uploadPhotoFile(file);
    if (!url) {
      failed++;
      continue;
    }
    try {
      const { data, error } = await supabase.rpc('admin_insert_photo', {
        p_passcode: ADMIN_PASSCODE,
        p_url: url,
        p_name: file.name.replace(/\.[^/.]+$/, ''),
        p_file_type: ext,
        p_album_id: albumId,
      });
      if (error) throw error;
      if (data) {
        photos.push(data as unknown as PublicPhoto);
        notifyPhotos();
        success++;
      }
    } catch {
      failed++;
    }
  }
  return { success, failed };
}

export async function updatePhoto(
  id: string,
  updates: {
    name?: string;
    album_id?: string | null;
    featured?: boolean;
    display_enabled?: boolean;
    display_order?: number;
    sort_order?: number;
  },
): Promise<void> {
  try {
    const { error } = await supabase.rpc('admin_update_photo', {
      p_passcode: ADMIN_PASSCODE,
      p_id: id,
      p_name: updates.name ?? null,
      p_album_id: updates.album_id ?? null,
      p_featured: updates.featured ?? null,
      p_display_enabled: updates.display_enabled ?? null,
      p_display_order: updates.display_order ?? null,
      p_sort_order: updates.sort_order ?? null,
    });
    if (error) throw error;
  } catch {
    // ignore
  }
  const idx = photos.findIndex((p) => p.id === id);
  if (idx >= 0) {
    Object.assign(photos[idx], updates);
    notifyPhotos();
  }
}

export async function deletePhoto(id: string): Promise<void> {
  const photo = photos.find((p) => p.id === id);
  if (!photo) return;
  try {
    const { error } = await supabase.rpc('admin_delete_photo', {
      p_passcode: ADMIN_PASSCODE,
      p_id: id,
    });
    if (error) throw error;
  } catch {
    // ignore
  }
  const idx = photos.findIndex((p) => p.id === id);
  if (idx >= 0) {
    photos.splice(idx, 1);
    notifyPhotos();
  }
}

export async function createAlbum(name: string): Promise<void> {
  try {
    const { data, error } = await supabase.rpc('admin_insert_album', {
      p_passcode: ADMIN_PASSCODE,
      p_name: name,
    });
    if (error) throw error;
    if (data) {
      albums.push(data as unknown as PublicAlbum);
      notifyAlbums();
    }
  } catch {
    // ignore
  }
}

export async function deleteAlbum(id: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('admin_delete_album', {
      p_passcode: ADMIN_PASSCODE,
      p_id: id,
    });
    if (error) throw error;
  } catch {
    // ignore
  }
  const idx = albums.findIndex((a) => a.id === id);
  if (idx >= 0) {
    albums.splice(idx, 1);
    notifyAlbums();
  }
}

export { supabase };
