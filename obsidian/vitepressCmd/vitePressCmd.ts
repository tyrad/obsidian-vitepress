import * as child_process from 'child_process';
import {App, Notice} from "obsidian";
import {noticeError, noticeInfo} from "../utils/log";
import {getCurrentMdFileRelativePath} from "../utils/markdownPathUtils";
import {copyFileSyncRecursive, getAbsolutePath, removeFolder} from "../utils/pathUtils";
import {ConsoleModal, ConsoleType} from "../modal/consoleModal";
import {ICON_SVG_CLOSE, ICON_SVG_PREVIEW} from "../static/icons";
import * as fs from "fs";
import ObsidianPlugin from "../main";

export class VitePressCmd {

	startedVitepressHostAddress = ''
	currentFolder = getAbsolutePath('')
	devChildProcess: child_process.ChildProcessWithoutNullStreams | null = null

	private readonly app: App;
	private readonly plugin: ObsidianPlugin;
	private previewChildProcess: child_process.ChildProcessWithoutNullStreams | null = null
	private isRunning: undefined | boolean = undefined;

	consoleModal: ConsoleModal;

	constructor(app: App, plugin: ObsidianPlugin) {
		this.app = app;
		this.consoleModal = new ConsoleModal(app)
		this.plugin = plugin
		this.app.workspace.on('quit', () => {
			this.devChildProcess?.kill();
			this.previewChildProcess?.kill();
		});
	}

	preview() {
		this.consoleModal.open();
		this.previewChildProcess?.kill();
		this.previewChildProcess = child_process.spawn(`./node_modules/.bin/vitepress`, ['preview'], {
			cwd: this.currentFolder,
			env: {PATH: process.env.PATH + ':/usr/local/bin'}
		});
		this.commonCommandOnRunning('[vitepress preview]', this.previewChildProcess, data => {
			const address = this.extractAddress(data + '')
			if (address) {
				this.openBrowserByUrl(address);
			}
		})
	}

	publish() {
		this.consoleModal.open();
		// chmod别忘了
		this.consoleModal.appendLogResult(this.currentFolder);
		this.consoleModal.appendLogResult(process.env.PATH + ':/usr/local/bin');
		const scriptPath = this.plugin.settings.deployScriptPath
		if (!scriptPath) {
			new Notice('未设置部署脚本的路径')
			return
		}
		const envs = this.plugin.settings.environmentVariables || [];
		const envsMap: { [key: string]: string } = {}
		for (const ob of envs) {
			if (ob.key) {
				envsMap[ob.key] = ob.value
			}
		}
		this.consoleModal.appendLogResult('额外的环境变量:' + JSON.stringify(envsMap))
		const childProcess = child_process.spawn(scriptPath,
			[], {
				cwd: this.currentFolder,
				env: {
					...envsMap,
					PATH: process.env.PATH + ':/usr/local/bin',
				}
			});
		this.commonCommandOnRunning('[vitepress publish]', childProcess)
	}

