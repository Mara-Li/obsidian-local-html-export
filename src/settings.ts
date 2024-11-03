import { type App, PluginSettingTab, Setting } from "obsidian";
import type LocalHtmlExport from "./main";
import type {LocalHtmlSettings} from "./interfaces";

export class LocalHtmlSettingTab extends PluginSettingTab {
	plugin: LocalHtmlExport;
	settings: LocalHtmlSettings;

	constructor(app: App, plugin: LocalHtmlExport) {
		super(app, plugin);
		this.plugin = plugin;
		this.settings = plugin.settings;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Export frontmatter")
			.setDesc("Add the frontmatter in the generated HTML. Don't really support the state of check and some values")
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.exportFrontmatter)
					.onChange(async (value) => {
						this.settings.exportFrontmatter = value;
						await this.plugin.saveSettings();
					});
			});
	}
}
