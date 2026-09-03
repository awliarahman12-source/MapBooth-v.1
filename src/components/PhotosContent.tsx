import { useRef, useEffect, useState } from 'react';
import type { ThemeMode } from '@/types';
import { subscribe, getMedia, type SharedMediaItem } from '@/mediaStore';
import { subscribePhotos, fetchPublicPhotos, type PublicPhoto } from '@/photoStore';

export default function PhotosContent({ theme }: { theme: ThemeMode }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isDark = theme === 'dark';
  const [sharedMedia, setSharedMedia] = useState<SharedMediaItem[]>(getMedia());
  const [publicPhotos, setPublicPhotos] = useState<PublicPhoto[]>([]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage({ type: 'tahoe-theme', theme: isDark ? 'dark' : 'light' }, '*');
  }, [isDark]);

  useEffect(() => {
    const unsub = subscribe((items) => setSharedMedia(items));
    return unsub;
  }, []);

  useEffect(() => {
    fetchPublicPhotos();
    const unsub = subscribePhotos((photos) => setPublicPhotos(photos));
    return unsub;
  }, []);

  const sendPublicPhotos = () => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    const photos = publicPhotos.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.file_type === 'mp4' || p.file_type === 'mov' || p.file_type === 'video' ? 'video' : 'image',
      url: p.url,
      album: p.album_id || 'Public',
      category: 'Memories',
      isFav: p.featured,
      date: p.created_at.slice(0, 10),
      size: '—',
    }));
    iframe.contentWindow.postMessage({ type: 'public-photos', photos }, '*');
  };

  useEffect(() => {
    sendPublicPhotos();
  }, [publicPhotos]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage({ type: 'shared-media', media: sharedMedia }, '*');
  }, [sharedMedia]);

  const handleLoad = () => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage({ type: 'tahoe-theme', theme: isDark ? 'dark' : 'light' }, '*');
    iframe.contentWindow.postMessage({ type: 'shared-media', media: sharedMedia }, '*');
    sendPublicPhotos();
  };

  return (
    <iframe
      ref={iframeRef}
      src="/photos.html"
      title="Photos"
      onLoad={handleLoad}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        display: 'block',
      }}
    />
  );
}
