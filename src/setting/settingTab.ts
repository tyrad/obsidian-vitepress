import {App, PluginSettingTab, Setting} from "obsidian";
import ObsidianPlugin from "../main";
import * as fs from 'fs';

export interface MyPluginSettings {
	publishedFolderList: string[];
	showRibbonIconButton: boolean;
	deployScriptPath: string;
	environmentVariables: { key: string, value: string }[];
	ignoreFileRegex: string
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
	publishedFolderList: [],
	showRibbonIconButton: true,
	deployScriptPath: './publish.sh',
	ignoreFileRegex: '^_',
	environmentVariables: [{key: '', value: ''}]
}

export class SettingTab extends PluginSettingTab {
	plugin: ObsidianPlugin;
	showExternalButton = true

	constructor(app: App, plugin: ObsidianPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();
		this.configBasicSetting();

		new Setting(this.containerEl).setName("发布设置").setHeading();

		new Setting(containerEl)
			.setName('发布目录')
			.setDesc('在obsidian文档目录中，选择哪些一级目录需要发布到vitepress')
			.addExtraButton((cb) => {
				// 内置icon见： https://lucide.dev/icons/
				cb.setIcon(!this.showExternalButton ? "up-chevron-glyph" : 'down-chevron-glyph')
					.onClick(() => {
						this.showExternalButton = !this.showExternalButton;
						this.display();
					});
			})
		if (this.showExternalButton) {
			const wrapBox = createEl('div', {
				cls: ['vite-press-publisher-folder-config']
			});
			const savedList = this.plugin.settings.publishedFolderList || [];
			this.loadFolder(list => {
				for (const x of list) {
					this.addMultiSelectItem(wrapBox, x, savedList.includes(x))
				}
			});
			containerEl.append(wrapBox);
		}

		new Setting(containerEl)
			.setName("发布脚本")
			.setDesc('请输入发布脚本的路径')
			.addText(text => text
				.setPlaceholder('请输入发布脚本的路径,当前路径为插件路径')
				.setValue(this.plugin.settings.deployScriptPath)
				.onChange(async (value) => {
					this.plugin.settings.deployScriptPath = value;
					await this.plugin.saveData(this.plugin.settings);
				}));

		new Setting(containerEl)
			.setName("过滤文件或目录")
			.setDesc('过滤文件名满足该正则表达式的文件,如果不填，则不进行过滤')
			.addText(text => text
				.setPlaceholder('请输入正则表达式')
				.setValue(this.plugin.settings.ignoreFileRegex)
				.onChange(async (value) => {
					this.plugin.settings.ignoreFileRegex = value;
					await this.plugin.saveData(this.plugin.settings);
				}));

		new Setting(containerEl)
			.setName("环境变量")
			.setDesc('请输入脚本用到的环境变量，若没用到，请忽略')

		const configList = this.plugin.settings.environmentVariables
		if (configList.length === 0) {
			this.plugin.settings.environmentVariables = [{key: '', value: ''}]
		}
		for (let i = 0; i < this.plugin.settings.environmentVariables.length; i++) {
			const o = this.plugin.settings.environmentVariables[i];
			new Setting(containerEl)
				.addText(text => {
					text.setPlaceholder('key')
						.setValue(o.key)
						.onChange(async value => {
							o.key = value
							await this.plugin.saveData(this.plugin.settings)
						})
				})
				.addText(text => {
					text.setPlaceholder("value")
						.setValue(o.value)
						.onChange(async value => {
							o.value = value
							await this.plugin.saveData(this.plugin.settings)
						})
				})
				.setClass('setting-item-info__hide')
				.addExtraButton(x => {
					x.setTooltip("新增")
						.setIcon('plus')
						.onClick(async () => {
							this.plugin.settings.environmentVariables.push({key: '', value: ''})
							await this.plugin.saveData(this.plugin.settings)
							this.display()
						})
				})
				.addExtraButton(x =>
					x.setTooltip("删除")
						.setIcon('delete')
						.onClick(async () => {
							this.plugin.settings.environmentVariables.splice(i, 1)
							await this.plugin.saveData(this.plugin.settings)
							this.display()
						})
				)
		}
	}

	private configBasicSetting() {
		const {containerEl} = this;
		new Setting(this.containerEl).setName("基本设置").setHeading();
		new Setting(containerEl)
			.setName("是否展示左侧栏按钮")
			.setDesc('是否展示左侧栏Ribbon Icon按钮')
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.showRibbonIconButton)
					.onChange(async (showRibbonIconButton) => {
						this.plugin.settings.showRibbonIconButton = showRibbonIconButton;
						await this.plugin.saveData(this.plugin.settings);
						this.plugin.reloadRibbonIcon();
					});
			});
	}

	private loadFolder(callback: ((list: string[]) => void)) {
		// @ts-ignore.
		const basePath = this.app.vault.adapter.basePath;
		fs.readdir(basePath, {withFileTypes: true}, (err, files) => {
			if (err) {
				console.error(err);
				return;
			}
			const folderList: string[] = []
			files.forEach(file => {
				if (file.isDirectory() && file.name != '.obsidian') {
					folderList.push(file.name)
				}
			});
			callback(folderList);
		});
	}

	private addMultiSelectItem(superNode: Element, title: string, isEnabled: boolean) {
		const checkbox = createEl('div', {
			cls: isEnabled ? ['checkbox-container is-enabled'] : ['checkbox-container'],
			attr: {'id-text': title}
		})
		checkbox.addEventListener("click", async () => {
			if (checkbox.classList.contains('is-enabled')) {
				checkbox.removeClass('is-enabled')
			} else {
				checkbox.addClass('is-enabled')
			}
			const all = superNode.querySelectorAll('.checkbox-container')
			const selectedList: string[] = [];
			for (const item of Array.from(all)) {
				if (item.classList.contains('is-enabled')) {
					const name = item.getAttribute('id-text')
					name && selectedList.push(name)
				}
			}
			this.plugin.settings.publishedFolderList = selectedList;
			await this.plugin.saveData(this.plugin.settings);
		});
		checkbox.style.marginLeft = '4px';

		const selectBox = createEl('div', {
			cls: ['setting-item-description', 'switch-box']
		});
		const text = createEl('div')
		text.innerHTML = title
		selectBox.append(text)
		selectBox.append(checkbox)

		superNode.append(selectBox)
	}
}
