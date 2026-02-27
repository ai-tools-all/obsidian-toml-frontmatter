import { Plugin, Notice, TFile, MarkdownView } from 'obsidian';
import { parseTomlFrontmatter } from './tomlFrontmatter';
import { TomlCard } from './ui';
import { PluginSettingsTab } from './settings';
import { DEFAULT_SETTINGS, ParsedToml, PluginSettings } from './types';
import { tomlEditorField, setEditorSettings } from './editorExtension';

export default class MdProcessorTomlPlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS;
  private cache: Map<string, ParsedToml> = new Map();
  private debounceTimer: NodeJS.Timeout | null = null;

  async onload(): Promise<void> {
    console.log('Loading md-processor-toml plugin');

    await this.loadSettings();

    this.addSettingTab(new PluginSettingsTab(this.app, this));

    setEditorSettings(this.settings);
    this.registerEditorExtension([tomlEditorField]);

    this.registerMarkdownPostProcessor(async (el, ctx) => {
      if (!this.settings.enabledInReadingView) return;

      const sourcePath = ctx.sourcePath;
      if (!sourcePath) return;

      let parsed = this.cache.get(sourcePath);
      if (!parsed) {
        const file = this.app.vault.getAbstractFileByPath(sourcePath);
        if (!(file instanceof TFile)) return;
        try {
          const content = await this.app.vault.cachedRead(file);
          parsed = parseTomlFrontmatter(content, this.settings.delimiter);
          this.cache.set(sourcePath, parsed);
        } catch {
          return;
        }
      }

      if (!parsed || parsed.endLine < 0) return;
      if (!parsed.data && !parsed.error) return;

      const sectionInfo = ctx.getSectionInfo(el);
      if (!sectionInfo) return;

      if (sectionInfo.lineStart > parsed.endLine) return;

      if (sectionInfo.lineStart === 0) {
        const card = new TomlCard(el, parsed, this.settings);
        card.onload();
      } else {
        el.empty();
        el.style.display = 'none';
      }
    });

    this.registerEvent(
      this.app.workspace.on('file-open', async (file) => {
        if (!file) return;
        await this.updateCache(file.path);
      }),
    );

    this.registerEvent(
      this.app.vault.on('modify', (file) => {
        if (file.path) {
          if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
          }
          this.debounceTimer = setTimeout(async () => {
            await this.updateCache(file.path);
            this.rerenderActiveView();
          }, 300);
        }
      }),
    );

    this.addCommand({
      id: 'toggle-toml-frontmatter',
      name: 'Toggle TOML frontmatter panel',
      callback: async () => {
        this.settings.enabledInReadingView = !this.settings.enabledInReadingView;
        await this.saveSettings();
        new Notice(
          this.settings.enabledInReadingView
            ? 'TOML frontmatter enabled'
            : 'TOML frontmatter disabled',
        );
      },
    });

    this.app.workspace.onLayoutReady(async () => {
      const activeFile = this.app.workspace.getActiveFile();
      if (activeFile) {
        await this.updateCache(activeFile.path);
      }
    });
  }

  onunload(): void {
    console.log('Unloading md-processor-toml plugin');
    this.cache.clear();
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }

  private async updateCache(filePath: string): Promise<void> {
    try {
      const file = this.app.vault.getAbstractFileByPath(filePath);
      if (!(file instanceof TFile)) return;

      const content = await this.app.vault.cachedRead(file);
      const parsed = parseTomlFrontmatter(content, this.settings.delimiter);
      this.cache.set(filePath, parsed);
    } catch (err) {
      console.error(`Error updating cache for ${filePath}:`, err);
    }
  }

  private rerenderActiveView(): void {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (view) {
      view.previewMode?.rerender(true);
    }
  }

  async loadSettings(): Promise<void> {
    const saved = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, saved);
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    setEditorSettings(this.settings);
  }
}
