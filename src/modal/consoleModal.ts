import {App, Modal} from "obsidian";

export enum ConsoleType {
	Common,
	Warning,
	Error
}

export class ConsoleModal extends Modal {
	logContent = ''
	readonly CONSOLE_MODAL_CLASS = 'vitepress-debug-console'
	readonly CONSOLE_MODAL_EMPTY_TEXT = 'No logs available.';
	readonly logDiv: HTMLElement
	readonly otherDiv: HTMLElement

	constructor(app: App) {
		super(app);
		this.setTitle("vitepress log console")
		this.modalEl.addClass(this.CONSOLE_MODAL_CLASS)
		this.logDiv = this.contentEl.createDiv();
		this.otherDiv = this.contentEl.createDiv();
	}

	onOpen() {
		const {contentEl} = this;
		if (this.logDiv.childNodes.length === 0) {
			contentEl.createSpan({title: this.CONSOLE_MODAL_EMPTY_TEXT})
		} else {
			this.otherDiv.empty();
			this.makeClearButton(this.otherDiv)
		}
	}

	onClose() {
	}

	appendLogResult(text: string | Buffer, type = ConsoleType.Common) {
		const logDiv = this.logDiv;
		const date = new Date();
		const padL = (nr: number, len = 2, chr = `0`) => `${nr}`.padStart(2, chr);
		let textRenderClass = ''
		const textRender = text.toString().trimStart();
		switch (type) {
			case ConsoleType.Common:
				textRenderClass = ''
				break;
			case ConsoleType.Warning:
				textRenderClass = 'vitepress-log-warning'
				break;
			case ConsoleType.Error:
				textRenderClass = 'vitepress-log-error'
				break
		}
		const div = logDiv.createDiv()
		div.createSpan({
			text: `[${padL(date.getHours())}:${padL(date.getMinutes())}:${padL(date.getSeconds())}]`,
			cls: 'vitepress-log-green'
		})
		div.createSpan({text: textRender, cls: textRenderClass})
		this.contentEl.scrollTop = this.contentEl.scrollHeight;
	}

	private makeClearButton(ele: HTMLElement) {
		const button = ele.createEl("button", {text: 'clear logs', cls: 'vitepress-clear-button'});
		button.addEventListener("click", () => {
			this.logDiv.empty();
			this.otherDiv.empty();
			this.otherDiv.createSpan({text: this.CONSOLE_MODAL_EMPTY_TEXT})
		});
		return button;
	}
}
