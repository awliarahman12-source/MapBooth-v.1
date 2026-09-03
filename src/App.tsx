import { useState, useRef, useCallback, useEffect } from 'react';
import type { WindowId, WindowState, ThemeMode } from '@/types';
import { createClient } from '@supabase/supabase-js';
import MenuBar from '@/components/MenuBar';
import Dock from '@/components/Dock';
import Window from '@/components/Window';
import FinderContent from '@/components/FinderContent';
import SettingsContent, { builtInWallpapers } from '@/components/SettingsContent';
import PhotosContent from '@/components/PhotosContent';
import PhotoBoothContent from '@/components/PhotoBoothContent';
import AdminLoginContent from '@/components/AdminLoginContent';
import AdminDashboardContent from '@/components/AdminDashboardContent';
import NewsContent from '@/components/NewsContent';
import { getNewsSettings, fetchNewsSettings } from '@/newsStore';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

interface CustomWallpaper {
  id: string;
  url: string;
  name: string;
}

const ADMIN_PASSCODE = '110106';

const initialWindowStates: Record<WindowId, WindowState> = {
  finderWindow: { closed: true, minimized: false, fullscreen: false, zIndex: 100, top: 60, left: 80, width: 560, height: 360 },
  settingsWindow: { closed: true, minimized: false, fullscreen: false, zIndex: 100, top: 70, left: 200, width: 680, height: 460 },
  photosWindow: { closed: true, minimized: false, fullscreen: false, zIndex: 100, top: 70, left: 180, width: 920, height: 620 },
  photoboothWindow: { closed: true, minimized: false, fullscreen: false, zIndex: 100, top: 80, left: 280, width: 720, height: 480 },
  adminLoginWindow: { closed: true, minimized: false, fullscreen: false, zIndex: 100, top: 120, left: 0, width: 360, height: 320 },
  adminDashboardWindow: { closed: true, minimized: false, fullscreen: false, zIndex: 100, top: 40, left: 100, width: 900, height: 600 },
  newsWindow: { closed: true, minimized: false, fullscreen: false, zIndex: 100, top: 60, left: 160, width: 560, height: 640 },
};

const windowTitles: Record<WindowId, string> = {
  finderWindow: 'Finder',
  settingsWindow: 'System Settings',
  photosWindow: 'Photos',
  photoboothWindow: 'Photo Booth',
  adminLoginWindow: 'Admin Login',
  adminDashboardWindow: 'Admin Dashboard',
  newsWindow: 'News',
};

