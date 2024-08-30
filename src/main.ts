import {App, setIcon, Plugin, addIcon, PluginManifest} from 'obsidian';
import {DEFAULT_SETTINGS, VitepressPluginSettings, SettingTab} from "./setting/settingTab";
import {VitepressCommand} from "./command/vitepressCommand";
import {ICON_NAME, ICON_NAME_ON_PREVIEW, ICON_SVG_CLOSE, ICON_SVG_PREVIEW} from "./static/icons";
import {resources, translationLanguage} from "./i18n/i18next";
import i18next from "i18next";

export default class ObsidianPlugin extends Plugin {

	previewRibbonIconEl: HTMLElement | null = null

	vitePressCmd: VitepressCommand
	settings: VitepressPluginSettings;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
		this.vitePressCmd = new VitepressCommand(app, this);
	}

	async onload() {
		await i18next.init({
			lng: translationLanguage,
			fallbackLng: "en",
			resources: resources,
			returnNull: false,
		});

		addIcon(ICON_NAME, ICON_SVG_CLOSE);
		addIcon(ICON_NAME_ON_PREVIEW, ICON_SVG_PREVIEW);

		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

		this.previewRibbonIconEl = this.addRibbonIcon(ICON_NAME, 'start vitepress', (evt: MouseEvent) => {
			this.vitePressCmd.previewOrClose(this.previewRibbonIconEl)
		});

		this.addCommand({
			id: 'vitepress-build',
			name: 'vitepress build (npm run docs:build)',
			callback: () => {
				this.vitePressCmd.build();
			}
		});

		this.addCommand({
			id: 'vitepress-preview',
			name: 'vitepress preview (npm run docs:preview)',
			callback: () => {
				this.vitePressCmd.preview();
			}
		});

		this.addCommand({
			id: 'vitepress-preview-close',
			name: 'vitepress preview close',
			callback: () => {
				this.vitePressCmd.closePreview();
			}
		});

		this.addCommand({
			id: 'vitepress-publish',
			name: 'vitepress publish',
			callback: () => {
				this.vitePressCmd.publish();
			}
		});

		this.addCommand({
			id: 'open-log-modal',
			name: 'Show log',
			callback: () => {
				this.vitePressCmd.consoleModal.open();
			}
		});

		this.addSettingTab(new SettingTab(this.app, this));

		this.handleViewActionButton(true);
		this.app.workspace.on("layout-change", () => {
			this.handleViewActionButton(true);
		})
	}

	private handleViewActionButton(needAddIcon: boolean) {
		activeWindow.requestAnimationFrame(() =>
			this.app.workspace.iterateAllLeaves((leaf) => {
					const leafViewEl = leaf?.view.containerEl;
					const viewAction = leafViewEl?.getElementsByClassName('view-actions')[0];
					if (!viewAction) {
						return
					}
					const buttonClass = 'vitepress-view-action-preview-file'
					const existedButtons = viewAction.getElementsByClassName(buttonClass)
					// 不需要按钮的时候全部移除掉
					if (!needAddIcon) {
						for (const button of Array.from(existedButtons)) {
							button.detach();
						}
						return
					}
					// 如果重复添加的按钮，删除多余的，并退出。不再创建
					if (existedButtons.length > 0) {
						const [, ...editionButton] = Array.from(existedButtons);
						for (const button of editionButton) {
							button.detach();
						}
						return
					}
					const buttonIcon = createEl('a', {
						cls: ['view-action', 'clickable-icon', buttonClass],
						attr: {'aria-label-position': 'bottom', 'aria-label': 'preview on vitepress'},
					});
					setIcon(buttonIcon, ICON_NAME);
					viewAction.prepend(buttonIcon);
					this.registerDomEvent(buttonIcon, 'mousedown', evt => {
						if (evt.button === 0) {
							this.vitePressCmd.openBrowser();
						}
					})
				}
			)
		);
	}

	onunload() {
		this.vitePressCmd.closeDev();
		this.vitePressCmd.closePreview();
		this.handleViewActionButton(false);
	}
}
