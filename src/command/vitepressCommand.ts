import * as child_process from 'child_process';
import {App, Notice} from "obsidian";
import {noticeError, noticeInfo} from "../utils/log";
import {getCurrentMdFileRelativePath} from "../utils/markdownPathUtils";
import {copyFileSyncRecursive, deleteFilesInDirectorySync} from "../utils/pathUtils";
import {ConsoleModal, ConsoleType} from "../modal/consoleModal";
import {ICON_SVG_CLOSE, ICON_SVG_PREVIEW} from "../static/icons";
import * as fs from "fs";
import ObsidianPlugin from "../main";
import open from 'open';
import stripAnsi from 'strip-ansi';

export class VitepressCommand {
	kill = require('tree-kill');

	startedVitepressHostAddress = ''
	devChildProcess: child_process.ChildProcessWithoutNullStreams | null = null

	private readonly app: App;
	private readonly plugin: ObsidianPlugin;
	private readonly isWindowsPlatform = process.platform === 'win32'
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
		this.consoleModal.open();
		if (!this.checkSetting()) {
			return
		}
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
		this.consoleModal.open();
		if (!this.checkSetting()) {
			return
		}
		const scriptPath = this.plugin.settings.deployScriptPath
		if (!scriptPath) {
			new Notice('未设置部署脚本的路径')
			return
		}
		this.consoleModal.appendLogResult(this.getVitepressFolder());
		let command;
		switch (process.platform) {
			case 'win32':
				command = `start cmd /k bash ${scriptPath}`;
				break;
			case 'darwin':
				// refer to : https://segmentfault.com/q/1010000024473935
				command = `osascript -e 'tell application "Terminal" to do script "cd ${this.getVitepressFolder()} && bash ${scriptPath}"' -e 'tell application "Terminal" to activate'`
				break;
			default:
				this.consoleModal.appendLogResult('Unsupported operating system')
				new Notice('Unsupported operating system')
				return;
		}
		this.consoleModal.appendLogResult('run script on new terminal：' + command)
		child_process.exec(command, (error, stdout, stderr) => {
			if (error) {
				console.error(`exec error: ${error}`);
				return;
			}
		});
	}

	build() {
		this.consoleModal.open();
		if (!this.checkSetting()) {
			return
		}
		if (!this.docsPrepare()) {
			return
		}
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
					new Notice('文件拷贝失败' + err);
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
			'vitepressDir': {desc: 'vitepress', required: true},
			'vitepressSrcDir': {desc: 'vitepress的srcDir', required: false},
			'vitepressStaticDir': {desc: 'vitepress的固定文件', required: false},
		}
		for (const key of Object.keys(checkMapping)) {
			// 路径的配置值
			// @ts-ignore
			const configPath = this.plugin.settings[key];
			const configDesc = checkMapping[key].desc;
			if (!configPath && checkMapping[key].required) {
				const notice = new Notice(`未设置${configDesc}路径,点击设置`, 3000)
				this.consoleModal.appendLogResult(`${actionName} 未设置${configDesc}路, 请先设置。`)
				notice.noticeEl.addEventListener('click', () => {
					// @ts-ignore
					this.app.setting.open();
					// @ts-ignore
					this.app.setting.openTabById('vitepress-publisher');
				})
				return false
			}
			if (configPath && !fs.existsSync(configPath)) {
				new Notice(`${configDesc}文件不存在，请检查设置`, 3000)
				this.consoleModal.appendLogResult(`${actionName} ${configDesc}文件不存在，请检查设置。`)
				return false
			}
		}
		return true
	}

	private docsPrepare() {
		const actionName = '[docsPrepare]:'
		const vitepressSrcDir = this.plugin.settings.vitepressSrcDir;
		if (!vitepressSrcDir) {
			this.consoleModal.appendLogResult(`${actionName} 未设置vitepress的srcDir路径, 请先设置。`)
			new Notice('未设置vitepress的srcDir路径')
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
				this.consoleModal.appendLogResult(`${actionName} '${vitepressStaicDir}' not exists, 停止后续操作。`)
				return false;
			}
			const files = fs.readdirSync(vitepressStaicDir);
			files.forEach(file => {
				const filePath = `${vitepressStaicDir}/${file}`;
				const stats = fs.statSync(filePath);
				copyFileSyncRecursive(filePath, `${vitepressSrcDir}/${file}`, stats.isDirectory())
				console.log(`copyFileSyncRecursive: ${filePath} `);
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
		this.consoleModal.open();
		if (!this.checkSetting()) {
			return
		}
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
			this.consoleModal.appendLogResult(`${actionName} closed ${code ?? ''}`)
			noticeInfo(`${actionName} closed ${code ?? ''}`)
			this.updateState(false)
		});
		this.devChildProcess.on('error', (err) => {
			noticeError(`${actionName}Failed to start child process: ` + err)
			this.consoleModal.appendLogResult(`${actionName}Failed to start child process: ` + err, ConsoleType.Error)
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
			this.consoleModal.appendLogResult(`${actionName} closed ${code ?? ''}`)
			noticeInfo(`${actionName} closed ${code ?? ''}`)
		});
		process.on('error', (err) => {
			noticeError(`${actionName} Failed to start child process: ` + err)
			this.consoleModal.appendLogResult(`${actionName} Failed to start child process: ` + err, ConsoleType.Error)
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
		const ele = document.getElementsByClassName('obsidian-preview')[0]
		if (running) {
			ele && (ele.innerHTML = ICON_SVG_PREVIEW);
		} else {
			this.devChildProcess = null;
			this.startedVitepressHostAddress = '';
			ele && (ele.innerHTML = ICON_SVG_CLOSE);
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
