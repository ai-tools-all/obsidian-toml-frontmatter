import * as TOML from '@iarna/toml';
import { parseTomlFrontmatter } from './tomlFrontmatter';
import { ChangeAction, TomlTable, TomlValue, isTomlTable } from './types';

export function applyTomlChange(
  fileContent: string,
  change: ChangeAction,
  delimiter: string = '+++',
): string {
  const parsed = parseTomlFrontmatter(fileContent, delimiter);
  if (!parsed.data || parsed.endLine < 0) {
    throw new Error('No valid TOML frontmatter found');
  }

  const data: TomlTable = structuredClone(parsed.data);
  const { keyPath } = change;

  if (keyPath.length === 0) throw new Error('Empty keyPath');

  if (change.type === 'update' || change.type === 'add') {
    setNestedValue(data, keyPath, change.value);
  } else {
    deleteNestedKey(data, keyPath);
  }

  const newToml = TOML.stringify(data as Parameters<typeof TOML.stringify>[0]).trimEnd();

  try {
    TOML.parse(newToml);
  } catch {
    throw new Error('Generated TOML is invalid — aborting write');
  }

  return spliceFrontmatter(fileContent, newToml, delimiter);
}

function setNestedValue(obj: TomlTable, keyPath: string[], value: TomlValue): void {
  let current: TomlTable = obj;
  for (let i = 0; i < keyPath.length - 1; i++) {
    const key = keyPath[i];
    const child = current[key];
    if (child === undefined || !isTomlTable(child)) {
      const newTable: TomlTable = {};
      current[key] = newTable;
      current = newTable;
    } else {
      current = child;
    }
  }
  const finalKey = keyPath[keyPath.length - 1];
  current[finalKey] = value;
}

function deleteNestedKey(obj: TomlTable, keyPath: string[]): void {
  let current: TomlTable = obj;
  for (let i = 0; i < keyPath.length - 1; i++) {
    const child = current[keyPath[i]];
    if (!child || !isTomlTable(child)) {
      throw new Error(`Key path not found: ${keyPath.join('.')}`);
    }
    current = child;
  }
  const finalKey = keyPath[keyPath.length - 1];
  if (!(finalKey in current)) {
    throw new Error(`Key not found: ${keyPath.join('.')}`);
  }
  delete current[finalKey];
}

function spliceFrontmatter(fileContent: string, newToml: string, delimiter: string): string {
  const normalized = fileContent.replace(/\r\n/g, '\n').replace(/^\uFEFF/, '');
  const lines = normalized.split('\n');

  let openLine = -1;
  let closeLine = -1;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed === delimiter) {
      if (openLine === -1) {
        openLine = i;
      } else {
        closeLine = i;
        break;
      }
    } else if (openLine === -1 && trimmed !== '') {
      break;
    }
  }

  if (openLine === -1 || closeLine === -1) {
    throw new Error('Could not find frontmatter delimiters');
  }

  const before = lines.slice(0, openLine + 1);
  const after = lines.slice(closeLine);

  return [...before, newToml, ...after].join('\n');
}
