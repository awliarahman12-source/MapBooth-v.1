export type WindowId =
  | 'finderWindow'
  | 'settingsWindow'
  | 'photosWindow'
  | 'photoboothWindow'
  | 'adminLoginWindow'
  | 'adminDashboardWindow'
  | 'newsWindow';

export interface WindowState {
  closed: boolean;
  minimized: boolean;
  fullscreen: boolean;
  zIndex: number;
  top: number;
  left: number;
  width: number;
  height: number;
}

export type ThemeMode = 'light' | 'dark' | 'auto';

export type AdminTab = 'overview' | 'photobooth' | 'photos' | 'media' | 'settings' | 'system' | 'ads';
