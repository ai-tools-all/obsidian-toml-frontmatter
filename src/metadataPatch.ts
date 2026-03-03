import { App, TFile, CachedMetadata, MetadataCache } from 'obsidian';
import { parseTomlFrontmatter } from './tomlFrontmatter';
import { ParsedToml } from './types';

const SCAN_BATCH_SIZE = 50;

export class MetadataPatch {
  private app: App;
  private cache: Map<string, ParsedToml>;
  private delimiter: string;
  private originalGetFileCache: ((file: TFile) => CachedMetadata | null) | null = null;
  private installed = false;

  constructor(app: App, cache: Map<string, ParsedToml>, delimiter: string) {
    this.app = app;
    this.cache = cache;
    this.delimiter = delimiter;
  }

  setDelimiter(delimiter: string): void {
    this.delimiter = delimiter;
  }

  async scanVault(): Promise<void> {
    const files = this.app.vault.getMarkdownFiles();
    for (let i = 0; i < files.length; i += SCAN_BATCH_SIZE) {
      const batch = files.slice(i, i + SCAN_BATCH_SIZE);
      await Promise.all(batch.map((f) => this.indexFile(f)));
      if (i + SCAN_BATCH_SIZE < files.length) {
        await sleep(0);
      }
    }
  }

  private async indexFile(file: TFile): Promise<void> {
    if (this.cache.has(file.path)) return;
    try {
      const content = await this.app.vault.cachedRead(file);
      const trimmed = content.trimStart();
      if (!trimmed.startsWith(this.delimiter)) return;
      const parsed = parseTomlFrontmatter(content, this.delimiter);
      if (parsed.data) {
        this.cache.set(file.path, parsed);
      }
    } catch {
      // skip unreadable files
    }
  }

  install(): void {
    if (this.installed) return;
    const mc = this.app.metadataCache;
    this.originalGetFileCache = mc.getFileCache.bind(mc);
    const self = this;

    mc.getFileCache = function patchedGetFileCache(file: TFile): CachedMetadata | null {
      const result = self.originalGetFileCache!(file);
      const toml = self.cache.get(file.path);
      if (!toml?.data) return result;
      return self.mergeTomlInto(result, toml.data);
    };

    this.installed = true;
  }

  uninstall(): void {
    if (!this.installed || !this.originalGetFileCache) return;
    this.app.metadataCache.getFileCache = this.originalGetFileCache;
    this.originalGetFileCache = null;
    this.installed = false;
  }

  notifyChanged(file: TFile): void {
    if (!this.installed) return;
    this.app.metadataCache.trigger('changed', file);
  }

  private mergeTomlInto(
    original: CachedMetadata | null,
    tomlData: Record<string, any>,
  ): CachedMetadata | null {
    if (!original) {
      return { frontmatter: { ...tomlData, position: { start: { line: 0, col: 0, offset: 0 }, end: { line: 0, col: 0, offset: 0 } } } } as CachedMetadata;
    }
    const merged = { ...original };
    if (original.frontmatter) {
      merged.frontmatter = { ...original.frontmatter, ...tomlData };
    } else {
      merged.frontmatter = {
        ...tomlData,
        position: { start: { line: 0, col: 0, offset: 0 }, end: { line: 0, col: 0, offset: 0 } },
      } as any;
    }
    return merged;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
