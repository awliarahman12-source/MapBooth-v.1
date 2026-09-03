import type { WindowId } from '@/types';

interface DockProps {
  onOpenWindow: (id: WindowId) => void;
  runningWindows: Set<WindowId>;
  autoHide?: boolean;
}

interface DockIconDef {
  id: WindowId;
  label: string;
  gradient: string;
  inner: React.ReactNode;
}

export default function Dock({ onOpenWindow, runningWindows, autoHide }: DockProps) {
  const icons: DockIconDef[] = [
    {
      id: 'finderWindow',
      label: 'Finder',
      gradient: 'linear-gradient(145deg, #4FC3F7 0%, #0288D1 100%)',
      inner: <FinderSvg />,
    },
    {
      id: 'settingsWindow',
      label: 'System Settings',
      gradient: 'linear-gradient(145deg, #8E8E93 0%, #48484A 100%)',
      inner: <GearSvg />,
    },
    {
      id: 'photosWindow',
      label: 'Photos',
      gradient: 'linear-gradient(145deg, #FFFFFF 0%, #F0F0F2 100%)',
      inner: <PhotosSvg />,
    },
    {
      id: 'photoboothWindow',
      label: 'Photo Booth',
      gradient: 'linear-gradient(145deg, #C644FC 0%, #5856D6 100%)',
      inner: <CameraSvg />,
    },
    {
      id: 'newsWindow',
      label: 'News',
      gradient: 'linear-gradient(145deg, #FF6B6B 0%, #FF3B30 100%)',
      inner: <NewsSvg />,
    },
  ];

  return (
    <>
      {autoHide && <div className="dock-hover-zone" />}
      <div className={`dock-container${autoHide ? ' dock-autohide' : ''}`}>
        <div className="dock">
          {icons.map((ic) => (
            <div key={ic.id} className={`dock-wrapper ${runningWindows.has(ic.id) ? 'running' : ''}`}>
              <div
                className="tahoe-icon"
                title={ic.label}
                style={{ background: ic.gradient }}
                onClick={() => onOpenWindow(ic.id)}
              >
                {ic.inner}
              </div>
              <div className="app-dot" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function FinderSvg() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path d="M16 4C9.37 4 4 9.37 4 16s5.37 12 12 12 12-5.37 12-12S22.63 4 16 4z" fill="white" opacity="0.95" />
      <path d="M16 6c-1.5 0-2 1.5-2 3v14c0 1.5.5 3 2 3s2-1.5 2-3V9c0-1.5-.5-3-2-3z" fill="#0288D1" opacity="0.4" />
      <circle cx="12" cy="13" r="1.4" fill="#0288D1" />
      <circle cx="20" cy="13" r="1.4" fill="#FF9500" />
    </svg>
  );
}

function GearSvg() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="white">
      <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94 0 .31.03.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
    </svg>
  );
}

function PhotosSvg() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" fill="#FF9500" />
      <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" fill="#FF2D55" />
      <path d="M12 22a4 4 0 0 1-4-4v-2a4 4 0 0 1 8 0v2a4 4 0 0 1-4 4z" fill="#FF3B30" />
      <path d="M22 12a4 4 0 0 1-4 4h-2a4 4 0 0 1 0-8h2a4 4 0 0 1 4 4z" fill="#34C759" />
      <path d="M2 12a4 4 0 0 1 4-4h2a4 4 0 0 1 0 8H6a4 4 0 0 1-4-4z" fill="#007AFF" />
    </svg>
  );
}

function CameraSvg() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="white">
      <path d="M9 3L7.17 5H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.17L15 3H9zm3 15a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" />
      <circle cx="12" cy="12" r="3" fill="#5856D6" />
    </svg>
  );
}

function NewsSvg() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
      <path d="M4 4h14a2 2 0 0 1 2 2v12a3 3 0 0 1-3 3H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" opacity="0.95" />
      <rect x="5" y="7" width="10" height="3" rx="0.5" fill="#FF3B30" opacity="0.9" />
      <rect x="5" y="12" width="10" height="1.5" rx="0.5" fill="#FF6B6B" opacity="0.8" />
      <rect x="5" y="15" width="7" height="1.5" rx="0.5" fill="#FF6B6B" opacity="0.8" />
      <rect x="5" y="17.5" width="8" height="1.5" rx="0.5" fill="#FF6B6B" opacity="0.8" />
    </svg>
  );
}
