import { MarkdownRenderChild } from 'obsidian';
import { ParsedToml, PluginSettings } from './types';

const ICONS: Record<string, string> = {
  text: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 6.1H3"/><path d="M21 12.1H3"/><path d="M15.1 18H3"/></svg>`,
  number: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17l6-6-6-6"/><path d="M12 19h8"/></svg>`,
  date: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  tags: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>`,
  boolean: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="5" width="22" height="14" rx="7" ry="7"/><circle cx="8" cy="12" r="3"/></svg>`,
  object: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`,
};

function detectType(value: any): string {
  if (value === null || value === undefined) return 'text';
  if (value instanceof Date) return 'date';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (Array.isArray(value)) return 'tags';
  if (typeof value === 'object') return 'object';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
  return 'text';
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (value instanceof Date) return value.toISOString().split('T')[0];
  if (Array.isArray(value)) return value.map(v => formatValue(v)).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function renderRow(container: HTMLElement, key: string, value: any): void {
  const type = detectType(value);
  const row = container.createDiv({ cls: 'toml-properties-row' });

  const iconEl = row.createSpan({ cls: 'toml-properties-icon' });
  iconEl.innerHTML = ICONS[type] || ICONS.text;

  row.createSpan({ cls: 'toml-properties-key', text: key });

  const valueEl = row.createSpan({ cls: 'toml-properties-value' });

  if (type === 'tags' && Array.isArray(value)) {
    const tagsContainer = valueEl.createSpan({ cls: 'toml-tags' });
    for (const tag of value) {
      tagsContainer.createSpan({ cls: 'toml-tag', text: String(tag) });
    }
  } else if (type === 'boolean') {
    const cb = valueEl.createEl('input', { type: 'checkbox', attr: { disabled: '' } });
    if (value) cb.setAttribute('checked', '');
  } else if (type === 'date') {
    const dateStr = value instanceof Date ? value.toISOString().split('T')[0] : String(value);
    valueEl.createSpan({ cls: 'toml-date-value', text: dateStr });
  } else {
    valueEl.createSpan({ text: formatValue(value) });
  }
}

function renderProperties(container: HTMLElement, data: Record<string, any>): void {
  const flat: [string, any][] = [];
  const nested: [string, Record<string, any>][] = [];

  for (const [key, value] of Object.entries(data)) {
    if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      nested.push([key, value]);
    } else {
      flat.push([key, value]);
    }
  }

  for (const [key, value] of flat) {
    renderRow(container, key, value);
  }

  for (const [key, obj] of nested) {
    const sectionEl = container.createDiv({ cls: 'toml-properties-section' });
    const sectionHeader = sectionEl.createDiv({ cls: 'toml-properties-section-header' });
    const iconEl = sectionHeader.createSpan({ cls: 'toml-properties-icon' });
    iconEl.innerHTML = ICONS.object;
    sectionHeader.createSpan({ cls: 'toml-properties-section-name', text: key });

    for (const [subKey, subValue] of Object.entries(obj)) {
      if (subValue !== null && typeof subValue === 'object' && !Array.isArray(subValue) && !(subValue instanceof Date)) {
        for (const [deepKey, deepValue] of Object.entries(subValue as Record<string, any>)) {
          renderRow(sectionEl, deepKey, deepValue);
        }
      } else {
        renderRow(sectionEl, subKey, subValue);
      }
    }
  }
}

export function buildPropertiesDOM(container: HTMLElement, parsed: ParsedToml, settings: PluginSettings): void {
  container.addClass('toml-properties');

  const header = container.createDiv({ cls: 'toml-properties-header' });
  const chevron = header.createSpan({
    cls: 'toml-properties-chevron',
    text: settings.defaultCollapsed ? '›' : '‹',
  });
  header.createSpan({ cls: 'toml-properties-title', text: 'Properties' });

  const body = container.createDiv({ cls: 'toml-properties-body' });

  if (settings.defaultCollapsed) {
    body.style.display = 'none';
    container.addClass('is-collapsed');
  }

  header.addEventListener('click', () => {
    const isHidden = body.style.display === 'none';
    body.style.display = isHidden ? '' : 'none';
    chevron.textContent = isHidden ? '‹' : '›';
    container.toggleClass('is-collapsed', !isHidden);
  });

  if (parsed.error) {
    body.createDiv({ cls: 'toml-properties-error' }).createSpan({ text: parsed.error });
    return;
  }

  if (!parsed.data || Object.keys(parsed.data).length === 0) {
    body.createDiv({ cls: 'toml-properties-empty', text: 'No properties' });
    return;
  }

  renderProperties(body, parsed.data);
}

export class TomlCard extends MarkdownRenderChild {
  private parsed: ParsedToml;
  private settings: PluginSettings;

  constructor(container: HTMLElement, parsed: ParsedToml, settings: PluginSettings) {
    super(container);
    this.parsed = parsed;
    this.settings = settings;
  }

  onload(): void {
    this.containerEl.empty();
    buildPropertiesDOM(this.containerEl, this.parsed, this.settings);
  }
}
