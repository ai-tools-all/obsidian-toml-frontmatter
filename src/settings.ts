import { App, PluginSettingTab, Setting } from 'obsidian';
import MdProcessorTomlPlugin from './main';
import { PluginSettings } from './types';

export class PluginSettingsTab extends PluginSettingTab {
  plugin: MdProcessorTomlPlugin;

  constructor(app: App, plugin: MdProcessorTomlPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl('h2', { text: 'TOML Frontmatter Settings' });

    new Setting(containerEl)
      .setName('Delimiter')
      .setDesc('Character(s) that mark the start/end of TOML frontmatter')
      .addText((text) =>
        text
          .setPlaceholder('+++')
          .setValue(this.plugin.settings.delimiter)
          .onChange(async (value) => {
            this.plugin.settings.delimiter = value || '+++';
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName('Default Collapsed')
      .setDesc('Display TOML card collapsed by default')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.defaultCollapsed)
          .onChange(async (value) => {
            this.plugin.settings.defaultCollapsed = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName('Render Mode')
      .setDesc('How to display the TOML frontmatter')
      .addDropdown((dropdown) =>
        dropdown
          .addOption('table', 'Table')
          .addOption('raw', 'Raw TOML')
          .addOption('both', 'Both (Table + Raw)')
          .setValue(this.plugin.settings.renderMode)
          .onChange(async (value) => {
            this.plugin.settings.renderMode = value as any;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName('Enabled in Reading View')
      .setDesc('Show TOML card in Reading view')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enabledInReadingView)
          .onChange(async (value) => {
            this.plugin.settings.enabledInReadingView = value;
            await this.plugin.saveSettings();
          }),
      );
  }
}
