import * as child_process from 'child_process';
import {App, Notice, setIcon, Platform} from "obsidian";
import {copyFileSyncRecursive, deleteFilesInDirectorySync, getCurrentMdFileRelativePath} from "../utils/pathUtils";
import {ConsoleModal, ConsoleType} from "../modal/consoleModal";
import {ICON_NAME, ICON_NAME_ON_PREVIEW} from "../static/icons";
import * as fs from "fs";
import ObsidianPlugin from "../main";
import open from 'open';
import stripAnsi from 'strip-ansi';
import i18next from "i18next";

export class VitepressCommand {
	kill = require('tree-kill');

	startedVitepressHostAddress = ''
	devChildProcess: child_process.ChildProcessWithoutNullStreams | null = null

	private readonly app: App;
	private readonly plugin: ObsidianPlugin;
	private readonly isWindowsPlatform = Platform.isWin
	private previewChildProcess: child_process.ChildProcessWithoutNullStreams | null = null
	private isRunning: undefined | boolean = undefined;

	consoleModal: ConsoleModal;

	getVitepressFolder() {
		return this.plugin.settings.vitepressDir;
	}

	constructor(app: App, plugin: ObsidianPlugin) {
		this.app = app;
		this.consoleModal = new ConsoleModal(app)
		this.plugin = plugin
		this.app.workspace.on('quit', () => {
			if (this.devChildProcess?.pid) {
				this.kill(this.devChildProcess.pid)
			}
			if (this.previewChildProcess?.pid) {
				this.kill(this.previewChildProcess.pid)
			}
		});
	}

	preview() {
		if (!this.checkSetting()) {
			return
		}
		this.consoleModal.open();
		if (this.previewChildProcess?.pid) {
			this.kill(this.previewChildProcess.pid)
		}
		this.previewChildProcess = child_process.spawn(`npm`, ['run', 'docs:preview'], this.getSpawnOptions());
		this.commonCommandOnRunning('[vitepress preview]', this.previewChildProcess, data => {
			const address = this.extractAddress(data.toString(), false)
			if (address) {
				this.openBrowserByUrl(address);
			}
		})
	}

	publish() {
		if (!this.checkSetting()) {
			return
		}
		this.consoleModal.open();
		const scriptPath = this.plugin.settings.deployScriptPath
		if (!scriptPath) {
			new Notice(i18next.t('publish-script-not-set'))
			return
		}
		this.consoleModal.appendLogResult(this.getVitepressFolder());
		let command;
		if (Platform.isWin) {
			command = `start cmd /k bash ${scriptPath}`;
		} else if (Platform.isMacOS) {
			// refer: https://segmentfault.com/q/1010000024473935
			command = `osascript -e 'tell application "Terminal" to do script "cd ${this.getVitepressFolder()} && bash ${scriptPath}"' -e 'tell application "Terminal" to activate'`
		} else {
			this.consoleModal.appendLogResult('Unsupported operating system')
			new Notice('Unsupported operating system')
			return;
		}
		this.consoleModal.appendLogResult('run script on new terminal:' + command)
		child_process.exec(command, (error, stdout, stderr) => {
			if (error) {
				console.error(`exec error: ${error}`);
				return;
			}
		});
	}

	build() {
		if (!this.checkSetting()) {
			return
		}
		if (!this.docsPrepare()) {
			return
		}
		this.consoleModal.open();
		const childProcess = child_process.spawn(`npm`, ['run', 'docs:build'], this.getSpawnOptions());
		this.commonCommandOnRunning('[vitepress build]:', childProcess)
	}

	previewOrClose(previewRibbonIconEl: HTMLElement | null) {
		try {
			if (this.devChildProcess == null) {
				this.startPreview();
				previewRibbonIconEl?.setAttr('aria-label', 'Close:vitepress dev');
			} else {
				this.closeDev();
				previewRibbonIconEl?.setAttr('aria-label', 'Run:vitepress dev');
			}
		} catch (e) {
			console.error(e)
			this.consoleModal.appendLogResult('error!' + e, ConsoleType.Error)
			new Notice('error!' + e);
		}
	}

	closeDev() {
		if (this.devChildProcess?.pid) {
			this.kill(this.devChildProcess.pid)
		}
		this.updateState(false);
	}

