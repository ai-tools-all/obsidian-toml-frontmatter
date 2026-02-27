import * as TOML from '@iarna/toml';
import { ParsedToml } from './types';

export function parseTomlFrontmatter(
  content: string,
  delimiter: string = '+++',
): ParsedToml {
  const timestamp = Date.now();
  const empty: ParsedToml = { data: null, raw: '', error: null, timestamp, endLine: -1 };

  if (!content.trim()) return empty;

  const normalized = content.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');

  const firstNonEmpty = lines.findIndex((line) => line.trim());
  if (firstNonEmpty === -1 || !lines[firstNonEmpty].trim().startsWith(delimiter)) {
    return empty;
  }

  let closingIndex = -1;
  for (let i = firstNonEmpty + 1; i < lines.length; i++) {
    if (lines[i].trim().startsWith(delimiter)) {
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
    const parsed = TOML.parse(raw) as Record<string, any>;
    return { data: parsed, raw, error: null, timestamp, endLine: closingIndex };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown TOML parse error';
    return { data: null, raw, error: errorMsg, timestamp, endLine: closingIndex };
  }
}
