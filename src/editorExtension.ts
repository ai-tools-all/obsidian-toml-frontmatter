import { StateField, Transaction, RangeSet } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, WidgetType } from '@codemirror/view';
import { editorLivePreviewField } from 'obsidian';
import { parseTomlFrontmatter } from './tomlFrontmatter';
import { buildPropertiesDOM } from './ui';
import { PluginSettings } from './types';

let pluginSettings: PluginSettings;

export function setEditorSettings(settings: PluginSettings): void {
  pluginSettings = settings;
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
    buildPropertiesDOM(container, parsed, pluginSettings);
    return container;
  }

  get estimatedHeight(): number {
    return 100;
  }

  ignoreEvent(): boolean {
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

  if (cursor.from >= from && cursor.to <= to) {
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
