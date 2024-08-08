import {App, PluginSettingTab, Setting} from "obsidian";
import ObsidianPlugin from "../main";
import * as fs from 'fs';
import i18next from "i18next";

type PublishedContentType = { isFolder: boolean, name: string }

export interface VitepressPluginSettings {
	publishedContentList: PublishedContentType[];
	needCleanDirFolder: boolean;
	vitepressDir: string;
	vitepressSrcDir: string;
	vitepressStaticDir: string;
	deployScriptPath: string;
	ignoreFileRegex: string;
	autoSyncMdFile: boolean;
}

export const DEFAULT_SETTINGS: VitepressPluginSettings = {
	publishedContentList: [],
	needCleanDirFolder: false,
	vitepressDir: '',
	vitepressSrcDir: '',
	vitepressStaticDir: '',
	deployScriptPath: '',
	ignoreFileRegex: '^_',
	autoSyncMdFile: true
}

export class SettingTab extends PluginSettingTab {
	plugin: ObsidianPlugin;
	showExternalButton = true
	showFolderAdvanceButton = true

	constructor(app: App, plugin: ObsidianPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();
		this.configBasicSetting();
		this.publishSetting();
		this.updateWarningText();
	}

	private configBasicSetting() {
		const {containerEl} = this;
		new Setting(this.containerEl).setName(i18next.t('basic-setting')).setHeading();
		new Setting(containerEl)
			.setName(i18next.t('publish-content'))
			.setDesc(i18next.t('publish-content-desc'))
			.addExtraButton((cb) => {
				// 内置icon见： https://lucide.dev/icons/
				cb.setIcon(!this.showExternalButton ? "up-chevron-glyph" : 'down-chevron-glyph')
					.onClick(() => {
						this.showExternalButton = !this.showExternalButton;
						this.display();
					});
			})

		if (this.showExternalButton) {
			const savedList = this.plugin.settings.publishedContentList || [];
			const folderWrapBox = containerEl.createEl('div', {
				cls: ['vite-press-publisher-folder-config']
			});
			const fileWrapBox = containerEl.createEl('div', {
				cls: ['vite-press-publisher-folder-config']
			});
			this.loadFolder(list => {
				const folderList = list.filter(item => item.isDir);
				const fileList = list.filter(item => !item.isDir);
				for (const x of folderList) {
					const contain = savedList.some(item => item.isFolder && item.name == x.name)
					this.addMultiSelectItem(folderWrapBox, x.name, contain, true)
				}
				for (const x of fileList) {
					const contain = savedList.some(item => !item.isFolder && item.name == x.name)
					this.addMultiSelectItem(fileWrapBox, x.name, contain, false)
				}
			});
		}

		new Setting(this.containerEl).setName(i18next.t("folder-setting")).setHeading();

		new Setting(containerEl)
			.setName(i18next.t("vitepress-folder-path"))
			.setDesc(i18next.t('need-absolute-path'))
			.addText(text => {
				text.inputEl.classList.add('vitepress-setting-max-width')
				return text
					.setPlaceholder('')
					.setValue(this.plugin.settings.vitepressDir)
					.onChange(async (value) => {
						this.plugin.settings.vitepressDir = value;
						await this.plugin.saveData(this.plugin.settings);
					});
			})
			.setClass('obsidian-setting-required');

		new Setting(containerEl)
			.setName(i18next.t("vitepress-srcDir-path"))
			.setDesc(i18next.t('need-absolute-path'))
			.addText(text => {
				text.inputEl.classList.add('vitepress-setting-max-width')
				return text
					.setPlaceholder('')
					.setValue(this.plugin.settings.vitepressSrcDir)
					.onChange(async (value) => {
						this.plugin.settings.vitepressSrcDir = value;
						await this.plugin.saveData(this.plugin.settings);
					});
			})
			.setClass('obsidian-setting-required');

		new Setting(this.containerEl).setName(i18next.t("adv-settings")).setHeading();

		new Setting(containerEl)
			.setName(i18next.t("clean-src-dir"))
			.setDesc(i18next.t('clean-src-dir-desc'))
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.needCleanDirFolder)
					.onChange(async (needCleanDirFolder) => {
						this.plugin.settings.needCleanDirFolder = needCleanDirFolder;
						await this.plugin.saveData(this.plugin.settings);
						this.updateWarningText();
					});
			})

		new Setting(containerEl)
			.setName(i18next.t("vitepress-fixed-dir"))
			.setDesc(i18next.t('vitepress-fixed-dir-desc'))
			.addText(text => {
				text.inputEl.classList.add('vitepress-setting-max-width')
				return text
					.setPlaceholder('')
					.setValue(this.plugin.settings.vitepressStaticDir)
					.onChange(async (value) => {
						this.plugin.settings.vitepressStaticDir = value;
						await this.plugin.saveData(this.plugin.settings);
						this.updateWarningText();
					});
			})

		new Setting(containerEl)
			.setName(i18next.t("filter-doc"))
			.setDesc(i18next.t('filter-doc-desc'))
			.addText(text => {
				text.inputEl.classList.add('vitepress-setting-max-width')
				return text
					.setPlaceholder(i18next.t('enter-regex'))
					.setValue(this.plugin.settings.ignoreFileRegex)
					.onChange(async (value) => {
						this.plugin.settings.ignoreFileRegex = value;
						await this.plugin.saveData(this.plugin.settings);
						this.updateWarningText();
					})
			})

		new Setting(containerEl)
			.setName(i18next.t('auto-sync-md'))
			.setDesc(i18next.t('auto-sync-md-desc'))
			.addToggle(toggle => {
				return toggle
					.setValue(this.plugin.settings.autoSyncMdFile)
					.onChange(async (value) => {
						this.plugin.settings.autoSyncMdFile = value;
						await this.plugin.saveData(this.plugin.settings);
					})
			})
	}

	updateWarningText() {
		const ele = document.getElementsByClassName('vitepress-setting-warningtext')[0]
		if (ele) {
			ele.remove()
		}
		const tip = i18next.t('plugin-action-tip')
		this.appendWarningText(`${tip}:
${this.plugin.settings.needCleanDirFolder ? `- ${i18next.t('plugin-action-tip-clean-dir')}` : ''}${this.plugin.settings.vitepressStaticDir ? `- ${i18next.t('plugin-action-tip-move-to-src-dir')}` : ''}- ${i18next.t('plugin-action-tip-public-move-to-src-dir')}${this.plugin.settings.ignoreFileRegex ? `(${i18next.t('plugin-action-tip-filter-by-regex', {regex: `${this.plugin.settings.ignoreFileRegex}`})})` : ''}`, ['vitepress-setting-warningtext'])
	}

	publishSetting() {
		const {containerEl} = this;
		new Setting(containerEl).setName(i18next.t("publish-setting")).setHeading();
		new Setting(containerEl)
			.setName(i18next.t(("publish-script")))
			.setDesc(i18next.t('publish-script-desc'))
			.addText(text => text
				.setValue(this.plugin.settings.deployScriptPath)
				.onChange(async (value) => {
					this.plugin.settings.deployScriptPath = value;
					await this.plugin.saveData(this.plugin.settings);
				}));
	}

	private loadFolder(callback: ((list: { name: string, isDir: boolean }[]) => void)) {
		// @ts-ignore.
		const basePath = this.app.vault.adapter.basePath;
		fs.readdir(basePath, {withFileTypes: true}, (err, files) => {
			if (err) {
				console.error(err);
				return;
			}
			const folderList: { name: string, isDir: boolean }[] = []
			files.forEach(file => {
				if (file.name != '.DS_Store' && file.name != this.app.vault.configDir) {
					folderList.push({
						name: file.name,
						isDir: file.isDirectory()
					})
				}
			});
			callback(folderList);
		});
	}

	private appendWarningText(text: string, classList: string[]) {
		const warning = this.containerEl.createEl('div', {
			cls: ['vitepress-setting-warning', ...classList],
		});
		warning.createSpan({text})
	}

	private addMultiSelectItem(superNode: Element, title: string, isEnabled: boolean, isFolder: boolean) {
		const selectBox = superNode.createEl('div', {
			cls: ['setting-item-description', 'switch-box']
		});
		selectBox.createDiv({text: title})

		const checkbox = selectBox.createEl('div', {
			cls: isEnabled ? ['checkbox-container is-enabled vitepress-ml-4'] : ['checkbox-container vitepress-ml-4'],
			attr: {'id-text': title}
		})
		checkbox.addEventListener("click", async () => {
			if (checkbox.classList.contains('is-enabled')) {
				checkbox.removeClass('is-enabled')
			} else {
				checkbox.addClass('is-enabled')
			}
			const all = superNode.querySelectorAll('.checkbox-container')
			const selectedList: PublishedContentType[] = [];
			for (const item of Array.from(all)) {
				if (item.classList.contains('is-enabled')) {
					const name = item.getAttribute('id-text')
					name && selectedList.push({
						name: name,
						isFolder
					})
				}
			}
			this.plugin.settings.publishedContentList = this.plugin.settings.publishedContentList.filter(item => item.isFolder != isFolder);
			this.plugin.settings.publishedContentList.push(...selectedList);
			await this.plugin.saveData(this.plugin.settings);
		});
	}
}
