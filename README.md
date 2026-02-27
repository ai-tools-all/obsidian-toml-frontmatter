# md-processor-toml

An Obsidian plugin that detects and renders **TOML frontmatter** (`+++...+++`) as a collapsible card in Reading view.

## Features

- 📋 **Auto-detect TOML frontmatter** at the top of notes (Hugo-style `+++...+++` delimiters)
- 🎨 **Collapsible card UI** in Reading view with nice key-value table formatting
- ⚡ **Fast parsing** with in-memory caching keyed by file path
- ⛔ **Error handling** - parse errors displayed clearly without breaking the note
- ⚙️ **Configurable**:
  - Custom delimiter
  - Render mode (table only, raw TOML, or both)
  - Default collapsed/expanded state
  - Enable/disable in Reading view

## Usage

1. Add TOML frontmatter to the top of your note:

```markdown
+++
title = "My Note"
tags = ["obsidian", "toml"]
author = "John"
+++

# Your note content here...
```

2. Open the note in Reading view - the TOML card will appear at the top
3. Click the header to collapse/expand

## Installation

1. Clone this repo into your vault's plugin directory:
   ```bash
   git clone https://github.com/yourusername/md-processor-toml.git \
     /path/to/vault/.obsidian/plugins/md-processor-toml
   ```

2. Install dependencies with Bun:
   ```bash
   bun install
   ```

3. Build the plugin:
   ```bash
   bun run build
   ```

4. In Obsidian: Settings → Community plugins → disable Safe mode, then enable "TOML Frontmatter Processor"

## Development

```bash
# Install dependencies
bun install

# Start dev server (watches for changes)
bun run dev

# Build for production
bun run build

# Preview
bun run preview
```

## Settings

- **Delimiter**: Character(s) marking frontmatter (default: `+++`)
- **Default Collapsed**: Show card collapsed by default (default: `true`)
- **Render Mode**: Display format - Table, Raw TOML, or Both (default: `table`)
- **Enabled in Reading View**: Toggle the card display (default: `true`)

## Commands

- **Toggle TOML frontmatter panel**: Enable/disable the card in Reading view

## File Structure

```
src/
  ├── main.ts           # Plugin entry point, event wiring
  ├── tomlFrontmatter.ts # Parse & cache logic
  ├── ui.ts             # Card rendering
  ├── settings.ts       # Settings tab
  └── types.ts          # TypeScript types
styles.css             # Card styling
manifest.json          # Plugin metadata
vite.config.ts         # Vite build config
```

## Notes

- TOML frontmatter must be at the **very top** of the file (after optional BOM/whitespace)
- The plugin uses `@iarna/toml` for TOML parsing
- Caching is debounced on file modify (300ms) to avoid excessive parsing during typing
- Live Preview support planned for v0.2+

## License

MIT
