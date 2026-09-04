import type { WindowId } from '@/types';

interface DockProps {
  onOpenWindow: (id: WindowId) => void;
  runningWindows: Set<WindowId>;
  autoHide?: boolean;
}

interface DockIconDef {
  id: WindowId;
  label: string;
  icon: string;
}

export default function Dock({ onOpenWindow, runningWindows, autoHide }: DockProps) {
  const icons: DockIconDef[] = [
    { id: 'finderWindow', label: 'Finder', icon: '/assets/icons/finder.png' },
    { id: 'settingsWindow', label: 'System Settings', icon: '/assets/icons/setting.png' },
    { id: 'photosWindow', label: 'Photos', icon: '/assets/icons/photos copy.png' },
    { id: 'photoboothWindow', label: 'Photo Booth', icon: '/assets/icons/photobooth copy.webp' },
    { id: 'newsWindow', label: 'News', icon: '/assets/icons/news.png' },
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
                onClick={() => onOpenWindow(ic.id)}
              >
                <img src={ic.icon} alt={ic.label} draggable={false} />
              </div>
              <div className="app-dot" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
