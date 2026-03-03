import { Plugin, Notice, TFile, MarkdownView } from 'obsidian';
import { parseTomlFrontmatter } from './tomlFrontmatter';
import { applyTomlChange } from './tomlWriter';
import { TomlCard } from './ui';
import { PluginSettingsTab } from './settings';
import { DEFAULT_SETTINGS, ParsedToml, PluginSettings, OnPropertyChange, ChangeAction, TomlValue } from './types';
import { tomlEditorField, setEditorSettings } from './editorExtension';
import { MetadataPatch } from './metadataPatch';

export default class MdProcessorTomlPlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS;
  private cache: Map<string, ParsedToml> = new Map();
  private debounceTimer: NodeJS.Timeout | null = null;
  private metadataPatch: MetadataPatch | null = null;

  async onload(): Promise<void> {
    console.log('Loading md-processor-toml plugin');

    await this.loadSettings();

    this.addSettingTab(new PluginSettingsTab(this.app, this));

    setEditorSettings(this.settings, this.app);
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
        const card = new TomlCard(el, parsed, this.settings, this.createOnUpdate(sourcePath));
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
            if (this.metadataPatch && file instanceof TFile) {
              this.metadataPatch.notifyChanged(file);
            }
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

      if (this.settings.enableBasesIntegration) {
        this.metadataPatch = new MetadataPatch(this.app, this.cache, this.settings.delimiter);
        await this.metadataPatch.scanVault();
        this.metadataPatch.install();
      }
    });

    this.registerEvent(
      this.app.vault.on('create', async (file) => {
        if (file instanceof TFile && file.extension === 'md') {
          await this.updateCache(file.path);
          if (this.metadataPatch) {
            this.metadataPatch.notifyChanged(file);
          }
        }
      }),
    );

    this.registerEvent(
      this.app.vault.on('delete', (file) => {
        this.cache.delete(file.path);
      }),
    );
  }

  onunload(): void {
    console.log('Unloading md-processor-toml plugin');
    if (this.metadataPatch) {
      this.metadataPatch.uninstall();
      this.metadataPatch = null;
    }
    this.cache.clear();
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }

  private createOnUpdate(filePath: string): OnPropertyChange {
    return (keyPath: string[], value: TomlValue | undefined, action: 'update' | 'delete' | 'add'): void => {
      const file = this.app.vault.getAbstractFileByPath(filePath);
      if (!(file instanceof TFile)) return;

      this.app.vault.read(file).then((content: string) => {
        try {
          const change: ChangeAction =
            action === 'delete'
              ? { type: 'delete', keyPath }
              : { type: action, keyPath, value: value as TomlValue };
          const updated = applyTomlChange(content, change, this.settings.delimiter);
          this.app.vault.modify(file, updated);
        } catch (err) {
          new Notice(`Failed to update property: ${err instanceof Error ? err.message : String(err)}`);
        }
      }).catch((err: unknown) => {
        new Notice(`Failed to read file: ${err instanceof Error ? err.message : String(err)}`);
      });
    };
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
    setEditorSettings(this.settings, this.app);
    if (this.metadataPatch) {
      this.metadataPatch.setDelimiter(this.settings.delimiter);
    }
  }
}
