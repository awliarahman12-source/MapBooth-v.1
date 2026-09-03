import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Wifi,
  Bluetooth,
  Search,
  Sun,
  Moon,
  Volume2,
  Battery,
  BatteryCharging,
  Maximize,
  Minimize,
  type LucideIcon,
} from 'lucide-react';
import type { ThemeMode } from '@/types';
import { fetchSystemSettings, subscribeSystemSettings, getSystemSettings, type SystemSettings } from '@/systemStore';

interface MenuBarProps {
  theme: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
  onBatterySecretClick: () => void;
}

export default function MenuBar({ theme, onThemeChange, onBatterySecretClick }: MenuBarProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [controlCenterOpen, setControlCenterOpen] = useState(false);
  const [wifiOn, setWifiOn] = useState(true);
  const [btOn, setBtOn] = useState(true);
  const [darkModeOn, setDarkModeOn] = useState(theme === 'dark');
  const [showAbout, setShowAbout] = useState(false);
  const [systemInfo, setSystemInfo] = useState<SystemSettings>(getSystemSettings());
  const [browserFullscreen, setBrowserFullscreen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      await fetchSystemSettings();
      setSystemInfo(getSystemSettings());
    })();
    const unsub = subscribeSystemSettings(() => setSystemInfo(getSystemSettings()));
    return unsub;
  }, []);

  useEffect(() => {
    setDarkModeOn(theme === 'dark');
  }, [theme]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
        setControlCenterOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const onFsChange = () => setBrowserFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleBrowserFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // fullscreen not supported or denied
    }
  }, []);

  const toggleMenu = (id: string) => {
    setActiveMenu(activeMenu === id ? null : id);
    setControlCenterOpen(false);
  };

  const toggleDark = () => {
    const newMode = !darkModeOn ? 'dark' : 'light';
    setDarkModeOn(!darkModeOn);
    onThemeChange(newMode);
  };

  const menus = [
    {
      id: 'apple',
      label: '',
      icon: <AppleLogo />,
      items: [
        { label: 'About This Mac', shortcut: '', action: 'about' },
        { label: 'divider' },
        { label: 'System Settings…', shortcut: '' },
        { label: 'App Store…', shortcut: '' },
        { label: 'divider' },
        { label: 'Sleep', shortcut: '' },
        { label: 'Restart…', shortcut: '' },
        { label: 'Shut Down…', shortcut: '' },
      ],
    },
    { id: 'file', label: 'File', items: [{ label: 'New Window', shortcut: '⌘N' }, { label: 'Open…', shortcut: '⌘O' }, { label: 'Close Window', shortcut: '⌘W' }] },
    { id: 'edit', label: 'Edit', items: [{ label: 'Undo', shortcut: '⌘Z' }, { label: 'Redo', shortcut: '⇧⌘Z' }, { label: 'Cut', shortcut: '⌘X' }, { label: 'Copy', shortcut: '⌘C' }, { label: 'Paste', shortcut: '⌘V' }] },
    { id: 'view', label: 'View', items: [{ label: 'Enter Full Screen', shortcut: '⌃⌘F' }, { label: 'Show Toolbar', shortcut: '' }, { label: 'Show Sidebar', shortcut: '⌘⌥S' }] },
    { id: 'window', label: 'Window', items: [{ label: 'Minimize', shortcut: '⌘M' }, { label: 'Zoom', shortcut: '' }] },
    { id: 'help', label: 'Help', items: [{ label: 'macOS Help', shortcut: '⌘?' }] },
  ];

  return (
    <div className="menu-bar" ref={menuRef}>
      <div className="menu-left">
        {menus.map((m) => (
          <div key={m.id} className={`menu-container ${activeMenu === m.id ? 'active' : ''}`}>
            <div className="menu-btn" onClick={() => toggleMenu(m.id)}>
              {m.icon ? m.icon : m.label}
            </div>
            <div className="dropdown-menu">
              {m.items.map((item, i) =>
                item.label === 'divider' ? (
                  <div key={i} className="dropdown-divider" />
                ) : (
                  <div key={i} className="dropdown-item" onClick={() => {
                    if ((item as { action?: string }).action === 'about') setShowAbout(true);
                    setActiveMenu(null);
                  }}>
                    <span>{item.label}</span>
                    {item.shortcut && <span className="shortcut">{item.shortcut}</span>}
                  </div>
                )
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="menu-right">
        <div className="menu-icon-btn" title={systemInfo.battery} onClick={onBatterySecretClick}>
          <Battery size={16} />
        </div>
        <div className="menu-icon-btn" title={systemInfo.wifi} onClick={() => setWifiOn(!wifiOn)}>
          <Wifi size={15} color={wifiOn ? '#007AFF' : 'var(--text-sub)'} />
        </div>
        <div className="menu-icon-btn" title={systemInfo.bluetooth} onClick={() => setBtOn(!btOn)}>
          <Bluetooth size={15} color={btOn ? '#007AFF' : 'var(--text-sub)'} />
        </div>
        <div className="menu-icon-btn" title="Search">
          <Search size={15} />
        </div>
        <div
          className="menu-icon-btn"
          title={darkModeOn ? 'Light Mode' : 'Dark Mode'}
          onClick={toggleDark}
        >
          {darkModeOn ? <Sun size={15} /> : <Moon size={15} />}
        </div>
        <div
          className="menu-icon-btn"
          title="Control Center"
          onClick={() => { setControlCenterOpen(!controlCenterOpen); setActiveMenu(null); }}
        >
          <ControlCenterIcon />
        </div>
        <div className="menu-icon-btn" style={{ fontSize: 13, fontWeight: 600 }}>
          <span style={{ fontSize: 12 }}>Wed Sep 2</span>
        </div>
        <div className="menu-icon-btn" style={{ fontSize: 12 }}>
          9:41 AM
        </div>
      </div>

      {controlCenterOpen && (
        <div className="control-center-panel active">
          <div className="cc-row">
            <div className={`cc-card ${wifiOn ? 'active' : ''}`} onClick={() => setWifiOn(!wifiOn)}>
              <div className="cc-icon-circle"><Wifi size={16} /></div>
              <span>Wi-Fi</span>
            </div>
            <div className={`cc-card ${btOn ? 'active' : ''}`} onClick={() => setBtOn(!btOn)}>
              <div className="cc-icon-circle"><Bluetooth size={16} /></div>
              <span>Bluetooth</span>
            </div>
          </div>
          <div className="cc-row">
            <div className={`cc-card ${darkModeOn ? 'active' : ''}`} onClick={toggleDark}>
              <div className="cc-icon-circle">{darkModeOn ? <Moon size={16} /> : <Sun size={16} />}</div>
              <span>{darkModeOn ? 'Dark' : 'Light'}</span>
            </div>
          </div>
          <div className="cc-row">
            <div className={`cc-card ${browserFullscreen ? 'active' : ''}`} onClick={toggleBrowserFullscreen}>
              <div className="cc-icon-circle">{browserFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}</div>
              <span>{browserFullscreen ? 'Exit Full Screen' : 'Full Screen'}</span>
            </div>
          </div>
          <div className="cc-row">
            <div className="cc-card">
              <div className="cc-icon-circle"><Volume2 size={16} /></div>
              <span>Sound</span>
            </div>
          </div>
        </div>
      )}

      {showAbout && (
        <div className="about-mac-overlay" onClick={() => setShowAbout(false)}>
          <div className="about-mac-modal" onClick={(e) => e.stopPropagation()}>
            <button className="news-close-btn" onClick={() => setShowAbout(false)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
            <div className="about-mac-logo">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 12.04c-.03-2.6 2.13-3.85 2.22-3.91-1.21-1.77-3.1-2.01-3.77-2.04-1.6-.16-3.13.94-3.94.94-.82 0-2.08-.92-3.42-.89-1.76.03-3.39 1.02-4.3 2.6-1.84 3.19-.47 7.9 1.32 10.49.88 1.27 1.93 2.69 3.3 2.64 1.33-.05 1.83-.85 3.44-.85 1.6 0 2.06.85 3.45.82 1.43-.02 2.32-1.28 3.19-2.56 1.01-1.47 1.42-2.9 1.44-2.97-.03-.01-2.76-1.06-2.79-4.21zM14.6 4.46c.73-.88 1.22-2.11 1.09-3.33-1.05.04-2.32.7-3.07 1.58-.67.78-1.26 2.03-1.1 3.23 1.17.09 2.36-.59 3.08-1.48z" /></svg>
            </div>
            <h2 className="about-mac-title">{systemInfo.deviceName}</h2>
            <div className="about-mac-grid">
              <div className="about-mac-row"><span>Model</span><span>{systemInfo.model}</span></div>
              <div className="about-mac-row"><span>Chip</span><span>{systemInfo.chip}</span></div>
              <div className="about-mac-row"><span>Memory</span><span>{systemInfo.ram}</span></div>
              <div className="about-mac-row"><span>Storage</span><span>{systemInfo.storage}</span></div>
              <div className="about-mac-row"><span>Display</span><span>{systemInfo.display}</span></div>
              <div className="about-mac-row"><span>Resolution</span><span>{systemInfo.resolution}</span></div>
              <div className="about-mac-row"><span>Graphics</span><span>{systemInfo.graphics}</span></div>
              <div className="about-mac-row"><span>macOS</span><span>{systemInfo.macosVersion}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AppleLogo() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 12.04c-.03-2.6 2.13-3.85 2.22-3.91-1.21-1.77-3.1-2.01-3.77-2.04-1.6-.16-3.13.94-3.94.94-.82 0-2.08-.92-3.42-.89-1.76.03-3.39 1.02-4.3 2.6-1.84 3.19-.47 7.9 1.32 10.49.88 1.27 1.93 2.69 3.3 2.64 1.33-.05 1.83-.85 3.44-.85 1.6 0 2.06.85 3.45.82 1.43-.02 2.32-1.28 3.19-2.56 1.01-1.47 1.42-2.9 1.44-2.97-.03-.01-2.76-1.06-2.79-4.21zM14.6 4.46c.73-.88 1.22-2.11 1.09-3.33-1.05.04-2.32.7-3.07 1.58-.67.78-1.26 2.03-1.1 3.23 1.17.09 2.36-.59 3.08-1.48z" />
    </svg>
  );
}

function ControlCenterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="8" height="8" rx="2" />
      <rect x="13" y="3" width="8" height="8" rx="2" />
      <rect x="3" y="13" width="8" height="8" rx="2" />
      <rect x="13" y="13" width="8" height="8" rx="2" />
    </svg>
  );
}
