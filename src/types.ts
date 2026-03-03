// --- TOML Value Type System ---

export type TomlPrimitive = string | number | boolean | Date;
export type TomlArray = ReadonlyArray<TomlPrimitive> | ReadonlyArray<TomlTable>;
export type TomlValue = TomlPrimitive | TomlArray | TomlTable;
export interface TomlTable {
  [key: string]: TomlValue;
}

// --- Parsed TOML ---

export interface ParsedToml {
  data: TomlTable | null;
  raw: string;
  error: string | null;
  timestamp: number;
  endLine: number;
}

// --- Change Action & Callback Types ---

export type ChangeAction =
  | { type: 'update'; keyPath: string[]; value: TomlValue }
  | { type: 'delete'; keyPath: string[] }
  | { type: 'add'; keyPath: string[]; value: TomlValue };

export type OnPropertyChange = (
  keyPath: string[],
  value: TomlValue | undefined,
  action: 'update' | 'delete' | 'add',
) => void;

// --- Type Guards ---

export function isTomlTable(value: TomlValue): value is TomlTable {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date);
}

export function isTomlArray(value: TomlValue): value is TomlArray {
  return Array.isArray(value);
}

export function isTomlDate(value: TomlValue): value is Date {
  return value instanceof Date;
}

// --- Plugin Settings ---

export interface PluginSettings {
  delimiter: string;
  defaultCollapsed: boolean;
  renderMode: 'table' | 'raw' | 'both';
  enabledInReadingView: boolean;
  enabledInLivePreview: boolean;
  enableBasesIntegration: boolean;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  delimiter: '+++',
  defaultCollapsed: false,
  renderMode: 'table',
  enabledInReadingView: true,
  enabledInLivePreview: true,
  enableBasesIntegration: true,
};