	closePreview() {
		if (this.previewChildProcess?.pid) {
			this.kill(this.previewChildProcess.pid)
		}
	}

	openBrowser() {
		if (!this.checkSetting()) {
			return
		}
		const copyFileTask = () => {
			// @ts-ignore.
			const basePath = this.app.vault.adapter.basePath;
			const relativeFile = getCurrentMdFileRelativePath(this.app, false)
			if (relativeFile) {
				const fullFilePath = `${basePath}/${relativeFile}`
				const copyTo = `${this.plugin.settings.vitepressSrcDir}/${relativeFile}`;
				try {
					copyFileSyncRecursive(fullFilePath, copyTo)
				} catch (err) {
					new Notice('file copy failed' + err);
				}
			}
		}
		if (this.isRunning) {
			copyFileTask()
			this.openBrowserByUrl(this.startedVitepressHostAddress + '/' + getCurrentMdFileRelativePath(this.app))
		} else {
			this.startPreview(() => {
				copyFileTask()
				this.openBrowserByUrl(this.startedVitepressHostAddress + '/' + getCurrentMdFileRelativePath(this.app))
			});
		}
	}

	private openBrowserByUrl(url: string) {
		new Notice(`open ${url}`)
		open(url)
			.then(() => {
			})
			.catch((e) => {
				console.error(`open ${url}`, e)
			})
	}

	private checkSetting() {
		const actionName = '[CheckSetting]:'
		const checkMapping: { [key: string]: { desc: string, required: boolean } } = {
			'vitepressDir': {desc: i18next.t('vitepress-folder-path'), required: true},
			'vitepressSrcDir': {desc: i18next.t('vitepress-srcDir-path'), required: false},
			'vitepressStaticDir': {desc: i18next.t('vitepress-fixed-dir'), required: false},
		}
		for (const key of Object.keys(checkMapping)) {
			// 路径的配置值
			// @ts-ignore
			const configPath = this.plugin.settings[key];
			const configDesc = checkMapping[key].desc;
			if (!configPath && checkMapping[key].required) {
				const tips = i18next.t("guide-to-setting", {name: configDesc})
				const notice = new Notice(tips, 3000)
				notice.noticeEl.addEventListener('click', () => {
					// @ts-ignore
					this.app.setting.open();
					// @ts-ignore
					this.app.setting.openTabById('vitepress-publisher');
				})
				return false
			}
			if (configPath && !fs.existsSync(configPath)) {
				const tips = i18next.t("file-not-existed-check", {name: configDesc});
				new Notice(tips, 3000)
				this.consoleModal.appendLogResult(`${actionName}` + tips)
				return false
			}
		}
		return true
	}

	private docsPrepare() {
		const actionName = '[docsPrepare]:'
		const vitepressSrcDir = this.plugin.settings.vitepressSrcDir;
		if (!vitepressSrcDir) {
			this.consoleModal.appendLogResult(`${actionName} The srcDir path for Vitepress is not set, please set it first.`)
			new Notice(i18next.t('vitepress-srcDir-path-not-set'))
			return false;
		}
		const vitepressStaicDir = this.plugin.settings.vitepressStaticDir;
		if (this.plugin.settings.needCleanDirFolder) {
			this.consoleModal.appendLogResult(`${actionName} remove folder '${vitepressSrcDir}'`)
			if (fs.existsSync(vitepressSrcDir)) {
				deleteFilesInDirectorySync(vitepressSrcDir)
			}
		}
		if (vitepressStaicDir) {
			if (!fs.existsSync(vitepressStaicDir)) {
				this.consoleModal.appendLogResult(`${actionName} '${vitepressStaicDir}' not exists, stopped.`)
				return false;
			}
			const files = fs.readdirSync(vitepressStaicDir);
			files.forEach(file => {
				const filePath = `${vitepressStaicDir}/${file}`;
				const stats = fs.statSync(filePath);
				copyFileSyncRecursive(filePath, `${vitepressSrcDir}/${file}`, stats.isDirectory())
			});
		}
		const folderOrFile = this.plugin.settings.publishedContentList
		this.consoleModal.appendLogResult(`${actionName} copy '${folderOrFile.map(item => item.name)}' to folder '${vitepressSrcDir}'`)
		// @ts-ignore
		const workspace = this.app.vault.adapter.basePath;
		for (const subContent of folderOrFile) {
			const srcPath = `${workspace}/${subContent.name}`
			if (fs.existsSync(srcPath)) {
				copyFileSyncRecursive(srcPath, `${vitepressSrcDir}/${subContent.name}`, subContent.isFolder, this.plugin.settings.ignoreFileRegex)
			} else {
				this.consoleModal.appendLogResult(`${actionName} '${srcPath}' not exists`, ConsoleType.Warning)
			}
		}
		return true;
	}


