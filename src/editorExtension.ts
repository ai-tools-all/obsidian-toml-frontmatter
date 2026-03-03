import { StateField, Transaction, RangeSet } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, WidgetType } from '@codemirror/view';
import { App, Notice, editorLivePreviewField } from 'obsidian';
import { parseTomlFrontmatter } from './tomlFrontmatter';
import { applyTomlChange } from './tomlWriter';
import { buildPropertiesDOM } from './ui';
import { PluginSettings, OnPropertyChange, ChangeAction, TomlValue } from './types';

let pluginSettings: PluginSettings;
let pluginApp: App | null = null;
let interacting = false;

export function setEditorSettings(settings: PluginSettings, app?: App): void {
  pluginSettings = settings;
  if (app) pluginApp = app;
}

class TomlWidget extends WidgetType {
  constructor(private raw: string, private delimiter: string) {
    super();
  }

  eq(other: TomlWidget): boolean {
    return this.raw === other.raw;
  }

  toDOM(): HTMLElement {
    const container = createDiv();
    const parsed = parseTomlFrontmatter(this.raw, this.delimiter);

    let onUpdate: OnPropertyChange | undefined;
    if (pluginApp) {
      const app = pluginApp;
      const file = app.workspace.getActiveFile();
      if (file) {
        onUpdate = (keyPath: string[], value: TomlValue | undefined, action: 'update' | 'delete' | 'add'): void => {
          app.vault.read(file).then((content: string) => {
            try {
              const change: ChangeAction =
                action === 'delete'
                  ? { type: 'delete', keyPath }
                  : { type: action, keyPath, value: value as TomlValue };
              const updated = applyTomlChange(content, change, this.delimiter);
              app.vault.modify(file, updated);
            } catch (err) {
              new Notice(`Failed to update: ${err instanceof Error ? err.message : String(err)}`);
            }
          });
        };
      }
    }

    container.addEventListener('mousedown', () => { interacting = true; });
    container.addEventListener('focusout', (e: FocusEvent) => {
      const related = e.relatedTarget;
      if (!related || !(related instanceof Node) || !container.contains(related)) {
        interacting = false;
      }
    });

    buildPropertiesDOM(container, parsed, pluginSettings, onUpdate);
    return container;
  }

  get estimatedHeight(): number {
    return 100;
  }

  ignoreEvent(event: Event): boolean {
    if (event.type === 'mousedown' || event.type === 'input' || event.type === 'change') {
      return false;
    }
    return true;
  }
}

function buildDecorations(state: any): DecorationSet {
  if (!pluginSettings?.enabledInLivePreview) return Decoration.none;

  const isLivePreview = state.field(editorLivePreviewField, false);
  if (!isLivePreview) return Decoration.none;

  const doc = state.doc;
  const text = doc.toString();
  const delimiter = pluginSettings.delimiter || '+++';
  const lines = text.split('\n');

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

  if (openLine === -1 || closeLine === -1) return Decoration.none;
  if (openLine !== 0) return Decoration.none;

  const cursor = state.selection.main;
  const from = doc.line(openLine + 1).from;
  const to = doc.line(closeLine + 1).to;

  if (cursor.from >= from && cursor.to <= to && !interacting) {
    return Decoration.none;
  }

  const deco = Decoration.replace({
    widget: new TomlWidget(text, delimiter),
    block: true,
  });

  return RangeSet.of([deco.range(from, to)]);
}

export const tomlEditorField = StateField.define<DecorationSet>({
  create(state) {
    return buildDecorations(state);
  },

  update(value: DecorationSet, tr: Transaction): DecorationSet {
    if (tr.docChanged || tr.selection) {
      return buildDecorations(tr.state);
    }
    return value.map(tr.changes);
  },

  provide(field) {
    return EditorView.decorations.from(field);
  },
});
