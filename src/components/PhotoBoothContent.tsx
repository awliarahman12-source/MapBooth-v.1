import { useRef, useEffect, useState } from 'react';
import type { ThemeMode } from '@/types';
import { addMedia } from '@/mediaStore';
import {
  isPrivateCaptureEnabled,
  subscribeCaptureMode,
  addAdminPrivateCapture,
  uploadPrivateCaptureToStorage,
} from '@/adminStore';
import { subscribeFilters, getEnabledFilters, fetchFilters, buildFilterCSS } from '@/filterStore';
import type { SharedMediaItem } from '@/mediaStore';

export default function PhotoBoothContent({ theme }: { theme: ThemeMode }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isDark = theme === 'dark';
  const [privateMode, setPrivateMode] = useState(isPrivateCaptureEnabled());

  useEffect(() => {
    const unsub = subscribeCaptureMode(setPrivateMode);
    return unsub;
  }, []);

  useEffect(() => {
    fetchFilters();
    const unsub = subscribeFilters(() => {
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow) return;
      const filters = getEnabledFilters();
      iframe.contentWindow.postMessage(
        { type: 'tahoe-filters', filters: filters.map((f) => ({ id: f.filter_id, name: f.name, css: f.css })) },
        '*',
      );
      iframe.contentWindow.postMessage({ type: 'tahoe-filter-css', css: buildFilterCSS() }, '*');
    });
    return unsub;
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage({ type: 'tahoe-theme', theme: isDark ? 'dark' : 'light' }, '*');
  }, [isDark]);

  useEffect(() => {
    const handleMessage = async (e: MessageEvent) => {
      if (!e.data) return;
      if (e.data.type === 'photobooth-capture') {
        const media: SharedMediaItem = e.data.media;
        if (privateMode) {
          const storedUrl = await uploadPrivateCaptureToStorage(media.url, media.type, media.name);
          addAdminPrivateCapture({
            type: media.type,
            url: storedUrl || media.url,
            name: media.name,
            filter: null,
            category: 'capture',
          });
        } else {
          addMedia(media);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [privateMode]);

  const handleLoad = () => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage({ type: 'tahoe-theme', theme: isDark ? 'dark' : 'light' }, '*');
    const filters = getEnabledFilters();
    iframe.contentWindow.postMessage(
      { type: 'tahoe-filters', filters: filters.map((f) => ({ id: f.filter_id, name: f.name, css: f.css })) },
      '*',
    );
    iframe.contentWindow.postMessage({ type: 'tahoe-filter-css', css: buildFilterCSS() }, '*');
  };

  return (
    <iframe
      ref={iframeRef}
      src="/photobooth.html"
      title="Photo Booth"
      onLoad={handleLoad}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        display: 'block',
      }}
      allow="camera; microphone; autoplay"
    />
  );
}