	startPreview(finish: (() => void) | null = null): void {
		if (!this.checkSetting()) {
			return
		}
		this.consoleModal.open();
		const actionName = '[vitepress]:'
		this.consoleModal.appendLogResult(`${actionName} starting...`)
		// 默认第一次启动的时候为打开主页。 并且第一次启动的时候，将docs的内容复制到knowledge文件夹
		if (!this.docsPrepare()) {
			return
		}
		this.devChildProcess = child_process.spawn(`npm`, ['run', 'docs:dev'], this.getSpawnOptions());
		this.devChildProcess.stdout.on('data', (data) => {
			data = this.stripAnsiText(data)
			this.consoleModal.appendLogResult(data)
			const address = this.extractAddress(data.toString())
			if (address && !this.startedVitepressHostAddress) {
				this.startedVitepressHostAddress = address;
				if (!finish) {
					this.openBrowserByUrl(this.startedVitepressHostAddress)
				} else {
					finish();
				}
			}
			this.updateState(true)
		});
		this.devChildProcess.stderr.on('data', (data) => {
			data = this.stripAnsiText(data)
			this.consoleModal.appendLogResult(data, ConsoleType.Warning)
		});
		this.devChildProcess.on('close', (code) => {
			const tips = `${actionName} closed ${code ?? ''}`
			this.consoleModal.appendLogResult(tips)
			new Notice(tips);
			this.updateState(false)
		});
		this.devChildProcess.on('error', (err) => {
			const tips = `${actionName}Failed to start child process: ` + err
			this.consoleModal.appendLogResult(tips, ConsoleType.Error)
			console.error(tips)
			new Notice(tips);
			this.updateState(false);
		});
	}

	private commonCommandOnRunning(actionName: string, process: child_process.ChildProcessWithoutNullStreams, onDataCallback: ((data: string) => (void)) | null = null) {
		process.stdout.on('data', (data) => {
			data = this.stripAnsiText(data)
			this.consoleModal.appendLogResult(data)
			onDataCallback && onDataCallback(data.toString())
		});
		process.stderr.on('data', (data: Buffer) => {
			this.consoleModal.appendLogResult(this.stripAnsiText(data), ConsoleType.Warning)
		});
		process.on('close', (code) => {
			const tips = `${actionName} closed ${code ?? ''}`
			this.consoleModal.appendLogResult(tips)
			new Notice(tips);
		});
		process.on('error', (err) => {
			const tips = `${actionName} failed to start child process: ` + err
			new Notice(tips);
			this.consoleModal.appendLogResult(tips, ConsoleType.Error)
		});
	}

	private extractAddress(text: string, isDev = true) {
		if (isDev && this.startedVitepressHostAddress) {
			return ''
		}
		if (text) {
			const regex = /http:\/\/(localhost|127.0.0.1):\d+/;
			const matchResult = text.match(regex);
			if (matchResult) {
				return matchResult[0] || '';
			}
		}
		return ''
	}

	private stripAnsiText(text: string | Buffer) {
		return stripAnsi(text.toString());
	}

	private updateState(running: boolean) {
		this.isRunning = running;
		if (running) {
			if (this.plugin.previewRibbonIconEl) {
				setIcon(this.plugin.previewRibbonIconEl, ICON_NAME_ON_PREVIEW);
			}
		} else {
			this.devChildProcess = null;
			this.startedVitepressHostAddress = '';
			if (this.plugin.previewRibbonIconEl) {
				setIcon(this.plugin.previewRibbonIconEl, ICON_NAME);
			}
		}
	}

	private getSpawnOptions() {
		return {
			cwd: this.getVitepressFolder(),
			env: {
				PATH: this.isWindowsPlatform ? process.env.PATH : process.env.PATH + ':/usr/local/bin'
			},
			shell: this.isWindowsPlatform
		}
	}
}
