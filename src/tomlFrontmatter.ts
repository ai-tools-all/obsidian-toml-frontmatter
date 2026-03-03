import * as TOML from '@iarna/toml';
import { ParsedToml, TomlTable, TomlValue } from './types';

const TEMPLATER_RE = /<%.*?%>/g;

function escapeTemplaterBlocks(raw: string): { cleaned: string; placeholders: Map<string, string> } {
  const placeholders = new Map<string, string>();
  let i = 0;
  const cleaned = raw.replace(TEMPLATER_RE, (match) => {
    const key = `__TMPL${i++}__`;
    placeholders.set(key, match);
    return key;
  });
  return { cleaned, placeholders };
}

function restoreTemplaterValues(value: TomlValue, placeholders: Map<string, string>): TomlValue {
  if (typeof value === 'string') {
    let s = value;
    for (const [key, original] of placeholders) {
      s = s.replace(key, original);
    }
    return s;
  }
  if (Array.isArray(value)) {
    return value.map(v => restoreTemplaterValues(v, placeholders)) as TomlValue;
  }
  if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
    const obj: Record<string, TomlValue> = {};
    for (const [k, v] of Object.entries(value as TomlTable)) {
      obj[k] = restoreTemplaterValues(v, placeholders);
    }
    return obj as TomlTable;
  }
  return value;
}

export function parseTomlFrontmatter(
  content: string,
  delimiter: string = '+++',
): ParsedToml {
  const timestamp = Date.now();
  const empty: ParsedToml = { data: null, raw: '', error: null, timestamp, endLine: -1 };

  if (!content.trim()) return empty;

  const normalized = content.replace(/\r\n/g, '\n').replace(/^\uFEFF/, '');
  const lines = normalized.split('\n');

  const firstNonEmpty = lines.findIndex((line) => line.trim());
  if (firstNonEmpty === -1 || lines[firstNonEmpty].trim() !== delimiter) {
    return empty;
  }

  let closingIndex = -1;
  for (let i = firstNonEmpty + 1; i < lines.length; i++) {
    if (lines[i].trim() === delimiter) {
      closingIndex = i;
      break;
    }
  }

  if (closingIndex === -1) {
    return { data: null, raw: '', error: 'Missing closing delimiter: ' + delimiter, timestamp, endLine: -1 };
  }

  const tomlLines = lines.slice(firstNonEmpty + 1, closingIndex);
  const raw = tomlLines.join('\n');

  if (!raw.trim()) {
    return { data: {}, raw, error: null, timestamp, endLine: closingIndex };
  }

  try {
    const parsed = TOML.parse(raw) as unknown as TomlTable;
    return { data: parsed, raw, error: null, timestamp, endLine: closingIndex };
  } catch (firstErr) {
    const { cleaned, placeholders } = escapeTemplaterBlocks(raw);
    if (placeholders.size === 0) {
      const errorMsg = firstErr instanceof Error ? firstErr.message : 'Unknown TOML parse error';
      return { data: null, raw, error: errorMsg, timestamp, endLine: closingIndex };
    }
    try {
      let parsed = TOML.parse(cleaned) as unknown as TomlTable;
      parsed = restoreTemplaterValues(parsed, placeholders) as TomlTable;
      return { data: parsed, raw, error: null, timestamp, endLine: closingIndex };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown TOML parse error';
      return { data: null, raw, error: errorMsg, timestamp, endLine: closingIndex };
    }
  }
}
