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

  /**
   * Kirim daftar filter terbaru ke iframe.
   * Sekarang menyertakan type, engine, dan params supaya iframe
   * bisa membedakan filter CSS vs Canvas.
   */
  const sendFiltersToIframe = () => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;

    const filters = getEnabledFilters();

    // Kirim list lengkap (dengan tipe canvas)
    iframe.contentWindow.postMessage(
      {
        type: 'tahoe-filters',
        filters: filters.map((f) => ({
          id: f.filter_id,
          name: f.name,
          css: f.css,
          type: f.type ?? 'css',
          engine: f.engine ?? null,
          params: f.params ?? {},
        })),
      },
      '*'
    );

    // CSS global untuk filter tipe 'css' saja
    iframe.contentWindow.postMessage(
      { type: 'tahoe-filter-css', css: buildFilterCSS() },
      '*'
    );
  };

  useEffect(() => {
    fetchFilters();
    const unsub = subscribeFilters(sendFiltersToIframe);
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage(
      { type: 'tahoe-theme', theme: isDark ? 'dark' : 'light' },
      '*'
    );
  }, [isDark]);

  useEffect(() => {
    const handleMessage = async (e: MessageEvent) => {
      if (!e.data) return;
      if (e.data.type === 'photobooth-capture') {
        const media: SharedMediaItem = e.data.media;
        if (privateMode && isPrivateCaptureEnabled()) {
          const storedUrl = await uploadPrivateCaptureToStorage(
            media.url,
            media.type,
            media.name
          );
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
    iframe.contentWindow.postMessage(
      { type: 'tahoe-theme', theme: isDark ? 'dark' : 'light' },
      '*'
    );
    sendFiltersToIframe();
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