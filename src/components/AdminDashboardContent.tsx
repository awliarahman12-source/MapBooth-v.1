import { useState, useEffect, useRef, useCallback } from 'react';
import {
  LayoutDashboard,
  Camera,
  Images,
  Film,
  Settings,
  Monitor,
  Wallpaper as WallpaperIcon,
  LayoutGrid,
  AppWindow,
  Menu as MenuIcon,
  Dock as DockIcon,
  Palette,
  Image as ImageIcon,
  RotateCcw,
  Cpu,
  Newspaper,
  Shield,
  Save,
  Calendar,
  ArrowUp,
  ArrowDown,
  Plus as PlusIcon,
  Plus,
  Trash2,
  Edit2,
  Download,
  Search,
  X,
  Upload,
  Star,
  Eye,
  type LucideIcon,
} from 'lucide-react';
import type { AdminTab, ThemeMode } from '@/types';
import { DraftProvider, useDraft, useDraftState } from '@/adminDraft';
import { builtInWallpapers } from '@/components/SettingsContent';
import {
  fetchAdminMedia,
  subscribeAdminMedia,
  subscribeCaptureMode,
  setPrivateCaptureEnabled,
  deleteAdminMedia,
  renameAdminMedia,
  uploadAdminMediaFile,
  downloadAdminMediaOriginal,
  downloadPublicMediaOriginal,
  isPrivateCaptureEnabled,
  getSyncStatus,
  subscribeSyncStatus,
  type SyncStatus,
  type AdminPrivateMedia,
} from '@/adminStore';
import {
  fetchFilters,
  subscribeFilters,
  addCustomFilter,
  addCanvasFilter,
  updateFilter as updateFilterFn,
  deleteFilter,
  type AdminFilter,
} from '@/filterStore';
import {
  ENGINE_LIST,
  getEngine,
  getDefaultParams,
  applyEngine,
  type EngineName,
} from '@/utils/filterEngines';
import {
  fetchPublicPhotos,
  fetchPublicAlbums,
  subscribePhotos,
  subscribeAlbums,
  uploadPhotos,
  updatePhoto,
  deletePhoto,
  createAlbum,
  deleteAlbum,
  type PublicPhoto,
  type PublicAlbum,
} from '@/photoStore';
import {
  fetchSettings,
  subscribeSettings,
  getDockSettings,
  getCustomDockIcons,
  getCustomAppIcons,
  getMenuBarSettings,
  getBrandingAssets,
  updateDockSettings,
  updateMenuBarSettings,
  uploadIcon,
  resetIcon,
  uploadBrandingAsset,
  resetBrandingAsset,
  uploadWallpaper,
  renameWallpaper,
  deleteWallpaper,
  resetAllSettings,
  DEFAULT_DOCK_SETTINGS,
  DEFAULT_MENU_BAR_SETTINGS,
  type DockSettings,
  type MenuBarSettings,
  type BrandingAssets,
  supabase,
} from '@/settingsStore';
import { getMedia, subscribe as subscribeMedia } from '@/mediaStore';
import type { SharedMediaItem } from '@/mediaStore';
import {
  fetchSystemSettings,
  updateSystemSettings,
  getSystemSettings,
  subscribeSystemSettings,
  DEFAULT_SYSTEM_SETTINGS,
  type SystemSettings,
} from '@/systemStore';
import {
  fetchNewsSettings,
  updateNewsSettings,
  getNewsSettings,
  subscribeNewsSettings,
  fetchAdminNews,
  subscribeNews,
  addNews,
  updateNews,
  deleteNews,
  reorderNews,
  uploadNewsImage,
  DEFAULT_NEWS_SETTINGS,
  type NewsItem,
  type NewsSettings as NewsSettingsType,
} from '@/newsStore';
import {
  fetchAdSettings,
  updateAdSettings,
  getAdSettings,
  subscribeAdSettings,
  uploadAdImage,
  DEFAULT_AD_SETTINGS,
  type AdSettings,
  type AdItem,
} from '@/adsStore';

interface CustomWallpaper {
  id: string;
  url: string;
  name: string;
}

interface AdminDashboardContentProps {
  onCloseLogin: () => void;
  customWallpapers: CustomWallpaper[];
  activeWallpaper: string;
  theme: ThemeMode;
  onAddWallpaper: (wp: CustomWallpaper) => void;
  onWallpaperChange: (wp: string) => void;
  onThemeChange: (mode: ThemeMode) => void;
}

interface SettingsSubTab {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
}

interface SystemSubTab {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
}

const NAV_ITEMS: { id: AdminTab; label: string; icon: LucideIcon; color: string }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, color: '#007AFF' },
  { id: 'photobooth', label: 'Photo Booth', icon: Camera, color: '#AF52DE' },
  { id: 'photos', label: 'Photos', icon: Images, color: '#FF9500' },
  { id: 'media', label: 'Media', icon: Film, color: '#FF2D55' },
  { id: 'settings', label: 'Settings', icon: Settings, color: '#8E8E93' },
  { id: 'system', label: 'System', icon: Monitor, color: '#34C759' },
  { id: 'ads', label: 'Advertising', icon: Star, color: '#FF9500' },
];

const SETTINGS_TABS: SettingsSubTab[] = [
  { id: 'wallpaper', label: 'Wallpaper', icon: WallpaperIcon, color: '#34C759' },
  { id: 'dock-icons', label: 'Dock Icons', icon: LayoutGrid, color: '#007AFF' },
  { id: 'app-icons', label: 'App Icons', icon: AppWindow, color: '#5856D6' },
  { id: 'menu-bar', label: 'Menu Bar', icon: MenuIcon, color: '#FF9500' },
  { id: 'dock', label: 'Dock', icon: DockIcon, color: '#00C7BE' },
  { id: 'appearance', label: 'Appearance', icon: Palette, color: '#FF2D55' },
  { id: 'branding', label: 'Branding / System Assets', icon: ImageIcon, color: '#AF52DE' },
  { id: 'reset', label: 'Reset', icon: RotateCcw, color: '#FF3B30' },
];

const SYSTEM_TABS: SystemSubTab[] = [
  { id: 'device-specs', label: 'Device Specs', icon: Cpu, color: '#007AFF' },
  { id: 'news', label: 'News Pop-up', icon: Newspaper, color: '#FF9500' },
];

