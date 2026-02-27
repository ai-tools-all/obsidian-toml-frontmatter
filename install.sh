#!/bin/bash

# Build and install md-processor-toml plugin into Obsidian vault
# Usage: ./install.sh /path/to/vault

set -e

VAULT_PATH="${1:-$HOME/Downloads/experiments/learnings}"
PLUGIN_NAME="md-processor-toml"
PLUGIN_DIR="$VAULT_PATH/.obsidian/plugins/$PLUGIN_NAME"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔧 Building $PLUGIN_NAME..."
cd "$SCRIPT_DIR"
npx vite build

echo ""
echo "📁 Installing to vault: $VAULT_PATH"

# Create plugin directory
mkdir -p "$PLUGIN_DIR"
echo "✓ Created plugin directory"

# Copy files
cp -f dist/main.js "$PLUGIN_DIR/"
echo "✓ Copied main.js"

cp -f manifest.json "$PLUGIN_DIR/"
echo "✓ Copied manifest.json"

cp -f styles.css "$PLUGIN_DIR/"
echo "✓ Copied styles.css"

echo ""
echo "✅ Installation complete!"
echo ""
echo "📝 Next steps:"
echo "1. Open Obsidian"
echo "2. Go to Settings → Community plugins"
echo "3. Disable Safe mode (if enabled)"
echo "4. Find and enable 'TOML Frontmatter Processor'"
echo ""
echo "🚀 For development mode (auto-rebuild on changes):"
echo "   cd $SCRIPT_DIR && bun run dev"
