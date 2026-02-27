export interface ParsedToml {
  data: Record<string, any> | null;
  raw: string;
  error: string | null;
  timestamp: number;
  endLine: number;
}

export interface PluginSettings {
  delimiter: string;
  defaultCollapsed: boolean;
  renderMode: 'table' | 'raw' | 'both';
  enabledInReadingView: boolean;
  enabledInLivePreview: boolean;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  delimiter: '+++',
  defaultCollapsed: false,
  renderMode: 'table',
  enabledInReadingView: true,
  enabledInLivePreview: true,
};
