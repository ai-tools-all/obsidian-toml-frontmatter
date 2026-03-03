## [0.3.0] - 2026-03-03

### 🚀 Features

- *(plugin)* Obsidian TOML frontmatter processor with collapsible card
- *(ui)* Redesign to match Obsidian native Properties view
- *(live-preview)* Add editor extension + robustness tests
- *(bases)* Inject TOML properties into metadataCache for Bases integration
- *(types)* Add strict TOML value type system
- Add tomlWriter module for frontmatter mutations
- Make property rows editable with onUpdate callback
- Wire both Reading View and Live Preview to vault.modify for CRUD

### 🐛 Bug Fixes

- *(manifest)* Update authorUrl to TwistingTwists
- Add error handling for vault.read rejection and interacting flag timeout
- Correct ignoreEvent to let editor ignore all widget events

### 🚜 Refactor

- Replace all any types with TomlValue/TomlTable
- Replace state: any with EditorState in buildDecorations

### 📚 Documentation

- Update install instructions to BRAT; set isDesktopOnly false

### ⚙️ Miscellaneous Tasks

- Add LICENSE, versions.json, release workflow, update README
- Add screenshot, set desktopOnly, update README hero section
- Center and resize screenshot in README
- *(release)* Bump version to 0.2.0 and generate changelog
- Init beads cli
- Add beads task tracker and release script
