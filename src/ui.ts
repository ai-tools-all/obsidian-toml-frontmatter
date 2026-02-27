import { MarkdownRenderChild } from 'obsidian';
import { ParsedToml, PluginSettings } from './types';

export class TomlCard extends MarkdownRenderChild {
  private parsed: ParsedToml;
  private settings: PluginSettings;

  constructor(container: HTMLElement, parsed: ParsedToml, settings: PluginSettings) {
    super(container);
    this.parsed = parsed;
    this.settings = settings;
  }

  onload(): void {
    this.render();
  }

  private render(): void {
    const container = this.containerEl;
    container.empty();
    container.addClass('toml-frontmatter-container');

    const header = container.createEl('div', { cls: 'toml-header' });

    const chevron = header.createEl('span', {
      cls: 'toml-chevron',
      text: this.settings.defaultCollapsed ? '▶' : '▼',
    });

    header.createEl('span', { cls: 'toml-title', text: 'TOML Frontmatter' });

    const body = container.createEl('div', { cls: 'toml-body' });

    if (this.settings.defaultCollapsed) {
      body.style.display = 'none';
    }

    header.addEventListener('click', () => {
      const isHidden = body.style.display === 'none';
      body.style.display = isHidden ? 'block' : 'none';
      chevron.textContent = isHidden ? '▼' : '▶';
    });

    if (this.parsed.error) {
      const errorEl = body.createEl('div', { cls: 'toml-error' });
      errorEl.createEl('strong', { text: 'Parse Error:' });
      errorEl.createEl('pre', { text: this.parsed.error });
    } else if (this.parsed.data) {
      if (this.settings.renderMode === 'table' || this.settings.renderMode === 'both') {
        this.renderTable(body, this.parsed.data);
      }
      if (this.settings.renderMode === 'raw' || this.settings.renderMode === 'both') {
        this.renderRaw(body);
      }
    } else {
      body.createEl('div', { cls: 'toml-empty', text: 'No TOML frontmatter' });
    }
  }

  private renderTable(container: HTMLElement, data: Record<string, any>, prefix?: string): void {
    const table = container.createEl('table', { cls: 'toml-table' });
    const tbody = table.createEl('tbody');

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
      const row = tbody.createEl('tr');
      row.createEl('td', { cls: 'toml-key', text: key });
      row.createEl('td', { cls: 'toml-value', text: this.formatValue(value) });
    }

    for (const [key, obj] of nested) {
      const sectionLabel = prefix ? `${prefix}.${key}` : key;
      const headerRow = tbody.createEl('tr', { cls: 'toml-section-header' });
      const headerCell = headerRow.createEl('td', { attr: { colspan: '2' } });
      headerCell.createEl('span', { cls: 'toml-section-label', text: `[${sectionLabel}]` });

      for (const [subKey, subValue] of Object.entries(obj)) {
        if (subValue !== null && typeof subValue === 'object' && !Array.isArray(subValue) && !(subValue instanceof Date)) {
          const nestedHeaderRow = tbody.createEl('tr', { cls: 'toml-section-header' });
          const nestedHeaderCell = nestedHeaderRow.createEl('td', { attr: { colspan: '2' } });
          nestedHeaderCell.createEl('span', { cls: 'toml-section-label', text: `[${sectionLabel}.${subKey}]` });
          for (const [deepKey, deepValue] of Object.entries(subValue as Record<string, any>)) {
            const row = tbody.createEl('tr');
            row.createEl('td', { cls: 'toml-key toml-nested-key', text: deepKey });
            row.createEl('td', { cls: 'toml-value', text: this.formatValue(deepValue) });
          }
        } else {
          const row = tbody.createEl('tr');
          row.createEl('td', { cls: 'toml-key toml-nested-key', text: subKey });
          row.createEl('td', { cls: 'toml-value', text: this.formatValue(subValue) });
        }
      }
    }
  }

  private renderRaw(container: HTMLElement): void {
    const rawSection = container.createEl('div', { cls: 'toml-raw-section' });
    rawSection.createEl('strong', { text: 'Raw TOML:' });
    rawSection.createEl('pre', { cls: 'toml-raw', text: this.parsed.raw });
  }

  private formatValue(value: any): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return String(value);
    if (value instanceof Date) return value.toISOString().split('T')[0];
    if (Array.isArray(value)) return value.map(v => this.formatValue(v)).join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }
}
