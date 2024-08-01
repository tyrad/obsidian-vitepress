import {App, PluginSettingTab, Setting} from "obsidian";
import ObsidianPlugin from "../main";
import * as fs from 'fs';

type PublishedContentType = { isFolder: boolean, name: string }

export interface MyPluginSettings {
	publishedContentList: PublishedContentType[];
	showRibbonIconButton: boolean;
	needCleanDirFolder: boolean;
	vitepressDir: string;
	vitepressSrcDir: string;
	vitepressStaticDir: string;
	deployScriptPath: string;
	ignoreFileRegex: string
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
	publishedContentList: [],
	needCleanDirFolder: false,
	showRibbonIconButton: true,
	vitepressDir: '',
	vitepressSrcDir: '',
	vitepressStaticDir: '',
	deployScriptPath: './publish.sh',
	ignoreFileRegex: '^_',
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

		new Setting(containerEl)
			.setName('发布内容')
			.setDesc('在当前obsidian文档中，选择需要复制到vitepress目录的一级目录或文件')
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
			const folderWrapBox = createEl('div', {
				cls: ['vite-press-publisher-folder-config']
			});
			const fileWrapBox = createEl('div', {
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
			containerEl.append(folderWrapBox);
			containerEl.append(fileWrapBox);
		}

		new Setting(this.containerEl).setName("目录设置").setHeading();

		new Setting(containerEl)
			.setName("vitepress目录路径")
			.setDesc('请填写绝对路径')
			.addText(text => {
				text.inputEl.style.flex = '1';
				text.inputEl.style.maxWidth = '250px';
				return text
					.setPlaceholder('')
					.setValue(this.plugin.settings.vitepressDir)
					.onChange(async (value) => {
						this.plugin.settings.vitepressDir = value;
						await this.plugin.saveData(this.plugin.settings);
					});
			});

		new Setting(containerEl)
			.setName("vitepress的srcDir路径")
			.setDesc('请填写绝对路径')
			.addText(text => {
				text.inputEl.style.flex = '1';
				text.inputEl.style.maxWidth = '250px';
				return text
					.setPlaceholder('')
					.setValue(this.plugin.settings.vitepressSrcDir)
					.onChange(async (value) => {
						this.plugin.settings.vitepressSrcDir = value;
						await this.plugin.saveData(this.plugin.settings);
					});
			});


		new Setting(containerEl)
			.setName('高级设置')
			.addExtraButton((cb) => {
				// 内置icon见： https://lucide.dev/icons/
				cb.setIcon(!this.showFolderAdvanceButton ? "up-chevron-glyph" : 'down-chevron-glyph')
					.onClick(() => {
						this.showFolderAdvanceButton = !this.showFolderAdvanceButton;
						this.display();
					});
			})
		if (this.showFolderAdvanceButton) {

			new Setting(containerEl)
				.setName("执行命令时,先清空srcDir目录")
				.setDesc('vitepress执行预览或者编译时,是否先清空srcDir目录,再执行其他操作')
				.addToggle((toggle) => {
					toggle
						.setValue(this.plugin.settings.needCleanDirFolder)
						.onChange(async (needCleanDirFolder) => {
							this.plugin.settings.needCleanDirFolder = needCleanDirFolder;
							await this.plugin.saveData(this.plugin.settings);
							this.plugin.reloadRibbonIcon();
							this.updateWarningText();
						});
				})
				.setClass('obsidian-setting-sub')

			new Setting(containerEl)
				.setName("vitepress的固定文件目录")
				.setDesc('请填写绝对路径\n如果设置了,执行命令时,此目录的内容将复制到srcDir目录')
				.addText(text => {
					text.inputEl.style.flex = '1';
					text.inputEl.style.maxWidth = '250px';
					return text
						.setPlaceholder('')
						.setValue(this.plugin.settings.vitepressStaticDir)
						.onChange(async (value) => {
							this.plugin.settings.vitepressStaticDir = value;
							await this.plugin.saveData(this.plugin.settings);
							this.updateWarningText();
						});
				})
				.setClass('obsidian-setting-sub')

			new Setting(containerEl)
				.setName("过滤obsidian文件或目录")
				.setDesc('过滤文件名满足该正则表达式的文件,如果不填,则不进行过滤')
				.addText(text => {
					text.inputEl.style.flex = '1';
					text.inputEl.style.maxWidth = '250px';
					return text
						.setPlaceholder('请输入正则表达式')
						.setValue(this.plugin.settings.ignoreFileRegex)
						.onChange(async (value) => {
							this.plugin.settings.ignoreFileRegex = value;
							await this.plugin.saveData(this.plugin.settings);
							this.updateWarningText();
						})
				})
				.setClass('obsidian-setting-sub');
		}
	}

	updateWarningText() {
		const ele = document.getElementsByClassName('obsidian-setting-warningtext-misj')[0]
		if (ele) {
			ele.remove()
		}
		this.appendWarningText(`根据当前配置，执行预览或者编译时，将执行如下操作:
${this.plugin.settings.needCleanDirFolder ? '- 首先会清空srcDir目录\n' : ''}${this.plugin.settings.vitepressStaticDir ? '- 将配置的固定文件目录内的文件移动到srcDir目录\n' : ''}- 将发布内容移动到srcDir目录${this.plugin.settings.ignoreFileRegex ? `(过滤文件名满足正则表达式${this.plugin.settings.ignoreFileRegex}的文件)` : ''}`, ['obsidian-setting-warningtext-misj'])
	}

	publishSetting() {
		const {containerEl} = this;
		new Setting(containerEl).setName("发布设置").setHeading();
		new Setting(containerEl)
			.setName("发布脚本")
			.setDesc('请输入发布脚本的绝对路径或相对vitepress目录的路径')
			.addText(text => text
				.setPlaceholder('请输入发布脚本的路径,当前路径为插件路径')
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
				if (file.name != '.obsidian' && file.name != '.DS_Store') {
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
		const warning = createEl('div', {
			cls: ['vitepress-setting-warning', ...classList],
		});
		warning.innerHTML = `<span>${text}</span>`
		this.containerEl.append(warning)
	}

	private addMultiSelectItem(superNode: Element, title: string, isEnabled: boolean, isFolder: boolean) {
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