export default function AdminDashboardContent({
  onCloseLogin,
  customWallpapers,
  activeWallpaper,
  theme,
  onAddWallpaper,
  onWallpaperChange,
  onThemeChange,
}: AdminDashboardContentProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [settingsSubTab, setSettingsSubTab] = useState('wallpaper');
  const [systemSubTab, setSystemSubTab] = useState('device-specs');
  const [mediaCount, setMediaCount] = useState(getMedia().length);
  const [adminMediaCount, setAdminMediaCount] = useState(0);
  const [publicPhotosCount, setPublicPhotosCount] = useState(0);
  const [, setSettingsTick] = useState(0);

  useEffect(() => {
    fetchSettings();
    const unsub = subscribeSettings(() => setSettingsTick((t) => t + 1));
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = subscribeMedia((items) => setMediaCount(items.length));
    return unsub;
  }, []);

  useEffect(() => {
    fetchAdminMedia();
    const unsub = subscribeAdminMedia((items) => setAdminMediaCount(items.length));
    return unsub;
  }, []);

  useEffect(() => {
    fetchPublicPhotos();
    const unsub = subscribePhotos((items) => setPublicPhotosCount(items.length));
    return unsub;
  }, []);

  const totalWallpapers = builtInWallpapers.length + customWallpapers.length;

  return (
    <DraftProvider>
      <div className="admin-dashboard-layout">
        <div className="admin-sidebar">
          <div className="admin-sidebar-header">ADMIN PANEL</div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className={`admin-nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <Icon size={16} color={activeTab === item.id ? 'white' : item.color} />
                {item.label}
              </div>
            );
          })}
        </div>

        <div className="admin-content">
          {activeTab === 'overview' && (
            <OverviewTab
              mediaCount={mediaCount}
              adminMediaCount={adminMediaCount}
              publicPhotosCount={publicPhotosCount}
              totalWallpapers={totalWallpapers}
              customWallpaperCount={customWallpapers.length}
              theme={theme}
            />
          )}

          {activeTab === 'photobooth' && <PhotoBoothTab />}

          {activeTab === 'photos' && <PhotosTab />}

          {activeTab === 'media' && <MediaTab />}

          {activeTab === 'settings' && (
            <SettingsTab
              subTab={settingsSubTab}
              onSubTabChange={setSettingsSubTab}
              customWallpapers={customWallpapers}
              activeWallpaper={activeWallpaper}
              onAddWallpaper={onAddWallpaper}
              onWallpaperChange={onWallpaperChange}
              theme={theme}
              onThemeChange={onThemeChange}
            />
          )}

          {activeTab === 'system' && (
            <SystemTab
              subTab={systemSubTab}
              onSubTabChange={setSystemSubTab}
            />
          )}

          {activeTab === 'ads' && <AdsManagement />}

          <GlobalActionBar />
        </div>
      </div>
    </DraftProvider>
  );
}

function GlobalActionBar() {
  const { saveAll, discardAll, hasAnyDirty } = useDraft();
  const [saving, setSaving] = useState(false);
  if (!hasAnyDirty) return null;
  return (
    <div className="admin-global-action-bar">
      <span className="admin-unsaved-indicator">Unsaved changes</span>
      <button
        className="admin-btn-cancel"
        onClick={discardAll}
        disabled={saving}
      >Discard All</button>
      <button
        className="admin-btn-save"
        onClick={async () => { setSaving(true); await saveAll(); setSaving(false); }}
        disabled={saving}
      >{saving ? 'Saving…' : 'Save All'}</button>
    </div>
  );
}

function OverviewTab({
  mediaCount,
  adminMediaCount,
  publicPhotosCount,
  totalWallpapers,
  customWallpaperCount,
  theme,
}: {
  mediaCount: number;
  adminMediaCount: number;
  publicPhotosCount: number;
  totalWallpapers: number;
  customWallpaperCount: number;
  theme: ThemeMode;
}) {
  return (
    <>
      <div className="admin-content-title">Overview</div>
      <div className="admin-stat-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-label">Public Media (Temp)</div>
          <div className="admin-stat-value">{mediaCount}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Admin Private Media</div>
          <div className="admin-stat-value">{adminMediaCount}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Public Photos</div>
          <div className="admin-stat-value">{publicPhotosCount}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Total Wallpapers</div>
          <div className="admin-stat-value">{totalWallpapers}</div>
        </div>
      </div>
      <div className="settings-card">
        <div className="setting-row">
          <div className="setting-label"><span>System Status</span><span className="setting-desc">All systems operational</span></div>
          <span style={{ color: '#34C759', fontWeight: 600 }}>Online</span>
        </div>
        <div className="setting-row">
          <div className="setting-label"><span>Theme</span><span className="setting-desc">Current appearance mode</span></div>
          <span style={{ color: 'var(--text-sub)', fontSize: 12, textTransform: 'capitalize' }}>{theme}</span>
        </div>
      </div>
    </>
  );
}

function PhotoBoothTab() {
  const [privateCapture, setPrivateCapture] = useState(false);
  const [subTab, setSubTab] = useState<'filters' | 'private' | 'settings'>('filters');

  useEffect(() => {
    const unsub = subscribeCaptureMode(setPrivateCapture);
    return unsub;
  }, []);

  const subTabs = [
    { id: 'filters' as const, label: 'Filter Manager', icon: Camera, color: '#AF52DE' },
    { id: 'private' as const, label: 'Private Captures', icon: Shield, color: '#FF2D55' },
    { id: 'settings' as const, label: 'Booth Settings', icon: Settings, color: '#8E8E93' },
  ];

  return (
    <>
      <div className="admin-content-title">Photo Booth</div>
      <div className="admin-sub-tabs">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <div
              key={tab.id}
              className={`admin-sub-tab ${subTab === tab.id ? 'active' : ''}`}
              onClick={() => setSubTab(tab.id)}
            >
              <Icon size={14} color={subTab === tab.id ? 'white' : tab.color} />
              {tab.label}
            </div>
          );
        })}
      </div>

      <div className="admin-sub-content">
        {subTab === 'filters' && <FilterManager />}
        {subTab === 'private' && <PrivateCaptureLibrary />}
        {subTab === 'settings' && (
          <SettingsSection title="Booth Settings">
            <div className="setting-row">
              <div className="setting-label"><span>Private Capture Mode</span><span className="setting-desc">When ON, captures made by Admin are saved permanently as Admin Private media. When OFF, captures remain temporary and public.</span></div>
              <label className="switch"><input type="checkbox" checked={privateCapture} onChange={(e) => setPrivateCaptureEnabled(e.target.checked)} /><span className="slider" /></label>
            </div>
            <div className="setting-row">
              <div className="setting-label"><span>Screen Flash Effect</span><span className="setting-desc">Flash screen white during countdown</span></div>
              <label className="switch"><input type="checkbox" defaultChecked /><span className="slider" /></label>
            </div>
            <div className="setting-row">
              <div className="setting-label"><span>Mirror Preview</span><span className="setting-desc">Flip camera horizontally</span></div>
              <label className="switch"><input type="checkbox" defaultChecked /><span className="slider" /></label>
            </div>
          </SettingsSection>
        )}
      </div>
    </>
  );
}

function FilterManager() {
  const [filters, setFilters] = useState<AdminFilter[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [editName, setEditName] = useState('');
  const [editCss, setEditCss] = useState('');
  const [editEngine, setEditEngine] = useState<string>('swirl');
  const [editParams, setEditParams] = useState<Record<string, number>>({});

  const [addType, setAddType] = useState<'css' | 'canvas'>('css');
  const [newName, setNewName] = useState('');
  const [newFilterId, setNewFilterId] = useState('');
  const [newCss, setNewCss] = useState('');
  const [newEngine, setNewEngine] = useState<string>('swirl');
  const [newParams, setNewParams] = useState<Record<string, number>>(
    getDefaultParams('swirl')
  );

  const [errorMsg, setErrorMsg] = useState('');
  const [importMode, setImportMode] = useState<'paste' | 'file'>('paste');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchFilters();
    const unsub = subscribeFilters(setFilters);
    return unsub;
  }, []);

  const handleNewEngineChange = (engineName: string) => {
    setNewEngine(engineName);
    setNewParams(getDefaultParams(engineName as EngineName));
  };

  const handleAdd = async () => {
    setErrorMsg('');
    if (!newName.trim() || !newFilterId.trim()) {
      setErrorMsg('Name and ID are required');
      return;
    }
    const id = newFilterId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');

    if (addType === 'css') {
      if (!newCss.trim()) {
        setErrorMsg('CSS value is required');
        return;
      }
      const result = await addCustomFilter(id, newName.trim(), newCss.trim());
      if (!result.success) {
        setErrorMsg(result.error || 'Failed to add filter');
        return;
      }
    } else {
      const result = await addCanvasFilter(id, newName.trim(), newEngine, newParams);
      if (!result.success) {
        setErrorMsg(result.error || 'Failed to add canvas filter');
        return;
      }
    }

    setNewName('');
    setNewFilterId('');
    setNewCss('');
    setNewEngine('swirl');
    setNewParams(getDefaultParams('swirl'));
    setShowAdd(false);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      const cssMatch = content.match(/\.filter-([\w-]+)\s*\{[^}]*filter:\s*([^;]+);/);
      if (cssMatch) {
        setNewFilterId(cssMatch[1]);
        setNewCss(cssMatch[2].trim());
        if (!newName) setNewName(cssMatch[1].replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
      } else {
        setErrorMsg('Could not find a .filter-xxx { filter: ... } rule in the HTML file');
      }
    };
    reader.readAsText(file);
  };

  const startEdit = (f: AdminFilter) => {
    setEditingId(f.id);
    setEditName(f.name);
    setEditCss(f.css);
    setEditEngine(f.engine ?? 'swirl');
    setEditParams(f.params ?? getDefaultParams((f.engine ?? 'swirl') as EngineName));
  };

  const saveEdit = async (f: AdminFilter) => {
    if (f.type === 'canvas') {
      await updateFilterFn(f.id, {
        name: editName,
        engine: editEngine,
        params: editParams,
      });
    } else {
      await updateFilterFn(f.id, { name: editName, css: editCss });
    }
    setEditingId(null);
  };

  const toggleEnabled = async (f: AdminFilter) => {
    await updateFilterFn(f.id, { enabled: !f.enabled });
  };

  const handleDelete = async (f: AdminFilter) => {
    if (f.is_builtin) return;
    if (!confirm(`Delete filter "${f.name}"?`)) return;
    await deleteFilter(f.id);
  };

  const currentEditEngine = getEngine(editEngine);

  return (
    <SettingsSection title="Filter Manager">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>
          {filters.length} filters — {filters.filter((f) => f.enabled).length} enabled
        </span>
        <button className="admin-add-btn" onClick={() => { setShowAdd(!showAdd); setErrorMsg(''); }}>
          <Plus size={14} /> Add Filter
        </button>
      </div>

      {showAdd && (
        <div className="admin-modal-inline">
          <div className="admin-modal-tabs">
            <button className={addType === 'css' ? 'active' : ''} onClick={() => setAddType('css')}>
              CSS Filter
            </button>
            <button className={addType === 'canvas' ? 'active' : ''} onClick={() => setAddType('canvas')}>
              Canvas Engine
            </button>
          </div>

          {errorMsg && <div className="admin-error">{errorMsg}</div>}

          <input
            className="admin-input"
            placeholder="Filter ID (e.g. swirl)"
            value={newFilterId}
            onChange={(e) => setNewFilterId(e.target.value)}
          />
          <input
            className="admin-input"
            placeholder="Display name (e.g. Swirl)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />

          {addType === 'css' && (
            <>
              {importMode === 'file' && (
                <div className="admin-upload-zone" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={20} color="#8E8E93" />
                  <span>Click to choose an HTML file with filter CSS</span>
                  <input ref={fileInputRef} type="file" accept=".html,.htm,.css" style={{ display: 'none' }} onChange={handleFileImport} />
                </div>
              )}
              <textarea
                className="admin-textarea"
                placeholder="CSS filter value (e.g. sepia(80%) contrast(120%))"
                value={newCss}
                onChange={(e) => setNewCss(e.target.value)}
                rows={3}
              />
              {newFilterId && newCss && (
                <div className="admin-filter-preview-row">
                  <span style={{ fontSize: 12, color: 'var(--text-sub)' }}>Preview:</span>
                  <div className="admin-filter-preview-box" style={{ filter: newCss }} />
                </div>
              )}
            </>
          )}

          {addType === 'canvas' && (
            <>
              <label style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 4 }}>Engine</label>
              <select
                className="admin-select"
                value={newEngine}
                onChange={(e) => handleNewEngineChange(e.target.value)}
              >
                {ENGINE_LIST.map((eng) => (
                  <option key={eng.name} value={eng.name}>
                    {eng.label} — {eng.description}
                  </option>
                ))}
              </select>

              {getEngine(newEngine)?.params.map((p) => (
                <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <span style={{ fontSize: 12, minWidth: 80, color: 'var(--text-sub)' }}>{p.label}</span>
                  <input
                    type="range"
                    min={p.min}
                    max={p.max}
                    step={p.step}
                    value={newParams[p.key] ?? p.default}
                    onChange={(e) =>
                      setNewParams({ ...newParams, [p.key]: parseFloat(e.target.value) })
                    }
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: 12, minWidth: 40, textAlign: 'right' }}>
                    {(newParams[p.key] ?? p.default).toFixed(2)}
                  </span>
                </div>
              ))}

              <div className="admin-filter-preview-row" style={{ marginTop: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-sub)' }}>Preview:</span>
                <CanvasFilterPreview engine={newEngine} params={newParams} size={80} />
              </div>
            </>
          )}

          <div className="admin-modal-actions">
            <button className="admin-btn-cancel" onClick={() => { setShowAdd(false); setErrorMsg(''); }}>
              Cancel
            </button>
            <button className="admin-btn-save" onClick={handleAdd}>Add Filter</button>
          </div>
        </div>
      )}

      <div className="admin-filter-grid">
        {filters.map((f) => (
          <div key={f.id} className={`admin-filter-card ${!f.enabled ? 'disabled' : ''}`}>
            <div className="admin-filter-preview-wrap">
              {f.type === 'canvas' ? (
                <CanvasFilterPreview engine={f.engine ?? 'swirl'} params={f.params} size={120} />
              ) : (
                <div
                  className={`admin-filter-preview filter-${f.filter_id}`}
                  style={{ filter: f.css === 'none' ? undefined : f.css }}
                />
              )}
              {f.is_builtin && <span className="admin-filter-badge">BUILT-IN</span>}
              {f.type === 'canvas' && <span className="admin-filter-badge" style={{ left: 'auto', right: 6, background: '#AF52DE' }}>CANVAS</span>}
              {!f.enabled && <span className="admin-filter-badge-off">OFF</span>}
            </div>

            {editingId === f.id ? (
              <div className="admin-filter-edit">
                <input className="admin-input" value={editName} onChange={(e) => setEditName(e.target.value)} />

                {f.type === 'canvas' ? (
                  <>
                    <select
                      className="admin-select"
                      value={editEngine}
                      onChange={(e) => {
                        setEditEngine(e.target.value);
                        setEditParams(getDefaultParams(e.target.value as EngineName));
                      }}
                    >
                      {ENGINE_LIST.map((eng) => (
                        <option key={eng.name} value={eng.name}>{eng.label}</option>
                      ))}
                    </select>
                    {currentEditEngine?.params.map((p) => (
                      <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <span style={{ fontSize: 11, minWidth: 60 }}>{p.label}</span>
                        <input
                          type="range"
                          min={p.min}
                          max={p.max}
                          step={p.step}
                          value={editParams[p.key] ?? p.default}
                          onChange={(e) =>
                            setEditParams({ ...editParams, [p.key]: parseFloat(e.target.value) })
                          }
                          style={{ flex: 1 }}
                        />
                        <span style={{ fontSize: 11, minWidth: 34, textAlign: 'right' }}>
                          {(editParams[p.key] ?? p.default).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </>
                ) : (
                  <input className="admin-input" value={editCss} onChange={(e) => setEditCss(e.target.value)} />
                )}

                <div className="admin-filter-edit-actions">
                  <button className="admin-btn-save" onClick={() => saveEdit(f)}>Save</button>
                  <button className="admin-btn-cancel" onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className="admin-filter-name">{f.name}</div>
                <div className="admin-filter-actions">
                  <label className="switch mini">
                    <input type="checkbox" checked={f.enabled} onChange={() => toggleEnabled(f)} />
                    <span className="slider" />
                  </label>
                  <button className="admin-icon-btn" onClick={() => startEdit(f)} title="Edit"><Edit2 size={13} /></button>
                  {!f.is_builtin && (
                    <button className="admin-icon-btn danger" onClick={() => handleDelete(f)} title="Delete"><Trash2 size={13} /></button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </SettingsSection>
  );
}

function CanvasFilterPreview({
  engine,
  params,
  size = 80,
}: {
  engine: string;
  params: Record<string, number>;
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const w = size;
    const h = size;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#FF6B6B');
    grad.addColorStop(0.5, '#FFD93D');
    grad.addColorStop(1, '#6BCB77');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    for (let i = 0; i < w; i += 8) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(w, i);
      ctx.stroke();
    }

    try {
      const result = applyEngine(canvas, engine, params);
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(result, 0, 0);
    } catch (err) {
      console.warn('Preview engine error:', err);
    }
  }, [engine, params, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{
        borderRadius: 6,
        border: '1px solid var(--card-border)',
        display: 'block',
      }}
    />
  );
}

function PrivateCaptureLibrary() {
  const [items, setItems] = useState<AdminPrivateMedia[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'video'>('all');
  const [sortMode, setSortMode] = useState<'newest' | 'oldest'>('newest');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [enabled, setEnabled] = useState(isPrivateCaptureEnabled());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(getSyncStatus());
  const [previewItem, setPreviewItem] = useState<AdminPrivateMedia | null>(null);

  useEffect(() => {
    const unsubCapture = subscribeCaptureMode(setEnabled);
    return unsubCapture;
  }, []);

  useEffect(() => {
    if (!enabled) {
      setItems([]);
      return;
    }
    fetchAdminMedia();
    const unsub = subscribeAdminMedia(setItems);
    return unsub;
  }, [enabled]);

  useEffect(() => {
    const unsub = subscribeSyncStatus(setSyncStatus);
    return unsub;
  }, []);

  let filtered = items.filter((m) => {
    if (typeFilter !== 'all' && m.type !== typeFilter) return false;
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  filtered = [...filtered].sort((a, b) => {
    const da = new Date(a.created_at).getTime();
    const db = new Date(b.created_at).getTime();
    return sortMode === 'newest' ? db - da : da - db;
  });

  const handleDelete = (id: string) => {
    if (!confirm('Delete this capture permanently?')) return;
    deleteAdminMedia(id);
  };

  const startRename = (id: string, currentName: string) => {
    setRenamingId(id);
    setRenameValue(currentName);
  };

  const saveRename = (id: string) => {
    if (renameValue.trim()) {
      renameAdminMedia(id, renameValue.trim());
    }
    setRenamingId(null);
  };

  const handleDownload = (item: AdminPrivateMedia) => {
    downloadAdminMediaOriginal(item);
  };

  const syncLabel: Record<SyncStatus, string> = {
    offline: 'Offline',
    syncing: 'Syncing...',
    connected: 'Connected',
    error: 'Sync Error',
  };
  const syncColor: Record<SyncStatus, string> = {
    offline: '#8E8E93',
    syncing: '#FF9500',
    connected: '#34C759',
    error: '#FF3B30',
  };

  if (!enabled) {
    return (
      <SettingsSection title="Admin Private Captures">
        <div className="admin-empty-state">
          <Shield size={32} color="#8E8E93" />
          <p>Private Capture is OFF. No private media is accessible.</p>
          <p style={{ fontSize: 11, marginTop: 8 }}>Enable Private Capture in Booth Settings to access private photos and videos.</p>
        </div>
      </SettingsSection>
    );
  }

  return (
    <SettingsSection title="Admin Private Captures">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: syncColor[syncStatus],
            background: `${syncColor[syncStatus]}15`,
            padding: '4px 10px',
            borderRadius: 12,
          }}
        >
          <span style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: syncColor[syncStatus],
            display: 'inline-block',
          }} />
          Sync: {syncLabel[syncStatus]}
        </span>
      </div>
      <div className="admin-library-toolbar">
        <div className="admin-search-box">
          <Search size={14} color="#8E8E93" />
          <input placeholder="Search captures..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="admin-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as 'all' | 'image' | 'video')}>
          <option value="all">All Types</option>
          <option value="image">Photos</option>
          <option value="video">Videos</option>
        </select>
        <select className="admin-select" value={sortMode} onChange={(e) => setSortMode(e.target.value as 'newest' | 'oldest')}>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="admin-empty-state">
          <Shield size={32} color="#8E8E93" />
          <p>No private captures yet. Enable Private Capture in Booth Settings and take photos/videos from Photo Booth.</p>
        </div>
      ) : (
        <div className="admin-library-grid">
          {filtered.map((item) => (
            <div key={item.id} className="admin-library-item">
              <div className="admin-library-preview">
                {item.type === 'image' ? (
                  <img src={item.url} alt={item.name} />
                ) : (
                  <video src={item.url} muted />
                )}
                <span className="admin-library-type">{item.type === 'image' ? 'PHOTO' : 'VIDEO'}</span>
              </div>
              <div className="admin-library-info">
                {renamingId === item.id ? (
                  <div className="admin-rename-row">
                    <input className="admin-input" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} autoFocus />
                    <button className="admin-icon-btn" onClick={() => saveRename(item.id)}>Save</button>
                    <button className="admin-icon-btn" onClick={() => setRenamingId(null)}>Cancel</button>
                  </div>
                ) : (
                  <>
                    <div className="admin-library-name" title={item.name}>{item.name}</div>
                    <div className="admin-library-date">{new Date(item.created_at).toLocaleString()}</div>
                  </>
                )}
                <div className="admin-library-actions">
                  <button className="admin-icon-btn" onClick={() => setPreviewItem(item)} title="Preview"><Eye size={13} /></button>
                  <button className="admin-icon-btn" onClick={() => handleDownload(item)} title="Download"><Download size={13} /></button>
                  <button className="admin-icon-btn" onClick={() => startRename(item.id, item.name)} title="Rename"><Edit2 size={13} /></button>
                  <button className="admin-icon-btn danger" onClick={() => handleDelete(item.id)} title="Delete"><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <MediaPreviewModal item={previewItem} onClose={() => setPreviewItem(null)} onDownload={handleDownload} />
    </SettingsSection>
  );
}

function PhotosTab() {
  const [subTab, setSubTab] = useState<'library' | 'display' | 'albums'>('library');

  const subTabs = [
    { id: 'library' as const, label: 'Photo Library', icon: Images, color: '#FF9500' },
    { id: 'display' as const, label: 'Display', icon: Eye, color: '#007AFF' },
    { id: 'albums' as const, label: 'Albums', icon: LayoutGrid, color: '#34C759' },
  ];

  return (
    <>
      <div className="admin-content-title">Photos</div>
      <div className="admin-sub-tabs">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <div
              key={tab.id}
              className={`admin-sub-tab ${subTab === tab.id ? 'active' : ''}`}
              onClick={() => setSubTab(tab.id)}
            >
              <Icon size={14} color={subTab === tab.id ? 'white' : tab.color} />
              {tab.label}
            </div>
          );
        })}
      </div>
      <div className="admin-sub-content">
        {subTab === 'library' && <PhotoLibrary />}
        {subTab === 'display' && <DisplaySection />}
        {subTab === 'albums' && <AlbumsSection />}
      </div>
    </>
  );
}

function PhotoLibrary() {
  const [photos, setPhotos] = useState<PublicPhoto[]>([]);
  const [albums, setAlbums] = useState<PublicAlbum[]>([]);
  const [search, setSearch] = useState('');
  const [albumFilter, setAlbumFilter] = useState<string>('all');
  const [sortMode, setSortMode] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPublicPhotos();
    fetchPublicAlbums();
    const unsub1 = subscribePhotos(setPhotos);
    const unsub2 = subscribeAlbums(setAlbums);
    return () => { unsub1(); unsub2(); };
  }, []);

  let filtered = photos.filter((p) => {
    if (albumFilter !== 'all' && p.album_id !== albumFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  filtered = [...filtered].sort((a, b) => {
    if (sortMode === 'name') return a.name.localeCompare(b.name);
    const da = new Date(a.created_at).getTime();
    const db = new Date(b.created_at).getTime();
    return sortMode === 'newest' ? db - da : da - db;
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    const albumId = albumFilter !== 'all' ? albumFilter : null;
    await uploadPhotos(files, albumId);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this photo permanently?')) return;
    await deletePhoto(id);
  };

  const startRename = (id: string, name: string) => {
    setRenamingId(id);
    setRenameValue(name);
  };

  const saveRename = async (id: string) => {
    if (renameValue.trim()) {
      await updatePhoto(id, { name: renameValue.trim() });
    }
    setRenamingId(null);
  };

  const toggleFeatured = async (p: PublicPhoto) => {
    await updatePhoto(p.id, { featured: !p.featured });
  };

  const handleAlbumChange = async (p: PublicPhoto, albumId: string) => {
    await updatePhoto(p.id, { album_id: albumId === 'none' ? null : albumId });
  };

  return (
    <SettingsSection title="Public Photo Library">
      <div className="admin-library-toolbar">
        <div className="admin-search-box">
          <Search size={14} color="#8E8E93" />
          <input placeholder="Search photos..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="admin-select" value={albumFilter} onChange={(e) => setAlbumFilter(e.target.value)}>
          <option value="all">All Albums</option>
          {albums.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <select className="admin-select" value={sortMode} onChange={(e) => setSortMode(e.target.value as 'newest' | 'oldest' | 'name')}>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="name">By Name</option>
        </select>
        <button className="admin-add-btn" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          <Upload size={14} /> {uploading ? 'Uploading...' : 'Upload Photos'}
        </button>
        <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp,image/*" multiple style={{ display: 'none' }} onChange={handleUpload} />
      </div>

      {filtered.length === 0 ? (
        <div className="admin-empty-state">
          <Images size={32} color="#8E8E93" />
          <p>No public photos yet. Upload JPG, JPEG, PNG, or WEBP images to populate the library.</p>
        </div>
      ) : (
        <div className="admin-photo-grid">
          {filtered.map((p) => (
            <div key={p.id} className="admin-photo-card">
              <div className="admin-photo-img-wrap">
                <img src={p.url} alt={p.name} className="admin-photo-img" />
                {p.featured && <span className="admin-photo-featured"><Star size={10} fill="white" /> Featured</span>}
                {p.display_enabled && <span className="admin-photo-display-badge">DISPLAY</span>}
              </div>
              <div className="admin-photo-info">
                {renamingId === p.id ? (
                  <div className="admin-rename-row">
                    <input className="admin-input" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} autoFocus />
                    <button className="admin-icon-btn" onClick={() => saveRename(p.id)}>Save</button>
                    <button className="admin-icon-btn" onClick={() => setRenamingId(null)}>X</button>
                  </div>
                ) : (
                  <div className="admin-photo-name" title={p.name}>{p.name}</div>
                )}
                <div className="admin-photo-meta">
                  <span>{p.file_type.toUpperCase()}</span>
                  <span>{new Date(p.created_at).toLocaleDateString()}</span>
                </div>
                <div className="admin-photo-actions">
                  <button className={`admin-icon-btn ${p.featured ? 'active' : ''}`} onClick={() => toggleFeatured(p)} title="Toggle Featured"><Star size={13} fill={p.featured ? '#FF9500' : 'none'} color={p.featured ? '#FF9500' : '#8E8E93'} /></button>
                  <button className="admin-icon-btn" onClick={() => startRename(p.id, p.name)} title="Rename"><Edit2 size={13} /></button>
                  <button className="admin-icon-btn danger" onClick={() => handleDelete(p.id)} title="Delete"><Trash2 size={13} /></button>
                  <select className="admin-select-mini" value={p.album_id || 'none'} onChange={(e) => handleAlbumChange(p, e.target.value)} title="Assign album">
                    <option value="none">No Album</option>
                    {albums.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </SettingsSection>
  );
}

function DisplaySection() {
  const [photos, setPhotos] = useState<PublicPhoto[]>([]);

  useEffect(() => {
    fetchPublicPhotos();
    const unsub = subscribePhotos(setPhotos);
    return unsub;
  }, []);

  const displayPhotos = photos.filter((p) => p.display_enabled).sort((a, b) => a.display_order - b.display_order);
  const availablePhotos = photos.filter((p) => !p.display_enabled);

  const toggleDisplay = async (p: PublicPhoto) => {
    const newOrder = p.display_enabled ? 999 : (displayPhotos.length);
    await updatePhoto(p.id, { display_enabled: !p.display_enabled, display_order: newOrder });
  };

  const moveOrder = async (p: PublicPhoto, direction: 'up' | 'down') => {
    const sorted = [...displayPhotos];
    const idx = sorted.findIndex((x) => x.id === p.id);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const other = sorted[swapIdx];
    await updatePhoto(p.id, { display_order: other.display_order });
    await updatePhoto(other.id, { display_order: p.display_order });
  };

  return (
    <SettingsSection title="Display — Featured Public Photos">
      <div style={{ fontSize: 13, color: 'var(--text-sub)', marginBottom: 16 }}>
        Choose which public photos appear in the Display. Only public/managed photos can be shown — never Admin Private Captures.
      </div>

      <div className="admin-section-subtitle" style={{ marginBottom: 8 }}>Currently in Display ({displayPhotos.length})</div>
      {displayPhotos.length === 0 ? (
        <div className="admin-empty-state" style={{ minHeight: 80 }}>
          <p>No photos in Display yet. Add some from the available photos below.</p>
        </div>
      ) : (
        <div className="admin-display-list">
          {displayPhotos.map((p, idx) => (
            <div key={p.id} className="admin-display-item">
              <span className="admin-display-order">{idx + 1}</span>
              <img src={p.url} alt={p.name} className="admin-display-thumb" />
              <span className="admin-display-name">{p.name}</span>
              <div className="admin-display-actions">
                <button className="admin-icon-btn" onClick={() => moveOrder(p, 'up')} disabled={idx === 0} title="Move Up">↑</button>
                <button className="admin-icon-btn" onClick={() => moveOrder(p, 'down')} disabled={idx === displayPhotos.length - 1} title="Move Down">↓</button>
                <button className="admin-icon-btn danger" onClick={() => toggleDisplay(p)} title="Remove from Display"><X size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="admin-section-subtitle" style={{ marginTop: 20, marginBottom: 8 }}>Available Photos ({availablePhotos.length})</div>
      {availablePhotos.length === 0 ? (
        <div className="admin-empty-state" style={{ minHeight: 60 }}>
          <p>All photos are already in Display, or no photos exist yet.</p>
        </div>
      ) : (
        <div className="admin-photo-grid">
          {availablePhotos.map((p) => (
            <div key={p.id} className="admin-photo-card">
              <div className="admin-photo-img-wrap">
                <img src={p.url} alt={p.name} className="admin-photo-img" />
              </div>
              <div className="admin-photo-info">
                <div className="admin-photo-name" title={p.name}>{p.name}</div>
                <div className="admin-photo-actions">
                  <button className="admin-add-btn small" onClick={() => toggleDisplay(p)}>
                    <Plus size={12} /> Add to Display
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </SettingsSection>
  );
}

function AlbumsSection() {
  const [albums, setAlbums] = useState<PublicAlbum[]>([]);
  const [photos, setPhotos] = useState<PublicPhoto[]>([]);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    fetchPublicAlbums();
    fetchPublicPhotos();
    const unsub1 = subscribeAlbums(setAlbums);
    const unsub2 = subscribePhotos(setPhotos);
    return () => { unsub1(); unsub2(); };
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createAlbum(newName.trim());
    setNewName('');
  };

  const handleDelete = async (id: string) => {
    const count = photos.filter((p) => p.album_id === id).length;
    if (!confirm(`Delete this album? ${count} photo(s) will be moved to "No Album".`)) return;
    await deleteAlbum(id);
  };

  return (
    <SettingsSection title="Albums">
      <div className="admin-album-create">
        <input className="admin-input" placeholder="New album name..." value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }} />
        <button className="admin-add-btn" onClick={handleCreate}><Plus size={14} /> Create Album</button>
      </div>

      {albums.length === 0 ? (
        <div className="admin-empty-state">
          <LayoutGrid size={32} color="#8E8E93" />
          <p>No albums yet. Create one to organize your public photos.</p>
        </div>
      ) : (
        <div className="admin-album-list">
          {albums.map((a) => {
            const count = photos.filter((p) => p.album_id === a.id).length;
            return (
              <div key={a.id} className="admin-album-item">
                <LayoutGrid size={20} color="#34C759" />
                <div className="admin-album-info">
                  <div className="admin-album-name">{a.name}</div>
                  <div className="admin-album-count">{count} photo(s)</div>
                </div>
                <button className="admin-icon-btn danger" onClick={() => handleDelete(a.id)} title="Delete Album"><Trash2 size={14} /></button>
              </div>
            );
          })}
        </div>
      )}
    </SettingsSection>
  );
}

interface MediaItem {
  id: string;
  name: string;
  type: 'image' | 'video' | 'wallpaper' | 'filter' | 'other';
  source: 'system' | 'public' | 'admin_private';
  url: string;
  permanent: boolean;
  created_at: string;
}

function MediaTab() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [sortMode, setSortMode] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [category, setCategory] = useState<string>('all');
  const [adminMedia, setAdminMedia] = useState<import('@/adminStore').AdminPrivateMedia[]>([]);
  const [publicPhotos, setPublicPhotos] = useState<PublicPhoto[]>([]);
  const [tempMedia, setTempMedia] = useState<SharedMediaItem[]>([]);
  const [customWps, setCustomWps] = useState<CustomWallpaper[]>([]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAdminMedia();
    fetchPublicPhotos();
    const unsubAdmin = subscribeAdminMedia(setAdminMedia);
    const unsubPhotos = subscribePhotos(setPublicPhotos);
    const unsubTemp = subscribeMedia(setTempMedia);
    const unsubSettings = subscribeSettings(() => {});
    (async () => {
      const { data } = await supabase.from('wallpapers').select('id, url, name').order('created_at', { ascending: false });
      if (data) setCustomWps(data as CustomWallpaper[]);
    })();
    return () => { unsubAdmin(); unsubPhotos(); unsubTemp(); unsubSettings(); };
  }, []);

  useEffect(() => {
    const all: MediaItem[] = [];
    for (const m of tempMedia) {
      all.push({
        id: `temp-${m.name}`,
        name: m.name,
        type: m.type === 'image' ? 'image' : 'video',
        source: 'public',
        url: m.url,
        permanent: false,
        created_at: new Date().toISOString(),
      });
    }
    for (const m of adminMedia) {
      all.push({
        id: `admin-${m.id}`,
        name: m.name,
        type: m.type === 'image' ? 'image' : 'video',
        source: 'admin_private',
        url: m.url,
        permanent: true,
        created_at: m.created_at,
      });
    }
    for (const p of publicPhotos) {
      all.push({
        id: `photo-${p.id}`,
        name: p.name,
        type: 'image',
        source: 'public',
        url: p.url,
        permanent: true,
        created_at: p.created_at,
      });
    }
    for (const w of customWps) {
      all.push({
        id: `wp-${w.id}`,
        name: w.name,
        type: 'wallpaper',
        source: 'system',
        url: w.url,
        permanent: true,
        created_at: new Date().toISOString(),
      });
    }
    builtInWallpapers.forEach((w) => {
      all.push({
        id: `builtin-wp-${w.id}`,
        name: w.name,
        type: 'wallpaper',
        source: 'system',
        url: '',
        permanent: true,
        created_at: new Date().toISOString(),
      });
    });
    setItems(all);
  }, [tempMedia, adminMedia, publicPhotos, customWps]);

  let filtered = items.filter((m) => {
    if (category !== 'all') {
      if (category === 'photos' && m.type !== 'image') return false;
      if (category === 'videos' && m.type !== 'video') return false;
      if (category === 'wallpapers' && m.type !== 'wallpaper') return false;
      if (category === 'filter' && m.type !== 'filter') return false;
      if (category === 'other' && m.type !== 'other') return false;
    }
    if (typeFilter !== 'all' && m.type !== typeFilter) return false;
    if (sourceFilter !== 'all' && m.source !== sourceFilter) return false;
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  filtered = [...filtered].sort((a, b) => {
    if (sortMode === 'name') return a.name.localeCompare(b.name);
    const da = new Date(a.created_at).getTime();
    const db = new Date(b.created_at).getTime();
    return sortMode === 'newest' ? db - da : da - db;
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    setUploadError('');
    for (const file of files) {
      const result = await uploadAdminMediaFile(file);
      if (!result.success) {
        setUploadError(result.error || 'Upload failed');
      }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = (item: MediaItem) => {
    setConfirmDeleteId(item.id);
  };

  const confirmDelete = () => {
    if (!confirmDeleteId) return;
    if (confirmDeleteId.startsWith('admin-')) {
      deleteAdminMedia(confirmDeleteId.slice(6));
    } else if (confirmDeleteId.startsWith('photo-')) {
      deletePhoto(confirmDeleteId.slice(6));
    } else if (confirmDeleteId.startsWith('wp-')) {
      deleteWallpaper(confirmDeleteId.slice(3));
    }
    setConfirmDeleteId(null);
  };

  const startRename = (item: MediaItem) => {
    if (item.source === 'admin_private' && item.id.startsWith('admin-')) {
      setRenamingId(item.id);
      setRenameValue(item.name);
    }
  };

  const saveRename = (item: MediaItem) => {
    if (renameValue.trim() && item.id.startsWith('admin-')) {
      renameAdminMedia(item.id.slice(6), renameValue.trim());
    }
    setRenamingId(null);
  };

  const handleMediaDownload = (item: MediaItem) => {
    if (item.source === 'admin_private' && item.id.startsWith('admin-')) {
      const adminItem = adminMedia.find((m) => m.id === item.id.slice(6));
      if (adminItem) {
        downloadAdminMediaOriginal(adminItem);
        return;
      }
    }
    downloadPublicMediaOriginal(item.url, item.name);
  };

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'photos', label: 'Photos' },
    { id: 'videos', label: 'Videos' },
    { id: 'wallpapers', label: 'Wallpapers' },
    { id: 'filter', label: 'Filter Assets' },
    { id: 'other', label: 'Other' },
  ];

  return (
    <>
      <div className="admin-content-title">Media Manager</div>
      <div className="admin-sub-tabs">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className={`admin-sub-tab ${category === cat.id ? 'active' : ''}`}
            onClick={() => setCategory(cat.id)}
          >
            {cat.label}
          </div>
        ))}
      </div>
      <div className="admin-sub-content">
        <SettingsSection title={`Media Library (${filtered.length})`}>
          <div className="admin-library-toolbar">
            <div className="admin-search-box">
              <Search size={14} color="#8E8E93" />
              <input placeholder="Search media..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="admin-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">All Types</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="wallpaper">Wallpaper</option>
            </select>
            <select className="admin-select" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
              <option value="all">All Sources</option>
              <option value="system">System</option>
              <option value="public">Public</option>
              <option value="admin_private">Admin Private</option>
            </select>
            <select className="admin-select" value={sortMode} onChange={(e) => setSortMode(e.target.value as 'newest' | 'oldest' | 'name')}>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">By Name</option>
            </select>
            <button className="admin-add-btn" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Upload size={14} /> {uploading ? 'Uploading...' : 'Upload Media'}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple style={{ display: 'none' }} onChange={handleUpload} />
          </div>
          {uploadError && <div className="admin-error">{uploadError}</div>}

          {filtered.length === 0 ? (
            <div className="admin-empty-state">
              <Film size={32} color="#8E8E93" />
              <p>No media found matching your filters.</p>
            </div>
          ) : (
            <div className="admin-media-table">
              <div className="admin-media-table-header">
                <span>Preview</span>
                <span>Name</span>
                <span>Type</span>
                <span>Source</span>
                <span>Status</span>
                <span>Date</span>
                <span>Actions</span>
              </div>
              {filtered.map((item) => (
                <div key={item.id} className="admin-media-table-row">
                  <div className="admin-media-preview-cell">
                    {item.url ? (
                      item.type === 'video' ? (
                        <video src={item.url} muted className="admin-media-thumb" />
                      ) : (
                        <img src={item.url} alt={item.name} className="admin-media-thumb" />
                      )
                    ) : (
                      <div className="admin-media-thumb admin-media-thumb-placeholder" style={{ background: builtInWallpapers.find((w) => `builtin-wp-${w.id}` === item.id)?.gradient }} />
                    )}
                  </div>
                  <div className="admin-media-name-cell">
                    {renamingId === item.id ? (
                      <div className="admin-rename-row">
                        <input className="admin-input" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} autoFocus />
                        <button className="admin-icon-btn" onClick={() => saveRename(item)}>Save</button>
                        <button className="admin-icon-btn" onClick={() => setRenamingId(null)}>X</button>
                      </div>
                    ) : (
                      <span title={item.name}>{item.name}</span>
                    )}
                  </div>
                  <div className="admin-media-type-cell">
                    <span className={`admin-media-type-badge type-${item.type}`}>{item.type}</span>
                  </div>
                  <div className="admin-media-source-cell">
                    <span className={`admin-media-source-badge source-${item.source}`}>{item.source.replace('_', ' ')}</span>
                  </div>
                  <div className="admin-media-status-cell">
                    <span className={`admin-media-status-badge ${item.permanent ? 'permanent' : 'temporary'}`}>
                      {item.permanent ? 'Permanent' : 'Temporary'}
                    </span>
                  </div>
                  <div className="admin-media-date-cell">{new Date(item.created_at).toLocaleDateString()}</div>
                  <div className="admin-media-actions-cell">
                    {item.url && <button className="admin-icon-btn" onClick={() => setPreviewItem(item)} title="Preview"><Eye size={13} /></button>}
                    {item.url && <button className="admin-icon-btn" onClick={() => handleMediaDownload(item)} title="Download"><Download size={13} /></button>}
                    {item.source === 'admin_private' && (
                      <button className="admin-icon-btn" onClick={() => startRename(item)} title="Rename"><Edit2 size={13} /></button>
                    )}
                    {(item.source === 'admin_private' || item.source === 'public' || item.id.startsWith('wp-')) && (
                      confirmDeleteId === item.id ? (
                        <div className="admin-inline-confirm">
                          <button className="admin-icon-btn danger" onClick={confirmDelete} title="Confirm"><Trash2 size={13} /></button>
                          <button className="admin-icon-btn" onClick={() => setConfirmDeleteId(null)} title="Cancel"><X size={13} /></button>
                        </div>
                      ) : (
                        <button className="admin-icon-btn danger" onClick={() => handleDelete(item)} title="Delete"><Trash2 size={13} /></button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SettingsSection>
      </div>
      <MediaItemPreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />
    </>
  );
}

function SettingsTab({
  subTab,
  onSubTabChange,
  customWallpapers,
  activeWallpaper,
  onAddWallpaper,
  onWallpaperChange,
  theme,
  onThemeChange,
}: {
  subTab: string;
  onSubTabChange: (id: string) => void;
  customWallpapers: CustomWallpaper[];
  activeWallpaper: string;
  onAddWallpaper: (wp: CustomWallpaper) => void;
  onWallpaperChange: (wp: string) => void;
  theme: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
}) {
  return (
    <>
      <div className="admin-content-title">Settings</div>
      <div className="admin-sub-tabs">
        {SETTINGS_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <div
              key={tab.id}
              className={`admin-sub-tab ${subTab === tab.id ? 'active' : ''}`}
              onClick={() => onSubTabChange(tab.id)}
            >
              <Icon size={14} color={subTab === tab.id ? 'white' : tab.color} />
              {tab.label}
            </div>
          );
        })}
      </div>

      <div className="admin-sub-content">
        {subTab === 'wallpaper' && (
          <WallpaperManagement
            customWallpapers={customWallpapers}
            activeWallpaper={activeWallpaper}
            onAddWallpaper={onAddWallpaper}
            onWallpaperChange={onWallpaperChange}
          />
        )}
        {subTab === 'dock-icons' && <DockIconManagement />}
        {subTab === 'app-icons' && <AppIconManagement />}
        {subTab === 'menu-bar' && <MenuBarManagement />}
        {subTab === 'dock' && <DockSettingsManagement />}
        {subTab === 'appearance' && <AppearanceManagement theme={theme} onThemeChange={onThemeChange} />}
        {subTab === 'branding' && <BrandingManagement />}
        {subTab === 'reset' && <ResetManagement onWallpaperChange={onWallpaperChange} />}
      </div>
    </>
  );
}

function WallpaperManagement({
  customWallpapers,
  activeWallpaper,
  onAddWallpaper,
  onWallpaperChange,
}: {
  customWallpapers: CustomWallpaper[];
  activeWallpaper: string;
  onAddWallpaper: (wp: CustomWallpaper) => void;
  onWallpaperChange: (wp: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const result = await uploadWallpaper(file);
    if (result) {
      onAddWallpaper(result);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this custom wallpaper?')) return;
    await deleteWallpaper(id);
    if (activeWallpaper === `custom:${id}`) onWallpaperChange('default');
  };

  const startRename = (id: string, name: string) => {
    setRenamingId(id);
    setRenameValue(name);
  };

  const saveRename = async (id: string) => {
    if (renameValue.trim()) {
      await renameWallpaper(id, renameValue.trim());
    }
    setRenamingId(null);
  };

  return (
    <SettingsSection title="Wallpaper Management">
      <div style={{ fontSize: 13, color: 'var(--text-sub)', marginBottom: 12 }}>
        Active: <strong>{activeWallpaper === 'default' ? 'Tahoe Default' : activeWallpaper.startsWith('custom:') ? customWallpapers.find((w) => w.id === activeWallpaper.slice(6))?.name || 'Custom' : builtInWallpapers.find((w) => w.id === activeWallpaper)?.name || 'Default'}</strong>
      </div>

      <div className="admin-section-subtitle" style={{ marginBottom: 8 }}>Built-in Wallpapers</div>
      <div className="admin-wallpaper-grid">
        {builtInWallpapers.map((wp) => (
          <div
            key={wp.id}
            className={`admin-wp-card ${activeWallpaper === wp.id ? 'active' : ''}`}
            onClick={() => onWallpaperChange(wp.id)}
          >
            <div className="admin-wp-thumb" style={{ background: wp.gradient }} />
            <div className="admin-wp-name">{wp.name}</div>
          </div>
        ))}
      </div>

      <div className="admin-section-subtitle" style={{ marginTop: 16, marginBottom: 8 }}>Custom Wallpapers ({customWallpapers.length})</div>
      <div className="admin-wallpaper-grid">
        {customWallpapers.map((wp) => (
          <div
            key={wp.id}
            className={`admin-wp-card ${activeWallpaper === `custom:${wp.id}` ? 'active' : ''}`}
          >
            <div className="admin-wp-thumb" style={{ backgroundImage: `url('${wp.url}')`, backgroundSize: 'cover', backgroundPosition: 'center' }} onClick={() => onWallpaperChange(`custom:${wp.id}`)} />
            <div className="admin-wp-info">
              {renamingId === wp.id ? (
                <div className="admin-rename-row">
                  <input className="admin-input" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} autoFocus />
                  <button className="admin-icon-btn" onClick={() => saveRename(wp.id)}>Save</button>
                  <button className="admin-icon-btn" onClick={() => setRenamingId(null)}>X</button>
                </div>
              ) : (
                <>
                  <div className="admin-wp-name" title={wp.name}>{wp.name}</div>
                  <div className="admin-wp-actions">
                    <button className="admin-icon-btn" onClick={() => onWallpaperChange(`custom:${wp.id}`)} title="Apply"><Eye size={12} /></button>
                    <button className="admin-icon-btn" onClick={() => startRename(wp.id, wp.name)} title="Rename"><Edit2 size={12} /></button>
                    <button className="admin-icon-btn danger" onClick={() => handleDelete(wp.id)} title="Delete"><Trash2 size={12} /></button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
        <div className="admin-wp-upload" onClick={() => fileInputRef.current?.click()}>
          <Upload size={24} color="#8E8E93" />
          <span>{uploading ? 'Uploading...' : 'Upload'}</span>
        </div>
        <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp,image/*" style={{ display: 'none' }} onChange={handleUpload} />
      </div>

      <div className="admin-section-subtitle" style={{ marginTop: 16, marginBottom: 8 }}>Reset</div>
      <div className="setting-row">
        <div className="setting-label"><span>Reset to Default Wallpaper</span><span className="setting-desc">Switch back to Tahoe Default</span></div>
        <button className="admin-btn-cancel" onClick={() => onWallpaperChange('default')}>Reset</button>
      </div>
    </SettingsSection>
  );
}

const DOCK_APPS = [
  { id: 'finderWindow', label: 'Finder' },
  { id: 'settingsWindow', label: 'Settings' },
  { id: 'photosWindow', label: 'Photos' },
  { id: 'photoboothWindow', label: 'Photo Booth' },
];

function DockIconManagement() {
  const [customIcons, setCustomIcons] = useState(getCustomDockIcons());
  useEffect(() => {
    const unsub = subscribeSettings(() => setCustomIcons(getCustomDockIcons()));
    return unsub;
  }, []);

  return (
    <SettingsSection title="Dock Icon Management">
      <div style={{ fontSize: 13, color: 'var(--text-sub)', marginBottom: 12 }}>
        Customize dock icons independently from app icons. Changes apply to the dock at the bottom of the screen.
      </div>
      <div className="admin-icon-grid">
        {DOCK_APPS.map((app) => (
          <IconCard
            key={app.id}
            appId={app.id}
            label={app.label}
            customUrl={customIcons[app.id]}
            isDock={true}
          />
        ))}
      </div>
    </SettingsSection>
  );
}

function AppIconManagement() {
  const [customIcons, setCustomIcons] = useState(getCustomAppIcons());
  useEffect(() => {
    const unsub = subscribeSettings(() => setCustomIcons(getCustomAppIcons()));
    return unsub;
  }, []);

  const apps = [
    ...DOCK_APPS,
    { id: 'adminLoginWindow', label: 'Admin' },
    { id: 'adminDashboardWindow', label: 'Admin Dashboard' },
  ];

  return (
    <SettingsSection title="App Icon Management">
      <div style={{ fontSize: 13, color: 'var(--text-sub)', marginBottom: 12 }}>
        Manage application icons independently from dock icons. These affect window title bars and app representations.
      </div>
      <div className="admin-icon-grid">
        {apps.map((app) => (
          <IconCard
            key={app.id}
            appId={app.id}
            label={app.label}
            customUrl={customIcons[app.id]}
            isDock={false}
          />
        ))}
      </div>
    </SettingsSection>
  );
}

function IconCard({ appId, label, customUrl, isDock }: { appId: string; label: string; customUrl: string | null; isDock: boolean }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    await uploadIcon(appId, file, isDock);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReset = async () => {
    await resetIcon(appId, isDock);
  };

  return (
    <div className="admin-icon-card">
      <div className="admin-icon-preview">
        {customUrl ? (
          <img src={customUrl} alt={label} className="admin-icon-img" />
        ) : (
          <div className="admin-icon-default">Default</div>
        )}
      </div>
      <div className="admin-icon-label">{label}</div>
      <div className="admin-icon-actions">
        <button className="admin-add-btn small" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          <Upload size={11} /> {uploading ? '...' : 'Change'}
        </button>
        {customUrl && (
          <button className="admin-btn-cancel" onClick={handleReset}>Reset</button>
        )}
        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" style={{ display: 'none' }} onChange={handleUpload} />
      </div>
    </div>
  );
}

function MenuBarManagement() {
  const [external, setExternal] = useState<MenuBarSettings>(getMenuBarSettings());
  useEffect(() => {
    const unsub = subscribeSettings(() => setExternal(getMenuBarSettings()));
    return unsub;
  }, []);

  const persist = useCallback(async (data: MenuBarSettings) => {
    await updateMenuBarSettings(data);
  }, []);
  const { draft, isDirty, isSaving, error, setDraft, save, discard } = useDraftState('menu-bar', external, persist);

  const handleToggle = (key: keyof MenuBarSettings) => {
    setDraft({ [key]: !draft[key] } as Partial<MenuBarSettings>);
  };

  const handleReset = () => {
    setDraft(DEFAULT_MENU_BAR_SETTINGS);
  };

  return (
    <SettingsSection title="Menu Bar">
      <div className="setting-row">
        <div className="setting-label"><span>Show Battery Icon</span><span className="setting-desc">Display battery in the menu bar</span></div>
        <label className="switch"><input type="checkbox" checked={draft.showBattery} onChange={() => handleToggle('showBattery')} /><span className="slider" /></label>
      </div>
      <div className="setting-row">
        <div className="setting-label"><span>Show Wi-Fi Icon</span><span className="setting-desc">Display Wi-Fi status</span></div>
        <label className="switch"><input type="checkbox" checked={draft.showWifi} onChange={() => handleToggle('showWifi')} /><span className="slider" /></label>
      </div>
      <div className="setting-row">
        <div className="setting-label"><span>Show Bluetooth Icon</span><span className="setting-desc">Display Bluetooth status</span></div>
        <label className="switch"><input type="checkbox" checked={draft.showBluetooth} onChange={() => handleToggle('showBluetooth')} /><span className="slider" /></label>
      </div>
      <div className="setting-row">
        <div className="setting-label"><span>Show Clock</span><span className="setting-desc">Display date and time</span></div>
        <label className="switch"><input type="checkbox" checked={draft.showClock} onChange={() => handleToggle('showClock')} /><span className="slider" /></label>
      </div>
      <div className="setting-row">
        <div className="setting-label"><span>Reset Menu Bar</span><span className="setting-desc">Restore all defaults</span></div>
        <button className="admin-btn-cancel" onClick={handleReset}>Reset</button>
      </div>
      <SectionActionBar isDirty={isDirty} isSaving={isSaving} error={error} onSave={save} onDiscard={discard} />
    </SettingsSection>
  );
}

function DockSettingsManagement() {
  const [external, setExternal] = useState<DockSettings>(getDockSettings());
  useEffect(() => {
    const unsub = subscribeSettings(() => setExternal(getDockSettings()));
    return unsub;
  }, []);

  const persist = useCallback(async (data: DockSettings) => {
    await updateDockSettings(data);
  }, []);
  const { draft, isDirty, isSaving, error, setDraft, save, discard } = useDraftState('dock', external, persist);

  const handleUpdate = (updates: Partial<DockSettings>) => {
    setDraft(updates);
  };

  const handleReset = () => {
    setDraft(DEFAULT_DOCK_SETTINGS);
  };

  return (
    <SettingsSection title="Dock Settings">
      <div className="setting-row">
        <div className="setting-label"><span>Icon Size</span><span className="setting-desc">Size of dock icons in pixels</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="range" min="32" max="64" value={draft.size} onChange={(e) => handleUpdate({ size: Number(e.target.value) })} style={{ width: 140 }} />
          <span style={{ fontSize: 12, color: 'var(--text-sub)', minWidth: 30 }}>{draft.size}px</span>
        </div>
      </div>
      <div className="setting-row">
        <div className="setting-label"><span>Magnification</span><span className="setting-desc">Enlarge icons on hover</span></div>
        <label className="switch"><input type="checkbox" checked={draft.magnification} onChange={(e) => handleUpdate({ magnification: e.target.checked })} /><span className="slider" /></label>
      </div>
      <div className="setting-row">
        <div className="setting-label"><span>Position</span><span className="setting-desc">Dock placement on screen</span></div>
        <select className="admin-select" value={draft.position} onChange={(e) => handleUpdate({ position: e.target.value as DockSettings['position'] })}>
          <option value="bottom">Bottom</option>
          <option value="left">Left</option>
          <option value="right">Right</option>
        </select>
      </div>
      <div className="setting-row">
        <div className="setting-label"><span>Auto-Hide</span><span className="setting-desc">Hide dock when windows are fullscreen</span></div>
        <label className="switch"><input type="checkbox" checked={draft.autoHide} onChange={(e) => handleUpdate({ autoHide: e.target.checked })} /><span className="slider" /></label>
      </div>
      <div className="setting-row">
        <div className="setting-label"><span>Icon Spacing</span><span className="setting-desc">Gap between dock icons</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="range" min="4" max="20" value={draft.iconSpacing} onChange={(e) => handleUpdate({ iconSpacing: Number(e.target.value) })} style={{ width: 140 }} />
          <span style={{ fontSize: 12, color: 'var(--text-sub)', minWidth: 30 }}>{draft.iconSpacing}px</span>
        </div>
      </div>
      <div className="setting-row">
        <div className="setting-label"><span>Reset Dock Settings</span><span className="setting-desc">Restore all dock defaults</span></div>
        <button className="admin-btn-cancel" onClick={handleReset}>Reset</button>
      </div>
      <SectionActionBar isDirty={isDirty} isSaving={isSaving} error={error} onSave={save} onDiscard={discard} />
    </SettingsSection>
  );
}

function AppearanceManagement({ theme, onThemeChange }: { theme: ThemeMode; onThemeChange: (mode: ThemeMode) => void }) {
  return (
    <SettingsSection title="Appearance">
      <div className="setting-label" style={{ marginBottom: 10 }}>
        <span style={{ fontWeight: 600 }}>Theme Mode</span>
        <span className="setting-desc">Select system appearance (Default: Light)</span>
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
          <span style={{ fontSize: 12 }}>System</span>
        </div>
      </div>
      <div className="setting-row" style={{ marginTop: 16 }}>
        <div className="setting-label"><span>Accent Color</span><span className="setting-desc">Highlight color for controls</span></div>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#007AFF', border: '2px solid var(--text-main)', cursor: 'pointer' }} />
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#AF52DE', cursor: 'pointer' }} />
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#FF3B30', cursor: 'pointer' }} />
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#34C759', cursor: 'pointer' }} />
        </div>
      </div>
      <div className="setting-row">
        <div className="setting-label"><span>Glass Transparency</span><span className="setting-desc">Frosted backdrop filter intensity</span></div>
        <input type="range" min="0" max="100" defaultValue="80" style={{ width: 140 }} />
      </div>
    </SettingsSection>
  );
}

function BrandingManagement() {
  const [assets, setAssets] = useState<BrandingAssets>(getBrandingAssets());
  useEffect(() => {
    const unsub = subscribeSettings(() => setAssets(getBrandingAssets()));
    return unsub;
  }, []);

  const handleUpload = async (type: keyof BrandingAssets, file: File) => {
    await uploadBrandingAsset(type, file);
  };

  const handleReset = async (type: keyof BrandingAssets) => {
    await resetBrandingAsset(type);
  };

  const items: { key: keyof BrandingAssets; label: string; desc: string }[] = [
    { key: 'logoUrl', label: 'Logo', desc: 'System logo asset' },
    { key: 'faviconUrl', label: 'Favicon', desc: 'Browser tab icon' },
    { key: 'startupUrl', label: 'Startup/Loading', desc: 'Boot screen or loading asset' },
  ];

  return (
    <SettingsSection title="Branding / System Assets">
      <div style={{ fontSize: 13, color: 'var(--text-sub)', marginBottom: 12 }}>
        Upload and manage branding assets. These persist across sessions.
      </div>
      {items.map((item) => (
        <BrandingCard key={item.key} itemKey={item.key} label={item.label} desc={item.desc} url={assets[item.key]} onUpload={handleUpload} onReset={handleReset} />
      ))}
      <div className="setting-row" style={{ marginTop: 12 }}>
        <div className="setting-label"><span>System Name</span><span className="setting-desc">Display name for the desktop environment</span></div>
        <span style={{ color: 'var(--text-sub)', fontSize: 12 }}>Tahoe Desktop</span>
      </div>
    </SettingsSection>
  );
}

function BrandingCard({
  itemKey,
  label,
  desc,
  url,
  onUpload,
  onReset,
}: {
  itemKey: keyof BrandingAssets;
  label: string;
  desc: string;
  url: string | null;
  onUpload: (type: keyof BrandingAssets, file: File) => void;
  onReset: (type: keyof BrandingAssets) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="admin-branding-card">
      <div className="admin-branding-preview">
        {url ? (
          <img src={url} alt={label} className="admin-branding-img" />
        ) : (
          <div className="admin-icon-default">Default</div>
        )}
      </div>
      <div className="admin-branding-info">
        <div className="setting-label"><span style={{ fontWeight: 600 }}>{label}</span><span className="setting-desc">{desc}</span></div>
        <div className="admin-branding-actions">
          <button className="admin-add-btn small" onClick={() => fileInputRef.current?.click()}><Upload size={11} /> Upload</button>
          {url && <button className="admin-btn-cancel" onClick={() => onReset(itemKey)}>Reset Default</button>}
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(itemKey, f); if (fileInputRef.current) fileInputRef.current.value = ''; }} />
        </div>
      </div>
    </div>
  );
}

function ResetManagement({ onWallpaperChange }: { onWallpaperChange: (wp: string) => void }) {
  const [confirmAll, setConfirmAll] = useState(false);

  const handleResetAll = async () => {
    if (!confirmAll) {
      setConfirmAll(true);
      return;
    }
    await resetAllSettings();
    onWallpaperChange('default');
    setConfirmAll(false);
  };

  return (
    <SettingsSection title="Reset">
      <div style={{ fontSize: 13, color: 'var(--text-sub)', marginBottom: 12 }}>
        Reset configuration and system assets to defaults. This does NOT delete public photos, admin private captures, or other permanent media.
      </div>
      <div className="setting-row">
        <div className="setting-label"><span>Reset Dock Settings</span><span className="setting-desc">Restore dock size, position, spacing</span></div>
        <button className="admin-btn-cancel" onClick={() => updateDockSettings(DEFAULT_DOCK_SETTINGS)}>Reset</button>
      </div>
      <div className="setting-row">
        <div className="setting-label"><span>Reset Menu Bar</span><span className="setting-desc">Restore menu bar toggles</span></div>
        <button className="admin-btn-cancel" onClick={() => updateMenuBarSettings(DEFAULT_MENU_BAR_SETTINGS)}>Reset</button>
      </div>
      <div className="setting-row">
        <div className="setting-label"><span>Reset Custom Icons</span><span className="setting-desc">Remove all custom dock and app icons</span></div>
        <button className="admin-btn-cancel" onClick={async () => { DOCK_APPS.forEach(async (a) => { await resetIcon(a.id, true); await resetIcon(a.id, false); }); }}>Reset</button>
      </div>
      <div className="setting-row">
        <div className="setting-label"><span>Reset Branding</span><span className="setting-desc">Remove custom branding assets</span></div>
        <button className="admin-btn-cancel" onClick={async () => { await resetBrandingAsset('logoUrl'); await resetBrandingAsset('faviconUrl'); await resetBrandingAsset('startupUrl'); }}>Reset</button>
      </div>
      <div className="setting-row" style={{ marginTop: 8, paddingTop: 12, borderTop: '0.5px solid var(--card-border)' }}>
        <div className="setting-label"><span>Reset All Settings</span><span className="setting-desc">Restore all configurable settings/assets to defaults. Does NOT delete photos, captures, or database content.</span></div>
        <button className={confirmAll ? 'admin-btn-save' : 'admin-btn-cancel'} onClick={handleResetAll}>
          {confirmAll ? 'Confirm Reset All' : 'Reset All'}
        </button>
      </div>
    </SettingsSection>
  );
}

function SystemTab({
  subTab,
  onSubTabChange,
}: {
  subTab: string;
  onSubTabChange: (id: string) => void;
}) {
  return (
    <>
      <div className="admin-content-title">System</div>
      <div className="admin-sub-tabs">
        {SYSTEM_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <div
              key={tab.id}
              className={`admin-sub-tab ${subTab === tab.id ? 'active' : ''}`}
              onClick={() => onSubTabChange(tab.id)}
            >
              <Icon size={14} color={subTab === tab.id ? 'white' : tab.color} />
              {tab.label}
            </div>
          );
        })}
      </div>

      <div className="admin-sub-content">
        {subTab === 'device-specs' && <DeviceSpecsManagement />}
        {subTab === 'news' && <NewsManagement />}
      </div>
    </>
  );
}

function DeviceSpecsManagement() {
  const [external, setExternal] = useState<SystemSettings>(getSystemSettings());
  useEffect(() => {
    (async () => {
      await fetchSystemSettings();
      setExternal(getSystemSettings());
    })();
    const unsub = subscribeSystemSettings(() => {
      setExternal(getSystemSettings());
    });
    return unsub;
  }, []);

  const persist = useCallback(async (data: SystemSettings) => {
    await updateSystemSettings(data);
  }, []);
  const { draft, isDirty, isSaving, error, setDraft, save, discard } = useDraftState('device-specs', external, persist);

  const handleChange = (field: keyof SystemSettings, value: string) => {
    setDraft({ [field]: value } as Partial<SystemSettings>);
  };

  const handleReset = () => {
    setDraft({ ...DEFAULT_SYSTEM_SETTINGS });
  };

  const fields: { key: keyof SystemSettings; label: string; section: string }[] = [
    { key: 'deviceName', label: 'Device Name', section: 'Device' },
    { key: 'model', label: 'Model', section: 'Device' },
    { key: 'chip', label: 'Chip / Processor', section: 'Device' },
    { key: 'ram', label: 'RAM', section: 'Device' },
    { key: 'storage', label: 'Storage', section: 'Device' },
    { key: 'resolution', label: 'Resolution', section: 'Display' },
    { key: 'display', label: 'Display', section: 'Display' },
    { key: 'refreshRate', label: 'Refresh Rate', section: 'Display' },
    { key: 'macosVersion', label: 'macOS Version', section: 'System' },
    { key: 'graphics', label: 'Graphics', section: 'System' },
    { key: 'battery', label: 'Battery', section: 'System' },
    { key: 'wifi', label: 'Wi-Fi', section: 'System' },
    { key: 'bluetooth', label: 'Bluetooth', section: 'System' },
  ];

  const sections = ['Device', 'Display', 'System'];

  return (
    <>
      <SettingsSection title="Device Specifications (Simulation)">
        {sections.map((section) => (
          <div key={section}>
            <div className="admin-field-group-label">{section}</div>
            {fields.filter((f) => f.section === section).map((f) => (
              <div className="setting-row" key={f.key}>
                <div className="setting-label"><span>{f.label}</span></div>
                <input
                  className="admin-input"
                  style={{ maxWidth: 240 }}
                  value={draft[f.key]}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                />
              </div>
            ))}
          </div>
        ))}
      </SettingsSection>
      <SectionActionBar isDirty={isDirty} isSaving={isSaving} error={error} onSave={save} onDiscard={discard} resetLabel="Reset to Default" onReset={handleReset} />
    </>
  );
}

function NewsManagement() {
  const [, forceTick] = useState(0);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [externalSettings, setExternalSettings] = useState<NewsSettingsType>(getNewsSettings());
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const photosInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      await fetchNewsSettings();
      setExternalSettings(getNewsSettings());
      await fetchAdminNews();
    })();
    const unsubSettings = subscribeNewsSettings(() => {
      setExternalSettings(getNewsSettings());
      forceTick((t) => t + 1);
    });
    const unsubNews = subscribeNews((items) => setNewsItems([...items]));
    return () => { unsubSettings(); unsubNews(); };
  }, []);

  const persistSettings = useCallback(async (data: NewsSettingsType) => {
    await updateNewsSettings(data);
  }, []);
  const { draft: newsSettings, isDirty, isSaving, error, setDraft: updateSetting, save, discard } = useDraftState('news-settings', externalSettings, persistSettings);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadNewsImage(file);
    if (url) setCoverUrl(url);
  };

  const handlePhotosUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      const url = await uploadNewsImage(file);
      if (url) setPhotos((prev) => [...prev, url]);
    }
  };

  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const movePhoto = (idx: number, dir: -1 | 1) => {
    setPhotos((prev) => {
      const next = [...prev];
      const swap = idx + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  };

  const resetForm = () => {
    setTitle('');
    setSubtitle('');
    setDate(new Date().toISOString().slice(0, 10));
    setCoverUrl(null);
    setPhotos([]);
    setEditingId(null);
  };

  const handleAdd = async () => {
    if (!title.trim()) return;
    await addNews(title.trim(), subtitle.trim(), coverUrl, photos, date);
    resetForm();
    setShowAdd(false);
  };

  const startEdit = (item: NewsItem) => {
    setEditingId(item.id);
    setTitle(item.title);
    setSubtitle(item.subtitle);
    setDate(item.date);
    setCoverUrl(item.cover_url);
    setPhotos([...item.photos]);
    setShowAdd(true);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !title.trim()) return;
    await updateNews(editingId, {
      title: title.trim(),
      subtitle: subtitle.trim(),
      cover_url: coverUrl,
      photos,
      date,
    });
    resetForm();
    setShowAdd(false);
  };

  const handleDelete = async (id: string) => {
    await deleteNews(id);
  };

  const handleToggleActive = async (item: NewsItem) => {
    await updateNews(item.id, { active: !item.active });
  };

  const handleMoveUp = async (item: NewsItem, idx: number) => {
    if (idx === 0) return;
    const prevItem = newsItems[idx - 1];
    await reorderNews(item.id, prevItem.sort_order);
    await reorderNews(prevItem.id, item.sort_order);
  };

  const handleMoveDown = async (item: NewsItem, idx: number) => {
    if (idx === newsItems.length - 1) return;
    const nextItem = newsItems[idx + 1];
    await reorderNews(item.id, nextItem.sort_order);
    await reorderNews(nextItem.id, item.sort_order);
  };

  const previewItem = previewId ? newsItems.find((n) => n.id === previewId) : null;

  return (
    <>
      <SettingsSection title="News Settings">
        <div className="setting-row">
          <div className="setting-label"><span>Enable News</span><span className="setting-desc">Turn the News system on or off</span></div>
          <label className="switch"><input type="checkbox" checked={newsSettings.enabled} onChange={(e) => updateSetting({ enabled: e.target.checked })} /><span className="slider" /></label>
        </div>
        <div className="setting-row">
          <div className="setting-label"><span>Show on Startup</span><span className="setting-desc">Open News automatically when the page loads</span></div>
          <label className="switch"><input type="checkbox" checked={newsSettings.showOnStartup} onChange={(e) => updateSetting({ showOnStartup: e.target.checked })} /><span className="slider" /></label>
        </div>
        <div className="setting-row">
          <div className="setting-label"><span>Once Per Session</span><span className="setting-desc">Only auto-open once per browser session</span></div>
          <label className="switch"><input type="checkbox" checked={newsSettings.oncePerSession} onChange={(e) => updateSetting({ oncePerSession: e.target.checked })} /><span className="slider" /></label>
        </div>
        <div className="setting-row">
          <div className="setting-label"><span>Allow Close</span><span className="setting-desc">Let users dismiss the News window</span></div>
          <label className="switch"><input type="checkbox" checked={newsSettings.allowClose} onChange={(e) => updateSetting({ allowClose: e.target.checked })} /><span className="slider" /></label>
        </div>
        <div className="setting-row">
          <div className="setting-label"><span>Auto Open Delay</span><span className="setting-desc">Milliseconds before auto-opening (0 = instant)</span></div>
          <input className="admin-input" style={{ maxWidth: 100 }} type="number" min={0} step={100} value={newsSettings.autoOpenDelay} onChange={(e) => updateSetting({ autoOpenDelay: parseInt(e.target.value) || 0 })} />
        </div>
        <div className="setting-row">
          <div className="setting-label"><span>Default News</span><span className="setting-desc">Which news item to show first</span></div>
          <select className="admin-select" style={{ maxWidth: 200 }} value={newsSettings.defaultNewsId ?? ''} onChange={(e) => updateSetting({ defaultNewsId: e.target.value || null })}>
            <option value="">First available</option>
            {newsItems.map((n) => (
              <option key={n.id} value={n.id}>{n.title}</option>
            ))}
          </select>
        </div>
        <div className="setting-row">
          <div className="setting-label"><span>Animation</span><span className="setting-desc">Entrance animation for the News window</span></div>
          <select className="admin-select" style={{ maxWidth: 140 }} value={newsSettings.animation} onChange={(e) => updateSetting({ animation: e.target.value as NewsSettingsType['animation'] })}>
            <option value="scale">Scale</option>
            <option value="fade">Fade</option>
            <option value="slide">Slide</option>
            <option value="none">None</option>
          </select>
        </div>
        <div className="setting-row">
          <div className="setting-label"><span>Reset Settings</span><span className="setting-desc">Restore News settings to defaults</span></div>
          <button className="admin-btn-cancel" onClick={() => updateSetting(DEFAULT_NEWS_SETTINGS)}>Reset</button>
        </div>
      </SettingsSection>

      <SectionActionBar isDirty={isDirty} isSaving={isSaving} error={error} onSave={save} onDiscard={discard} />

      <SettingsSection title={`News Items (${newsItems.length})`}>
        <div style={{ marginBottom: 12 }}>
          <button className="admin-btn-save" onClick={() => { if (editingId) { handleSaveEdit(); } else { setShowAdd(!showAdd); } }}>
            {showAdd ? (editingId ? 'Save Edit' : 'Cancel') : '+ Add News'}
          </button>
        </div>

        {showAdd && !editingId && (
          <NewsEditForm
            title={title} setTitle={setTitle}
            subtitle={subtitle} setSubtitle={setSubtitle}
            date={date} setDate={setDate}
            coverUrl={coverUrl} setCoverUrl={setCoverUrl}
            photos={photos} removePhoto={removePhoto} movePhoto={movePhoto}
            coverInputRef={coverInputRef} photosInputRef={photosInputRef}
            onCoverUpload={handleCoverUpload} onPhotosUpload={handlePhotosUpload}
            onSave={handleAdd} onCancel={() => { resetForm(); setShowAdd(false); }}
            saveLabel="Add News"
          />
        )}

        {showAdd && editingId && (
          <NewsEditForm
            title={title} setTitle={setTitle}
            subtitle={subtitle} setSubtitle={setSubtitle}
            date={date} setDate={setDate}
            coverUrl={coverUrl} setCoverUrl={setCoverUrl}
            photos={photos} removePhoto={removePhoto} movePhoto={movePhoto}
            coverInputRef={coverInputRef} photosInputRef={photosInputRef}
            onCoverUpload={handleCoverUpload} onPhotosUpload={handlePhotosUpload}
            onSave={handleSaveEdit} onCancel={() => { resetForm(); setShowAdd(false); }}
            saveLabel="Save Changes"
          />
        )}

        {newsItems.length === 0 && !showAdd ? (
          <div className="admin-empty-state">
            <Newspaper size={32} color="#8E8E93" />
            <p>No news items yet. Click "Add News" to create one.</p>
          </div>
        ) : (
          <div className="admin-news-list">
            {newsItems.map((item, idx) => (
              <div key={item.id} className={`admin-news-card ${!item.active ? 'disabled' : ''}`}>
                <div className="admin-news-cover" style={item.cover_url ? { backgroundImage: `url(${item.cover_url})` } : undefined}>
                  {!item.cover_url && <Newspaper size={24} color="#8E8E93" />}
                </div>
                <div className="admin-news-info">
                  <div className="admin-news-title">{item.title}</div>
                  <div className="admin-news-subtitle">{item.subtitle}</div>
                  <div className="admin-news-meta">
                    <span>{item.date}</span>
                    <span>{item.photos.length} photos</span>
                    <span className={`admin-news-status ${item.active ? 'active' : 'inactive'}`}>{item.active ? 'Active' : 'Disabled'}</span>
                  </div>
                </div>
                <div className="admin-news-actions">
                  <button className="admin-icon-btn" onClick={() => handleMoveUp(item, idx)} disabled={idx === 0} title="Move Up"><ArrowUp size={13} /></button>
                  <button className="admin-icon-btn" onClick={() => handleMoveDown(item, idx)} disabled={idx === newsItems.length - 1} title="Move Down"><ArrowDown size={13} /></button>
                  <button className="admin-icon-btn" onClick={() => handleToggleActive(item)} title={item.active ? 'Disable' : 'Enable'}><Eye size={13} /></button>
                  <button className="admin-icon-btn" onClick={() => startEdit(item)} title="Edit"><Edit2 size={13} /></button>
                  <button className="admin-icon-btn" onClick={() => setPreviewId(item.id)} title="Preview"><Eye size={13} /></button>
                  <button className="admin-icon-btn danger" onClick={() => handleDelete(item.id)} title="Delete"><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SettingsSection>

      {previewItem && (
        <div className="admin-news-preview-overlay" onClick={() => setPreviewId(null)}>
          <div className="admin-news-preview-modal" onClick={(e) => e.stopPropagation()}>
            <button className="news-close-btn" onClick={() => setPreviewId(null)}><X size={16} /></button>
            <div className="news-scroll-container">
              {previewItem.cover_url && (
                <div className="news-cover">
                  <img src={previewItem.cover_url} alt={previewItem.title} className="news-cover-img" />
                  <div className="news-cover-overlay" />
                </div>
              )}
              <div className="news-header">
                <div className="news-date-badge"><Calendar size={12} /><span>{previewItem.date}</span></div>
                <h1 className="news-title">{previewItem.title}</h1>
                {previewItem.subtitle && <p className="news-subtitle">{previewItem.subtitle}</p>}
              </div>
              {previewItem.photos.length > 0 && (
                <div className="news-photos">
                  {previewItem.photos.map((url, i) => (
                    <div key={i} className="news-photo-item"><img src={url} alt={`Photo ${i + 1}`} className="news-article-img" /></div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function NewsEditForm({
  title, setTitle,
  subtitle, setSubtitle,
  date, setDate,
  coverUrl, setCoverUrl,
  photos, removePhoto, movePhoto,
  coverInputRef, photosInputRef,
  onCoverUpload, onPhotosUpload,
  onSave, onCancel,
  saveLabel,
}: {
  title: string; setTitle: (v: string) => void;
  subtitle: string; setSubtitle: (v: string) => void;
  date: string; setDate: (v: string) => void;
  coverUrl: string | null; setCoverUrl: (v: string | null) => void;
  photos: string[]; removePhoto: (idx: number) => void; movePhoto: (idx: number, dir: -1 | 1) => void;
  coverInputRef: React.RefObject<HTMLInputElement>; photosInputRef: React.RefObject<HTMLInputElement>;
  onCoverUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; onPhotosUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void; onCancel: () => void;
  saveLabel: string;
}) {
  return (
    <div className="admin-news-edit-form">
      <div className="admin-news-form-row">
        <label className="admin-form-label">Title</label>
        <input className="admin-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="News title" />
      </div>
      <div className="admin-news-form-row">
        <label className="admin-form-label">Subtitle</label>
        <input className="admin-input" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Short subtitle" />
      </div>
      <div className="admin-news-form-row">
        <label className="admin-form-label">Date</label>
        <input className="admin-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ maxWidth: 180 }} />
      </div>
      <div className="admin-news-form-row">
        <label className="admin-form-label">Cover Photo</label>
        <div className="admin-news-cover-upload">
          {coverUrl ? (
            <div className="admin-news-cover-preview">
              <img src={coverUrl} alt="Cover" className="admin-news-cover-img" />
              <button className="admin-icon-btn danger" onClick={() => setCoverUrl(null)}><Trash2 size={13} /></button>
            </div>
          ) : (
            <button className="admin-wp-upload" onClick={() => coverInputRef.current?.click()} style={{ width: 120, height: 75 }}>
              <Upload size={20} />
              <span>Upload Cover</span>
            </button>
          )}
          <input ref={coverInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onCoverUpload} />
        </div>
      </div>
      <div className="admin-news-form-row">
        <label className="admin-form-label">Article Photos</label>
        <div className="admin-news-photos-upload">
          <button className="admin-wp-upload" onClick={() => photosInputRef.current?.click()} style={{ width: 120, height: 75 }}>
            <Plus size={20} />
            <span>Add Photos</span>
          </button>
          <input ref={photosInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={onPhotosUpload} />
          {photos.map((url, idx) => (
            <div key={idx} className="admin-news-photo-thumb">
              <img src={url} alt={`Photo ${idx + 1}`} />
              <div className="admin-news-photo-controls">
                <button className="admin-icon-btn" onClick={() => movePhoto(idx, -1)} disabled={idx === 0}><ArrowUp size={11} /></button>
                <button className="admin-icon-btn" onClick={() => movePhoto(idx, 1)} disabled={idx === photos.length - 1}><ArrowDown size={11} /></button>
                <button className="admin-icon-btn danger" onClick={() => removePhoto(idx)}><X size={11} /></button>
              </div>
              <span className="admin-news-photo-order">{idx + 1}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="admin-action-bar">
        <button className="admin-btn-save" onClick={onSave}>{saveLabel}</button>
        <button className="admin-btn-cancel" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function MediaItemPreviewModal({
  item,
  onClose,
}: {
  item: MediaItem | null;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (item) {
      setLoading(true);
      setError(false);
    }
  }, [item]);

  if (!item || !item.url) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(20px)',
        zIndex: 5000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'rgba(30,30,30,0.9)',
          borderRadius: 12,
          maxWidth: '90vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>
            {item.name}
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={16} />
          </button>
        </div>
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 200,
          minWidth: 300,
          maxHeight: '80vh',
          overflow: 'hidden',
          position: 'relative',
        }}>
          {loading && !error && (
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Loading...</div>
          )}
          {error && (
            <div style={{ color: '#ff3b30', fontSize: 13, textAlign: 'center', padding: 20 }}>
              Failed to load media.
            </div>
          )}
          {item.type === 'video' ? (
            <video
              src={item.url}
              controls
              autoPlay
              onLoadedData={() => setLoading(false)}
              onError={() => { setError(true); setLoading(false); }}
              style={{
                maxWidth: '90vw',
                maxHeight: '75vh',
                display: loading || error ? 'none' : 'block',
              }}
            />
          ) : (
            <img
              src={item.url}
              alt={item.name}
              onLoad={() => setLoading(false)}
              onError={() => { setError(true); setLoading(false); }}
              style={{
                maxWidth: '90vw',
                maxHeight: '75vh',
                objectFit: 'contain',
                display: loading || error ? 'none' : 'block',
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function MediaPreviewModal({
  item,
  onClose,
  onDownload,
}: {
  item: AdminPrivateMedia | null;
  onClose: () => void;
  onDownload: (item: AdminPrivateMedia) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (item) {
      setLoading(true);
      setError(false);
    }
  }, [item]);

  if (!item) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(20px)',
        zIndex: 5000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'rgba(30,30,30,0.9)',
          borderRadius: 12,
          maxWidth: '90vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>
            {item.name}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => onDownload(item)}
              style={{
                background: 'rgba(0,122,255,0.2)',
                border: '1px solid rgba(0,122,255,0.4)',
                color: '#0a84ff',
                borderRadius: 6,
                padding: '4px 12px',
                fontSize: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Download size={13} /> Download
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                padding: 4,
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 200,
          minWidth: 300,
          maxHeight: '80vh',
          overflow: 'hidden',
          position: 'relative',
        }}>
          {loading && !error && (
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Loading...</div>
          )}
          {error && (
            <div style={{ color: '#ff3b30', fontSize: 13, textAlign: 'center', padding: 20 }}>
              Failed to load media. The file may be unavailable or access was denied.
            </div>
          )}
          {item.type === 'image' ? (
            <img
              src={item.url}
              alt={item.name}
              onLoad={() => setLoading(false)}
              onError={() => { setError(true); setLoading(false); }}
              style={{
                maxWidth: '90vw',
                maxHeight: '75vh',
                objectFit: 'contain',
                display: loading || error ? 'none' : 'block',
              }}
            />
          ) : (
            <video
              src={item.url}
              controls
              autoPlay
              onLoadedData={() => setLoading(false)}
              onError={() => { setError(true); setLoading(false); }}
              style={{
                maxWidth: '90vw',
                maxHeight: '75vh',
                display: loading || error ? 'none' : 'block',
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="admin-section">
      <div className="admin-section-subtitle">{title}</div>
      <div className="settings-card">{children}</div>
    </div>
  );
}

function SectionActionBar({
  isDirty,
  isSaving,
  error,
  onSave,
  onDiscard,
  resetLabel,
  onReset,
}: {
  isDirty: boolean;
  isSaving: boolean;
  error: string | null;
  onSave: () => Promise<void>;
  onDiscard: () => void;
  resetLabel?: string;
  onReset?: () => void;
}) {
  if (!isDirty && !error) return null;
  return (
    <div className="admin-action-bar">
      {onReset && <button className="admin-btn-cancel" onClick={onReset}>{resetLabel ?? 'Reset'}</button>}
      <button className="admin-btn-cancel" onClick={onDiscard} disabled={isSaving}>Discard</button>
      <button className="admin-btn-save" onClick={onSave} disabled={isSaving}>
        {isSaving ? 'Saving…' : 'Save Changes'}
      </button>
      {error && <span className="admin-error-msg">{error}</span>}
    </div>
  );
}

function AdsManagement() {
  const [external, setExternal] = useState<AdSettings>(getAdSettings());
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [targetUrl, setTargetUrl] = useState('');
  const [label, setLabel] = useState('');
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      await fetchAdSettings();
      setExternal(getAdSettings());
    })();
    const unsub = subscribeAdSettings(() => {
      setExternal(getAdSettings());
    });
    return unsub;
  }, []);

  const persist = useCallback(async (data: AdSettings) => {
    await updateAdSettings(data);
  }, []);
  const { draft, isDirty, isSaving, error, setDraft, save, discard } = useDraftState('ads', external, persist);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadAdImage(file);
    if (url) setImageUrl(url);
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setImageUrl(null);
    setTargetUrl('');
    setLabel('');
    setEditingId(null);
  };

  const handleAdd = () => {
    if (!title.trim()) return;
    const newItem: AdItem = {
      id: `ad-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      enabled: true,
      title: title.trim(),
      description: description.trim(),
      image: imageUrl,
      targetUrl: targetUrl.trim(),
      label: label.trim(),
      order: draft.items.length,
    };
    setDraft({ items: [...draft.items, newItem] });
    resetForm();
    setShowAdd(false);
  };

  const startEdit = (item: AdItem) => {
    setEditingId(item.id);
    setTitle(item.title);
    setDescription(item.description);
    setImageUrl(item.image);
    setTargetUrl(item.targetUrl);
    setLabel(item.label);
    setShowAdd(true);
  };

  const handleSaveEdit = () => {
    if (!editingId || !title.trim()) return;
    const items = draft.items.map((item) =>
      item.id === editingId
        ? { ...item, title: title.trim(), description: description.trim(), image: imageUrl, targetUrl: targetUrl.trim(), label: label.trim() }
        : item
    );
    setDraft({ items });
    resetForm();
    setShowAdd(false);
  };

  const handleDelete = (id: string) => {
    setDraft({ items: draft.items.filter((item) => item.id !== id) });
  };

  const handleToggleEnabled = (id: string) => {
    setDraft({ items: draft.items.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item)) });
  };

  const handleMoveUp = (idx: number) => {
    if (idx === 0) return;
    const items = [...draft.items];
    [items[idx - 1], items[idx]] = [items[idx], items[idx - 1]];
    setDraft({ items: items.map((item, i) => ({ ...item, order: i })) });
  };

  const handleMoveDown = (idx: number) => {
    if (idx === draft.items.length - 1) return;
    const items = [...draft.items];
    [items[idx], items[idx + 1]] = [items[idx + 1], items[idx]];
    setDraft({ items: items.map((item, i) => ({ ...item, order: i })) });
  };

  const handleReset = () => {
    setDraft({ ...DEFAULT_AD_SETTINGS });
  };

  return (
    <>
      <div className="admin-content-title">Advertising</div>

      <SettingsSection title="Ad Settings">
        <div className="setting-row">
          <div className="setting-label"><span>Enable Advertising</span><span className="setting-desc">Turn the advertising system on or off</span></div>
          <label className="switch"><input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft({ enabled: e.target.checked })} /><span className="slider" /></label>
        </div>
      </SettingsSection>

      <SectionActionBar isDirty={isDirty} isSaving={isSaving} error={error} onSave={save} onDiscard={discard} resetLabel="Reset to Default" onReset={handleReset} />

      <SettingsSection title={`Ad Items (${draft.items.length})`}>
        <div style={{ marginBottom: 12 }}>
          <button className="admin-btn-save" onClick={() => { if (editingId) { handleSaveEdit(); } else { setShowAdd(!showAdd); } }}>
            {showAdd ? (editingId ? 'Save Edit' : 'Cancel') : '+ Add Ad'}
          </button>
        </div>

        {showAdd && !editingId && (
          <AdEditForm
            title={title} setTitle={setTitle}
            description={description} setDescription={setDescription}
            imageUrl={imageUrl} setImageUrl={setImageUrl}
            targetUrl={targetUrl} setTargetUrl={setTargetUrl}
            label={label} setLabel={setLabel}
            imageInputRef={imageInputRef}
            onImageUpload={handleImageUpload}
            onSave={handleAdd} onCancel={() => { resetForm(); setShowAdd(false); }}
            saveLabel="Add Ad"
          />
        )}

        {showAdd && editingId && (
          <AdEditForm
            title={title} setTitle={setTitle}
            description={description} setDescription={setDescription}
            imageUrl={imageUrl} setImageUrl={setImageUrl}
            targetUrl={targetUrl} setTargetUrl={setTargetUrl}
            label={label} setLabel={setLabel}
            imageInputRef={imageInputRef}
            onImageUpload={handleImageUpload}
            onSave={handleSaveEdit} onCancel={() => { resetForm(); setShowAdd(false); }}
            saveLabel="Save Changes"
          />
        )}

        {draft.items.length === 0 && !showAdd ? (
          <div className="admin-empty-state">
            <Star size={32} color="#8E8E93" />
            <p>No ad items yet. Click "Add Ad" to create one.</p>
          </div>
        ) : (
          <div className="admin-news-list">
            {draft.items.map((item, idx) => (
              <div key={item.id} className={`admin-news-card ${!item.enabled ? 'disabled' : ''}`}>
                <div className="admin-news-cover" style={item.image ? { backgroundImage: `url(${item.image})` } : undefined}>
                  {!item.image && <Star size={24} color="#8E8E93" />}
                </div>
                <div className="admin-news-info">
                  <div className="admin-news-title">{item.title}</div>
                  <div className="admin-news-subtitle">{item.description}</div>
                  <div className="admin-news-meta">
                    <span>{item.label || 'No label'}</span>
                    <span>{item.targetUrl || 'No URL'}</span>
                    <span className={`admin-news-status ${item.enabled ? 'active' : 'inactive'}`}>{item.enabled ? 'Active' : 'Disabled'}</span>
                  </div>
                </div>
                <div className="admin-news-actions">
                  <button className="admin-icon-btn" onClick={() => handleMoveUp(idx)} disabled={idx === 0} title="Move Up"><ArrowUp size={13} /></button>
                  <button className="admin-icon-btn" onClick={() => handleMoveDown(idx)} disabled={idx === draft.items.length - 1} title="Move Down"><ArrowDown size={13} /></button>
                  <button className="admin-icon-btn" onClick={() => handleToggleEnabled(item.id)} title={item.enabled ? 'Disable' : 'Enable'}><Eye size={13} /></button>
                  <button className="admin-icon-btn" onClick={() => startEdit(item)} title="Edit"><Edit2 size={13} /></button>
                  <button className="admin-icon-btn danger" onClick={() => handleDelete(item.id)} title="Delete"><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SettingsSection>
    </>
  );
}

function AdEditForm({
  title, setTitle,
  description, setDescription,
  imageUrl, setImageUrl,
  targetUrl, setTargetUrl,
  label, setLabel,
  imageInputRef,
  onImageUpload,
  onSave, onCancel,
  saveLabel,
}: {
  title: string; setTitle: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  imageUrl: string | null; setImageUrl: (v: string | null) => void;
  targetUrl: string; setTargetUrl: (v: string) => void;
  label: string; setLabel: (v: string) => void;
  imageInputRef: React.RefObject<HTMLInputElement>;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void; onCancel: () => void;
  saveLabel: string;
}) {
  return (
    <div className="admin-news-edit-form">
      <div className="admin-news-form-row">
        <label className="admin-form-label">Title</label>
        <input className="admin-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ad title" />
      </div>
      <div className="admin-news-form-row">
        <label className="admin-form-label">Description</label>
        <input className="admin-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description" />
      </div>
      <div className="admin-news-form-row">
        <label className="admin-form-label">Label</label>
        <input className="admin-input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Button label (e.g. Learn More)" />
      </div>
      <div className="admin-news-form-row">
        <label className="admin-form-label">Target URL</label>
        <input className="admin-input" value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} placeholder="https://..." />
      </div>
      <div className="admin-news-form-row">
        <label className="admin-form-label">Image</label>
        <div className="admin-news-cover-upload">
          {imageUrl ? (
            <div className="admin-news-cover-preview">
              <img src={imageUrl} alt="Ad" className="admin-news-cover-img" />
              <button className="admin-icon-btn danger" onClick={() => setImageUrl(null)}><Trash2 size={13} /></button>
            </div>
          ) : (
            <button className="admin-wp-upload" onClick={() => imageInputRef.current?.click()} style={{ width: 120, height: 75 }}>
              <Upload size={20} />
              <span>Upload Image</span>
            </button>
          )}
          <input ref={imageInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onImageUpload} />
        </div>
      </div>
      <div className="admin-action-bar">
        <button className="admin-btn-save" onClick={onSave}>{saveLabel}</button>
        <button className="admin-btn-cancel" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}