export default function App() {
  const [windows, setWindows] = useState<Record<WindowId, WindowState>>(initialWindowStates);
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [zCounter, setZCounter] = useState(200);
  const [customWallpapers, setCustomWallpapers] = useState<CustomWallpaper[]>([]);
  const [activeWallpaper, setActiveWallpaper] = useState<string>('default');

  // News startup auto-open
  const newsAutoOpened = useRef(false);

  // Battery secret trigger
  const batteryClickCount = useRef(0);
  const batteryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Admin login window position (centered)
  const loginWindowCentered = useRef(false);

  useEffect(() => {
    document.body.className = theme === 'dark' ? 'dark-theme' : '';
  }, [theme]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('wallpapers').select('id, url, name').order('created_at', { ascending: false });
      if (data) setCustomWallpapers(data as CustomWallpaper[]);
    })();
  }, []);

  useEffect(() => {
    if (activeWallpaper === 'default') {
      document.body.style.background = '';
    } else if (activeWallpaper.startsWith('custom:')) {
      const id = activeWallpaper.slice(6);
      const wp = customWallpapers.find((w) => w.id === id);
      if (wp) document.body.style.background = `url('${wp.url}') center / cover no-repeat fixed`;
    } else {
      const wp = builtInWallpapers.find((w) => w.id === activeWallpaper);
      if (wp) document.body.style.background = wp.gradient;
    }
  }, [activeWallpaper, customWallpapers]);

  const focusWindow = useCallback((id: WindowId) => {
    setZCounter((z) => {
      const newZ = z + 1;
      setWindows((prev) => ({
        ...prev,
        [id]: { ...prev[id], zIndex: newZ, minimized: false, closed: false },
      }));
      return newZ;
    });
  }, []);

  const openWindow = useCallback((id: WindowId) => {
    setWindows((prev) => {
      if (id === 'adminLoginWindow' && !loginWindowCentered.current) {
        loginWindowCentered.current = true;
        const w = 360;
        const h = 320;
        return {
          ...prev,
          [id]: {
            ...prev[id],
            closed: false,
            minimized: false,
            top: Math.max(40, (window.innerHeight - h) / 2),
            left: Math.max(20, (window.innerWidth - w) / 2),
            zIndex: zCounter + 1,
          },
        };
      }
      return {
        ...prev,
        [id]: { ...prev[id], closed: false, minimized: false, zIndex: zCounter + 1 },
      };
    });
    setZCounter((z) => z + 1);
  }, [zCounter]);

  const closeWindow = useCallback((id: WindowId) => {
    setWindows((prev) => ({ ...prev, [id]: { ...prev[id], closed: true, fullscreen: false } }));
  }, []);

  const minimizeWindow = useCallback((id: WindowId) => {
    setWindows((prev) => ({ ...prev, [id]: { ...prev[id], minimized: true } }));
  }, []);

  const toggleMaximize = useCallback((id: WindowId) => {
    setWindows((prev) => ({ ...prev, [id]: { ...prev[id], fullscreen: !prev[id].fullscreen } }));
  }, []);

  const handleDragEnd = useCallback((id: WindowId, top: number, left: number) => {
    setWindows((prev) => ({ ...prev, [id]: { ...prev[id], top, left } }));
  }, []);

  const handleResizeEnd = useCallback((id: WindowId, width: number, height: number) => {
    setWindows((prev) => ({ ...prev, [id]: { ...prev[id], width, height } }));
  }, []);

  useEffect(() => {
    (async () => {
      await fetchNewsSettings();
      const settings = getNewsSettings();
      if (!settings.enabled || !settings.showOnStartup) return;
      if (settings.oncePerSession && sessionStorage.getItem('newsAutoOpened') === '1') return;
      if (newsAutoOpened.current) return;
      newsAutoOpened.current = true;
      sessionStorage.setItem('newsAutoOpened', '1');
      const delay = settings.autoOpenDelay || 0;
      setTimeout(() => {
        focusWindow('newsWindow');
      }, delay);
    })();
  }, [focusWindow]);

  const handleBatteryClick = useCallback(() => {
    batteryClickCount.current += 1;

    if (batteryTimer.current) clearTimeout(batteryTimer.current);
    batteryTimer.current = setTimeout(() => {
      batteryClickCount.current = 0;
    }, 3000);

    if (batteryClickCount.current >= 8) {
      batteryClickCount.current = 0;
      if (batteryTimer.current) clearTimeout(batteryTimer.current);
      loginWindowCentered.current = false;
      openWindow('adminLoginWindow');
    }
  }, [openWindow]);

  const handleAdminLoginSuccess = useCallback(() => {
    closeWindow('adminLoginWindow');
    openWindow('adminDashboardWindow');
  }, [closeWindow, openWindow]);

  const handleThemeChange = useCallback((mode: ThemeMode) => {
    setTheme(mode);
  }, []);

  const handleAddWallpaper = useCallback((wallpaper: CustomWallpaper) => {
    setCustomWallpapers((prev) => [wallpaper, ...prev]);
  }, []);

  const handleWallpaperChange = useCallback((wp: string) => {
    setActiveWallpaper(wp);
  }, []);

  const runningWindows = new Set<WindowId>();
  (Object.keys(windows) as WindowId[]).forEach((id) => {
    if (!windows[id].closed && !windows[id].minimized) {
      runningWindows.add(id);
    }
  });

  const anyFullscreen = (Object.keys(windows) as WindowId[]).some(
    (id) => !windows[id].closed && windows[id].fullscreen,
  );

  const renderWindowContent = (id: WindowId) => {
    switch (id) {
      case 'finderWindow': return <FinderContent />;
      case 'settingsWindow': return <SettingsContent theme={theme} onThemeChange={handleThemeChange} customWallpapers={customWallpapers} activeWallpaper={activeWallpaper} onAddWallpaper={handleAddWallpaper} onWallpaperChange={handleWallpaperChange} />;
      case 'photosWindow': return <PhotosContent theme={theme} />;
      case 'photoboothWindow': return <PhotoBoothContent theme={theme} />;
      case 'adminLoginWindow': return <AdminLoginContent onSuccess={handleAdminLoginSuccess} />;
      case 'adminDashboardWindow': return <AdminDashboardContent onCloseLogin={() => closeWindow('adminLoginWindow')} customWallpapers={customWallpapers} activeWallpaper={activeWallpaper} theme={theme} onAddWallpaper={handleAddWallpaper} onWallpaperChange={handleWallpaperChange} onThemeChange={handleThemeChange} />;
      case 'newsWindow': return <NewsContent theme={theme} allowClose={getNewsSettings().allowClose} defaultNewsId={getNewsSettings().defaultNewsId} animation={getNewsSettings().animation} onClose={() => closeWindow('newsWindow')} />;
      default: return null;
    }
  };

  const getWindowBodyStyle = (id: WindowId): React.CSSProperties | undefined => {
    if (id === 'settingsWindow' || id === 'adminDashboardWindow') {
      return { padding: 0, display: 'flex', flexDirection: 'column' };
    }
    if (id === 'adminLoginWindow' || id === 'photoboothWindow' || id === 'photosWindow' || id === 'newsWindow') {
      return { padding: 0 };
    }
    return undefined;
  };

  return (
    <>
      <MenuBar
        theme={theme}
        onThemeChange={handleThemeChange}
        onBatterySecretClick={handleBatteryClick}
      />

      {(Object.keys(windows) as WindowId[]).map((id) => {
        const state = windows[id];
        return (
          <Window
            key={id}
            id={id}
            title={windowTitles[id]}
            state={state}
            onClose={() => closeWindow(id)}
            onMinimize={() => minimizeWindow(id)}
            onMaximize={() => toggleMaximize(id)}
            onFocus={() => focusWindow(id)}
            onDragEnd={(top, left) => handleDragEnd(id, top, left)}
            onResizeEnd={(width, height) => handleResizeEnd(id, width, height)}
            resizeAspectRatio={id === 'photoboothWindow' ? 3 / 2 : undefined}
            bodyStyle={getWindowBodyStyle(id)}
          >
            {!state.closed && renderWindowContent(id)}
          </Window>
        );
      })}

      <Dock onOpenWindow={openWindow} runningWindows={runningWindows} autoHide={anyFullscreen} />
    </>
  );
}
