import { useState, useRef, useCallback } from 'react';
import type { ThemeMode } from '@/types';
import { createClient } from '@supabase/supabase-js';
import { Plus } from 'lucide-react';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

interface CustomWallpaper {
  id: string;
  url: string;
  name: string;
}

interface SettingsContentProps {
  theme: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
  customWallpapers: CustomWallpaper[];
  activeWallpaper: string;
  onAddWallpaper: (wallpaper: CustomWallpaper) => void;
  onWallpaperChange: (wp: string) => void;
}

export const builtInWallpapers = [
  { id: 'default', name: 'Tahoe Default', gradient: 'radial-gradient(circle at 20% 20%, #e0c3fc 0%, transparent 50%), radial-gradient(circle at 80% 80%, #8ec5fc 0%, transparent 50%), radial-gradient(circle at 50% 50%, #f5f7fa 0%, #c3cfe2 100%)' },
  { id: 'sunset', name: 'Sunset', gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%)' },
  { id: 'ocean', name: 'Ocean', gradient: 'linear-gradient(135deg, #2E3192 0%, #1BFFFF 100%)' },
  { id: 'forest', name: 'Forest', gradient: 'linear-gradient(135deg, #134E5E 0%, #71B280 100%)' },
  { id: 'aurora', name: 'Aurora', gradient: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)' },
  { id: 'peach', name: 'Peach', gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' },
];

export default function SettingsContent({
  theme,
  onThemeChange,
  customWallpapers,
  activeWallpaper,
  onAddWallpaper,
  onWallpaperChange,
}: SettingsContentProps) {
  const [activeTab, setActiveTab] = useState('appearance');
  const [wifiOn, setWifiOn] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs = [
    { id: 'appleid', label: 'Apple ID', group: null, badge: 'linear-gradient(135deg, #007AFF, #00C6FF)' },
    { id: 'wifi', label: 'Wi-Fi', group: 'NETWORK', badge: 'linear-gradient(135deg, #007AFF, #5856D6)' },
    { id: 'bluetooth', label: 'Bluetooth', group: null, badge: 'linear-gradient(135deg, #007AFF, #34C759)' },
    { id: 'appearance', label: 'Appearance', group: 'PERSONALIZATION', badge: 'linear-gradient(135deg, #FF9500, #FF3B30)' },
    { id: 'wallpaper', label: 'Wallpaper', group: null, badge: 'linear-gradient(135deg, #34C759, #30D0C0)' },
    { id: 'display', label: 'Displays', group: null, badge: 'linear-gradient(135deg, #FF9500, #FF5E00)' },
    { id: 'sound', label: 'Sound', group: null, badge: 'linear-gradient(135deg, #FF2D55, #AF52DE)' },
    { id: 'lockscreen', label: 'Lock Screen', group: 'HARDWARE & LOCK', badge: 'linear-gradient(135deg, #5856D6, #34C759)' },
    { id: 'photos', label: 'Photos', group: 'APPS', badge: 'linear-gradient(135deg, #FF2D55, #FF9500)' },
    { id: 'photobooth', label: 'Photo Booth', group: null, badge: 'linear-gradient(135deg, #AF52DE, #5856D6)' },
  ];

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) return;

    setUploading(true);
    try {
      const fileName = `wallpaper-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { error: uploadError } = await supabase.storage.from('wallpapers').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('wallpapers').getPublicUrl(fileName);
      const url = urlData.publicUrl;

      const { data, error: dbError } = await supabase
        .from('wallpapers')
        .insert({ url, name: file.name })
        .select('id, url, name')
        .single();

      if (dbError) throw dbError;
      if (data) onAddWallpaper(data as CustomWallpaper);
    } catch {
      // silently fail
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [onAddWallpaper]);

  return (
    <div className="settings-layout">
      <div className="settings-sidebar">
        {tabs.map((tab, i) => (
          <div key={tab.id}>
            {tab.group && <div className="settings-sidebar-group">{tab.group}</div>}
            <div
              className={`settings-nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <div className="tahoe-badge" style={{ background: tab.badge }}>
                <SettingsBadgeIcon id={tab.id} />
              </div>
              {tab.label}
            </div>
          </div>
        ))}
      </div>

      <div className="settings-content">
        {activeTab === 'appleid' && (
          <div className="settings-panel active">
            <div className="settings-title">
              <div className="tahoe-badge" style={{ background: 'linear-gradient(135deg, #007AFF, #00C6FF)', width: 28, height: 28 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
              </div>
              Apple ID
            </div>
            <div className="settings-card profile-card">
              <div className="profile-avatar">A</div>
              <div>
                <h3 style={{ fontSize: 16 }}>Alex Rivera</h3>
                <p style={{ fontSize: 12, color: 'var(--text-sub)' }}>alex.rivera@icloud.com</p>
                <span style={{ fontSize: 10, background: 'rgba(0, 122, 255, 0.15)', color: '#007AFF', padding: '2px 8px', borderRadius: 4, fontWeight: 600, marginTop: 6, display: 'inline-block' }}>Apple ID Verified</span>
              </div>
            </div>
            <div className="settings-card">
              <div className="setting-row">
                <div className="setting-label"><span>iCloud Storage</span><span className="setting-desc">Shared with family plan</span></div>
                <span style={{ color: 'var(--text-sub)', fontSize: 12 }}>128.5 GB of 2 TB Used</span>
              </div>
              <div className="setting-row">
                <div className="setting-label"><span>Media & Purchases</span><span className="setting-desc">App Store, Apple Music, TV+</span></div>
                <span style={{ color: 'var(--text-sub)', fontSize: 12 }}>Active</span>
              </div>
              <div className="setting-row">
                <div className="setting-label"><span>Find My Mac</span><span className="setting-desc">Locate this Mac using iCloud</span></div>
                <span style={{ color: '#34C759', fontWeight: 600 }}>Enabled</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'wifi' && (
          <div className="settings-panel active">
            <div className="settings-title">
              <div className="tahoe-badge" style={{ background: 'linear-gradient(135deg, #007AFF, #5856D6)', width: 28, height: 28 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 3c-4.97 0-9.47 2.01-12.73 5.27l2.12 2.12C4.12 7.66 7.82 6 12 6s7.88 1.66 10.61 4.39l2.12-2.12C21.47 5.01 16.97 3 12 3zm0 6c-3.31 0-6.31 1.34-8.49 3.51l2.12 2.12C7.21 13.05 9.48 12 12 12s4.79 1.05 6.37 2.63l2.12-2.12C18.31 10.34 15.31 9 12 9zm0 6c-1.66 0-3.16.67-4.24 1.76l4.24 4.24 4.24-4.24C15.16 15.67 13.66 15 12 15z" /></svg>
              </div>
              Wi-Fi Settings
            </div>
            <div className="settings-card">
              <div className="setting-row">
                <div className="setting-label"><span style={{ fontWeight: 600 }}>Wi-Fi Network</span><span className="setting-desc">Connect to wireless networks</span></div>
                <label className="switch">
                  <input type="checkbox" checked={wifiOn} onChange={(e) => setWifiOn(e.target.checked)} />
                  <span className="slider" />
                </label>
              </div>
            </div>
            <div className="settings-card">
              <div className="setting-row"><span>Connected Network</span><span style={{ color: '#007AFF', fontWeight: 600 }}>{wifiOn ? 'Tahoe_5G' : 'Off'}</span></div>
              <div className="setting-row"><span>IP Address</span><span style={{ color: 'var(--text-sub)', fontSize: 12 }}>192.168.1.105</span></div>
              <div className="setting-row"><span>Ask to Join Networks</span><label className="switch"><input type="checkbox" defaultChecked /><span className="slider" /></label></div>
            </div>
          </div>
        )}

        {activeTab === 'bluetooth' && (
          <div className="settings-panel active">
            <div className="settings-title">
              <div className="tahoe-badge" style={{ background: 'linear-gradient(135deg, #007AFF, #34C759)', width: 28, height: 28 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M17.71 7.71L12 2h-1v7.59L6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 11 14.41V22h1l5.71-5.71-4.3-4.29 4.3-4.29zM13 5.83l1.88 1.88L13 9.59V5.83zm1.88 10.46L13 18.17v-3.76l1.88 1.88z" /></svg>
              </div>
              Bluetooth
            </div>
            <div className="settings-card">
              <div className="setting-row">
                <div className="setting-label"><span style={{ fontWeight: 600 }}>Bluetooth</span><span className="setting-desc">Discoverable as "Alex's MacBook Pro"</span></div>
                <label className="switch"><input type="checkbox" defaultChecked /><span className="slider" /></label>
              </div>
            </div>
            <div className="settings-card">
              <div className="setting-row"><div className="setting-label"><span>AirPods Max</span><span className="setting-desc">Audio Output</span></div><span style={{ color: '#34C759', fontSize: 12, fontWeight: 600 }}>Connected (88%)</span></div>
              <div className="setting-row"><div className="setting-label"><span>Magic Keyboard</span><span className="setting-desc">Input Device</span></div><span style={{ color: '#34C759', fontSize: 12, fontWeight: 600 }}>Connected (92%)</span></div>
            </div>
          </div>
        )}

        {activeTab === 'appearance' && (
          <div className="settings-panel active">
            <div className="settings-title">
              <div className="tahoe-badge" style={{ background: 'linear-gradient(135deg, #FF9500, #FF3B30)', width: 28, height: 28 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="12" r="10" fill="none" stroke="white" strokeWidth="2" /><path d="M12 2a10 10 0 0 0 0 20z" /></svg>
              </div>
              Appearance
            </div>
            <div className="settings-card">
              <div className="setting-label" style={{ marginBottom: 10 }}>
                <span style={{ fontWeight: 600 }}>Theme Mode</span>
                <span className="setting-desc">Select your preferred system appearance (Default: Light Mode)</span>
              </div>
              <div className="theme-selector-container">
                <div className={`theme-option ${theme === 'light' ? 'active' : ''}`} onClick={() => onThemeChange('light')}>
                  <div className="theme-preview-box"><div className="theme-preview-light" /></div>
                  <span style={{ fontSize: 12 }}>Light</span>
                </div>
                <div className={`theme-option ${theme === 'dark' ? 'active' : ''}`} onClick={() => onThemeChange('dark')}>
                  <div className="theme-preview-box"><div className="theme-preview-dark" /></div>
                  <span style={{ fontSize: 12 }}>Dark</span>
                </div>
                <div className={`theme-option ${theme === 'auto' ? 'active' : ''}`} onClick={() => onThemeChange('auto')}>
                  <div className="theme-preview-box"><div className="theme-preview-auto" /></div>
                  <span style={{ fontSize: 12 }}>Auto</span>
                </div>
              </div>
            </div>
            <div className="settings-card">
              <div className="setting-row">
                <div className="setting-label"><span>Accent Color</span><span className="setting-desc">Highlight color for controls and active items</span></div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#007AFF', border: '2px solid var(--text-main)', cursor: 'pointer' }} />
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#AF52DE', cursor: 'pointer' }} />
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#FF3B30', cursor: 'pointer' }} />
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#34C759', cursor: 'pointer' }} />
                </div>
              </div>
              <div className="setting-row">
                <div className="setting-label"><span>Glass Transparency Blur</span><span className="setting-desc">Real-time frosted backdrop filter</span></div>
                <label className="switch"><input type="checkbox" defaultChecked /><span className="slider" /></label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'wallpaper' && (
          <div className="settings-panel active">
            <div className="settings-title">
              <div className="tahoe-badge" style={{ background: 'linear-gradient(135deg, #34C759, #30D0C0)', width: 28, height: 28 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" /></svg>
              </div>
              Wallpaper
            </div>
            <div className="settings-card">
              <div className="setting-label" style={{ marginBottom: 12 }}>
                <span style={{ fontWeight: 600 }}>Desktop Wallpaper</span>
                <span className="setting-desc">Choose a wallpaper or add your own image</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {builtInWallpapers.map((wp) => (
                  <div
                    key={wp.id}
                    onClick={() => onWallpaperChange(wp.id)}
                    style={{
                      width: 96,
                      cursor: 'pointer',
                      borderRadius: 10,
                      overflow: 'hidden',
                      border: activeWallpaper === wp.id ? '3px solid #007AFF' : '2px solid var(--card-border)',
                      transition: 'border-color 0.2s, transform 0.2s',
                    }}
                  >
                    <div style={{ width: '100%', height: 60, background: wp.gradient }} />
                    <div style={{ fontSize: 11, padding: '5px 6px', textAlign: 'center', color: 'var(--text-main)', fontWeight: 500 }}>{wp.name}</div>
                  </div>
                ))}
                {customWallpapers.map((wp) => (
                  <div
                    key={wp.id}
                    onClick={() => onWallpaperChange(`custom:${wp.id}`)}
                    style={{
                      width: 96,
                      cursor: 'pointer',
                      borderRadius: 10,
                      overflow: 'hidden',
                      border: activeWallpaper === `custom:${wp.id}` ? '3px solid #007AFF' : '2px solid var(--card-border)',
                      transition: 'border-color 0.2s, transform 0.2s',
                    }}
                  >
                    <div style={{ width: '100%', height: 60, backgroundImage: `url('${wp.url}')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                    <div style={{ fontSize: 11, padding: '5px 6px', textAlign: 'center', color: 'var(--text-main)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wp.name}</div>
                  </div>
                ))}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: 96,
                    cursor: uploading ? 'wait' : 'pointer',
                    borderRadius: 10,
                    overflow: 'hidden',
                    border: '2px dashed var(--card-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    transition: 'border-color 0.2s, background 0.2s',
                    opacity: uploading ? 0.5 : 1,
                  }}
                >
                  <div style={{ width: '100%', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Plus size={24} color="var(--text-sub)" />
                  </div>
                  <div style={{ fontSize: 11, padding: '5px 6px', textAlign: 'center', color: 'var(--text-sub)', fontWeight: 500 }}>{uploading ? 'Uploading...' : 'Adjust'}</div>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
            </div>
          </div>
        )}

        {activeTab === 'display' && (
          <div className="settings-panel active">
            <div className="settings-title">
              <div className="tahoe-badge" style={{ background: 'linear-gradient(135deg, #FF9500, #FF5E00)', width: 28, height: 28 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M20 3H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h6l-2 3v1h8v-1l-2-3h6c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 12H4V5h16v10z" /></svg>
              </div>
              Displays
            </div>
            <div className="settings-card">
              <div className="setting-row"><div className="setting-label"><span>Display Brightness</span><span className="setting-desc">Liquid Retina XDR Display</span></div><input type="range" min="20" max="100" defaultValue="90" style={{ width: 140 }} /></div>
              <div className="setting-row"><div className="setting-label"><span>True Tone</span><span className="setting-desc">Adapt screen tone to ambient light</span></div><label className="switch"><input type="checkbox" defaultChecked /><span className="slider" /></label></div>
              <div className="setting-row"><div className="setting-label"><span>Refresh Rate</span><span className="setting-desc">ProMotion Dynamic Refresh</span></div><span style={{ color: 'var(--text-sub)', fontSize: 12 }}>120Hz ProMotion</span></div>
            </div>
          </div>
        )}

        {activeTab === 'sound' && (
          <div className="settings-panel active">
            <div className="settings-title">
              <div className="tahoe-badge" style={{ background: 'linear-gradient(135deg, #FF2D55, #AF52DE)', width: 28, height: 28 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" /></svg>
              </div>
              Sound
            </div>
            <div className="settings-card">
              <div className="setting-row"><div className="setting-label"><span>Output Volume</span><span className="setting-desc">MacBook Pro Speakers</span></div><input type="range" min="0" max="100" defaultValue="75" style={{ width: 140 }} /></div>
              <div className="setting-row"><div className="setting-label"><span>Spatial Audio</span><span className="setting-desc">Head tracking enabled</span></div><label className="switch"><input type="checkbox" defaultChecked /><span className="slider" /></label></div>
            </div>
          </div>
        )}

        {activeTab === 'lockscreen' && (
          <div className="settings-panel active">
            <div className="settings-title">
              <div className="tahoe-badge" style={{ background: 'linear-gradient(135deg, #5856D6, #34C759)', width: 28, height: 28 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" /></svg>
              </div>
              Lock Screen & Touch ID
            </div>
            <div className="settings-card">
              <div className="setting-row"><div className="setting-label"><span>Require Password After Sleep</span><span className="setting-desc">Immediately upon screen locking</span></div><span style={{ color: 'var(--text-sub)', fontSize: 12 }}>Immediately</span></div>
              <div className="setting-row"><div className="setting-label"><span>Touch ID Unlock</span><span className="setting-desc">Use fingerprint to unlock Mac</span></div><label className="switch"><input type="checkbox" defaultChecked /><span className="slider" /></label></div>
            </div>
          </div>
        )}

        {activeTab === 'photos' && (
          <div className="settings-panel active">
            <div className="settings-title">
              <div className="tahoe-badge" style={{ background: 'linear-gradient(135deg, #FF2D55, #FF9500)', width: 28, height: 28 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="12" r="3" /><path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4zm0 20a4 4 0 0 1-4-4v-2a4 4 0 0 1 8 0v2a4 4 0 0 1-4 4zm10-10a4 4 0 0 1-4 4h-2a4 4 0 0 1 0-8h2a4 4 0 0 1 4 4zM2 12a4 4 0 0 1 4-4h2a4 4 0 0 1 0 8H6a4 4 0 0 1-4-4z" /></svg>
              </div>
              Photos Options
            </div>
            <div className="settings-card">
              <div className="setting-row"><div className="setting-label"><span>iCloud Photos Sync</span><span className="setting-desc">Automatically upload and store photos</span></div><label className="switch"><input type="checkbox" defaultChecked /><span className="slider" /></label></div>
            </div>
          </div>
        )}

        {activeTab === 'photobooth' && (
          <div className="settings-panel active">
            <div className="settings-title">
              <div className="tahoe-badge" style={{ background: 'linear-gradient(135deg, #AF52DE, #5856D6)', width: 28, height: 28 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M9 3L7.17 5H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.17L15 3H9zm3 15a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" /></svg>
              </div>
              Photo Booth Options
            </div>
            <div className="settings-card">
              <div className="setting-row"><div className="setting-label"><span>Screen Flash Effect</span><span className="setting-desc">Flash screen white during countdown</span></div><label className="switch"><input type="checkbox" defaultChecked /><span className="slider" /></label></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsBadgeIcon({ id }: { id: string }) {
  const icons: Record<string, React.ReactNode> = {
    appleid: <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />,
    wifi: <path d="M12 3c-4.97 0-9.47 2.01-12.73 5.27l2.12 2.12C4.12 7.66 7.82 6 12 6s7.88 1.66 10.61 4.39l2.12-2.12C21.47 5.01 16.97 3 12 3zm0 6c-3.31 0-6.31 1.34-8.49 3.51l2.12 2.12C7.21 13.05 9.48 12 12 12s4.79 1.05 6.37 2.63l2.12-2.12C18.31 10.34 15.31 9 12 9zm0 6c-1.66 0-3.16.67-4.24 1.76l4.24 4.24 4.24-4.24C15.16 15.67 13.66 15 12 15z" />,
    bluetooth: <path d="M17.71 7.71L12 2h-1v7.59L6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 11 14.41V22h1l5.71-5.71-4.3-4.29 4.3-4.29zM13 5.83l1.88 1.88L13 9.59V5.83zm1.88 10.46L13 18.17v-3.76l1.88 1.88z" />,
    appearance: <><circle cx="12" cy="12" r="10" fill="none" stroke="white" strokeWidth="2" /><path d="M12 2a10 10 0 0 0 0 20z" /></>,
    wallpaper: <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />,
    display: <path d="M20 3H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h6l-2 3v1h8v-1l-2-3h6c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 12H4V5h16v10z" />,
    sound: <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />,
    lockscreen: <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />,
    photos: <><circle cx="12" cy="12" r="3" /><path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4zm0 20a4 4 0 0 1-4-4v-2a4 4 0 0 1 8 0v2a4 4 0 0 1-4 4zm10-10a4 4 0 0 1-4 4h-2a4 4 0 0 1 0-8h2a4 4 0 0 1 4 4zM2 12a4 4 0 0 1 4-4h2a4 4 0 0 1 0 8H6a4 4 0 0 1-4-4z" /></>,
    photobooth: <path d="M9 3L7.17 5H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.17L15 3H9zm3 15a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" />,
  };
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
      {icons[id] || null}
    </svg>
  );
}