	build() {
		this.consoleModal.open();
		this.docsPrepare();
		const childProcess = child_process.spawn(`./node_modules/.bin/vitepress`, ['build'], {
			cwd: this.currentFolder,
			env: {PATH: process.env.PATH + ':/usr/local/bin'}
		});
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
			new Notice('error!' + e);
		}
	}

	closeDev() {
		this.devChildProcess?.kill();
		this.updateState(false);
	}

	closePreview() {
		this.previewChildProcess?.kill();
	}

	openBrowser() {
		new Notice(this.app.vault.configDir)
		// @ts-ignore.
		const basePath = this.app.vault.adapter.basePath;
		const relativeFile = getCurrentMdFileRelativePath(this.app, false)
		if (relativeFile) {
			const fullFilePath = `${basePath}/${relativeFile}`
			const copyTo = getAbsolutePath(`knowledge/${relativeFile}`);
			try {
				copyFileSyncRecursive(fullFilePath, copyTo)
				// new Notice('文件拷贝成功'); // TODO   i18n
			} catch (err) {
				new Notice('文件拷贝失败' + err); // TODO    i18n
			}
		}
		if (this.isRunning) {
			const path = this.startedVitepressHostAddress + '/' + getCurrentMdFileRelativePath(this.app);
			this.openBrowserByUrl(path)
		} else {
			this.startPreview();
		}
	}

	private openBrowserByUrl(url: string) {
		const openCommand = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
		new Notice(`open ${url}`)
		child_process.spawn(`${openCommand}`, [encodeURI(url)]);
	}

	private docsPrepare() {
		const docsFolder = 'knowledge'
		const actionName = '[docsPrepare]:'
		this.consoleModal.appendLogResult(`${actionName} remove folder '${docsFolder}'`)
		removeFolder(docsFolder)
		copyFileSyncRecursive(getAbsolutePath('docs'), getAbsolutePath(docsFolder), true)
		const folder = this.plugin.settings.publishedFolderList
		console.log('folder', folder);
		this.consoleModal.appendLogResult(`${actionName} copy folder '${folder}' to folder '${docsFolder}'`)
		// @ts-ignore
		const workspace = this.app.vault.adapter.basePath;
		for (const subFolder of folder) {
			const srcPath = `${workspace}/${subFolder}`
			if (fs.existsSync(srcPath)) {
				copyFileSyncRecursive(`${workspace}/${subFolder}`, getAbsolutePath(`${docsFolder}/${subFolder}`), true, this.plugin.settings.ignoreFileRegex)
			} else {
				this.consoleModal.appendLogResult(`${actionName} '${srcPath}' not exists`, ConsoleType.Warning)
			}
		}
	}

	startPreview(): void {
		this.consoleModal.open();
		const actionName = '[vitepress]:'
		this.consoleModal.appendLogResult(`${actionName} starting...`)
		// 暂时注释掉，默认第一次启动的时候为打开主页。 并且第一次启动的时候，将docs的内容复制到knowledge文件夹
		// saveCurrentPreviewFilePath(this.app);
		this.docsPrepare()
		this.devChildProcess = child_process.spawn(`./node_modules/.bin/vitepress`, [], {
			cwd: this.currentFolder,
			env: {PATH: process.env.PATH + ':/usr/local/bin'}
		});
		this.devChildProcess.stdout.on('data', (data) => {
			this.consoleModal.appendLogResult(data)
			const address = this.extractAddress(data + '')
			if (address) {
				this.startedVitepressHostAddress = address;
			}
			this.updateState(true)
		});
		this.devChildProcess.stderr.on('data', (data) => {
			this.consoleModal.appendLogResult(data, ConsoleType.Warning)
		});
		this.devChildProcess.on('close', (code) => {
			this.consoleModal.appendLogResult(`${actionName} closed ${code}`)
			noticeInfo(`${actionName} closed ${code}`)
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
			this.consoleModal.appendLogResult(data)
			onDataCallback && onDataCallback(data)
		});
		process.stderr.on('data', (data) => {
			this.consoleModal.appendLogResult(data, ConsoleType.Warning)
		});
		process.on('close', (code) => {
			this.consoleModal.appendLogResult(`${actionName} closed ${code}`)
			noticeInfo(`${actionName} closed ${code}`)
		});
		process.on('error', (err) => {
			noticeError(`${actionName} Failed to start child process: ` + err)
			this.consoleModal.appendLogResult(`${actionName} Failed to start child process: ` + err, ConsoleType.Error)
		});
	}

	private extractAddress(text: string) {
		if (!this.startedVitepressHostAddress && text) {
			const regex = /http:\/\/(localhost|127.0.0.1):\d+/;
			const matchResult = text.match(regex);
			if (matchResult) {
				return matchResult[0] || '';
			}
		}
		return ''
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
}
