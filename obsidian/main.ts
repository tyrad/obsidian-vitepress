import {App, setIcon, Plugin, addIcon, PluginManifest} from 'obsidian';
import {DEFAULT_SETTINGS, MyPluginSettings, SettingTab} from "./setting/settingTab";
import {VitePressCmd} from "./vitepressCmd/vitePressCmd";
import {ICON_NAME, ICON_SVG_CLOSE, ICON_SVG_PREVIEW} from "./static/icons";

export default class ObsidianPlugin extends Plugin {

	previewRibbonIconEl: HTMLElement | null = null

	vitePressCmd: VitePressCmd
	settingTab: SettingTab
	settings: MyPluginSettings;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
		this.vitePressCmd = new VitePressCmd(app, this);
		this.settingTab = new SettingTab(this.app, this)
	}

	async onload() {

		addIcon(ICON_NAME, ICON_SVG_CLOSE);

		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

		this.reloadRibbonIcon()

		this.addCommand({
			id: 'open-log-modal',
			name: 'Show log',
			callback: () => {
				this.vitePressCmd.consoleModal.open();
			}
		});

		this.addCommand({
			id: 'vitepress-build',
			name: 'vitepress build',
			callback: () => {
				this.vitePressCmd.build();
			}
		});

		this.addCommand({
			id: 'vitepress-preview',
			name: 'vitepress preview',
			callback: () => {
				this.vitePressCmd.preview();
			}
		});

		this.addCommand({
			id: 'vitepress-build-preview',
			name: 'vitepress build and preview',
			callback: () => {
				this.vitePressCmd.buildAndPreview();
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

		this.addSettingTab(this.settingTab);

		this.handleViewActionButton(true);
		this.app.workspace.on("layout-change", () => {
			this.handleViewActionButton(true);
		})
	}

	reloadRibbonIcon() {
		if (this.settings.showRibbonIconButton) {
			this.previewRibbonIconEl = this.addRibbonIcon(this.vitePressCmd.devChildProcess == null ? ICON_NAME : ICON_SVG_PREVIEW, '点击启动vitepress', (evt: MouseEvent) => {
				this.vitePressCmd.previewOrClose(this.previewRibbonIconEl)
			});
		} else {
			this.previewRibbonIconEl?.remove()
			this.previewRibbonIconEl = null
		}
	}

	private handleViewActionButton(needAddIcon: boolean) {
		activeWindow.requestAnimationFrame(() =>
			this.app.workspace.iterateAllLeaves((leaf) => {
					const activeLeaf = leaf?.view.containerEl;
					const viewAction = activeLeaf?.getElementsByClassName('view-actions')[0];
					if (!viewAction) {
						return
					}
					const buttonClass = 'vitepress-view-action-preview-file'
					const existedButtons = viewAction.getElementsByClassName(buttonClass)
					for (const button of Array.from(existedButtons)) {
						button.detach();
					}
					if (!needAddIcon) {
						return
					}
					const buttonIcon = createEl('a', {
						cls: ['view-action', 'clickable-icon', buttonClass],
						attr: {'aria-label-position': 'bottom', 'aria-label': '在vitepress中预览'},
					});
					setIcon(buttonIcon, ICON_NAME);
					viewAction.prepend(buttonIcon);
					this.registerDomEvent(buttonIcon, 'mousedown', evt => {
						if (evt.button === 0) {
							setTimeout(() => {
								this.vitePressCmd.openBrowser();
							}, 5);
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
