# md-processor-toml Plugin - Debug Context

## High Level Goal

Create an Obsidian plugin that:
- Detects TOML frontmatter (`+++...+++`) at the top of markdown notes
- Parses the TOML content
- Displays it as a **collapsible card** in Reading view with key-value table formatting
- Handles errors gracefully

## What Was Tried

1. ✅ Created TypeScript plugin structure with Vite build system
2. ✅ Implemented TOML parsing logic (`@iarna/toml` library)
3. ✅ Created UI rendering component (`MarkdownRenderChild`)
4. ✅ Added Markdown post-processor to inject card into Reading view
5. ✅ Built plugin files: `main.js`, `manifest.json`, `styles.css`
6. ✅ Created install script to deploy to Obsidian vault
7. ✅ Installed plugin to `~/.obsidian/plugins/md-processor-toml/`
8. ✅ Plugin appears in Community plugins list in Obsidian
9. ✅ Plugin is enabled/toggled on

## Current Issue

**Plugin shows as enabled but UI is not rendering properly**

Expected behavior:
- Open a note with TOML frontmatter (e.g., `sample-toml-file-to-view.md`)
- In **Reading view**, see a collapsible card at the top showing the TOML data as a table

Actual behavior:
- Plugin appears in Community plugins list ✓
- Plugin can be toggled on/off ✓
- **But**: The TOML card UI is NOT appearing in Reading view
- Text just shows as raw "TOML Frontmatter" instead of the formatted card

## Possible Causes

1. **Post-processor not registering** - The markdown post-processor hook may not be firing
2. **Cache not populating** - File content not being read/cached properly
3. **File-open event not triggering** - Cache update not happening when files open
4. **MarkdownRenderChild not injecting DOM** - UI code may have errors
5. **Console errors** - Check browser console (Ctrl+Shift+I) for JavaScript errors

## Debugging Steps

```bash
# Check browser console for errors
# Ctrl+Shift+I (Windows/Linux) or Cmd+Option+I (Mac)
# Look for red error messages in console

# Verify plugin files exist
ls -la ~/.obsidian/plugins/md-processor-toml/

# Check if manifest.json is valid JSON
cat ~/.obsidian/plugins/md-processor-toml/manifest.json | jq .

# Look at Obsidian logs (if available)
# On Linux: ~/.config/Obsidian/logs/
```

## Files to Inspect

- `src/main.ts` - Plugin entry point, event registration
- `src/ui.ts` - TomlCard component rendering
- `src/tomlFrontmatter.ts` - Parsing logic
- `dist/main.js` - Compiled output (check if it's valid)

## Next Action

Need to check:
1. Browser console for JavaScript errors
2. Whether file-open events are triggering the cache update
3. Whether the post-processor callback is being called
4. Whether the DOM is actually being modified

---

**Test file location**: `~/Downloads/experiments/learnings/sample-toml-file-to-view.md`
