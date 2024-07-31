import {App, Modal} from "obsidian";
import * as buffer from "node:buffer";

export enum ConsoleType {
	Common,
	Warning,
	Error
}

export class ConsoleModal extends Modal {
	logContent = ''
	readonly CONSOLE_MODAL_CLASS = 'vitepress-debug-console'
	readonly CONSOLE_MODAL_EMPTY_TEXT = 'No logs available.';

	constructor(app: App) {
		super(app);
		this.setTitle("vitepress log console")
		this.modalEl.addClass(this.CONSOLE_MODAL_CLASS)
	}

	onOpen() {
		const {contentEl} = this;
		if (!this.logContent) {
			contentEl.innerHTML = this.CONSOLE_MODAL_EMPTY_TEXT
		}
	}

	onClose() {
	}

	appendLogResult(text: string | Buffer, type = ConsoleType.Common) {
		const date = new Date();
		const padL = (nr: number, len = 2, chr = `0`) => `${nr}`.padStart(2, chr);
		const dateTime = `<span style="color: green;">[${padL(date.getHours())}:${padL(date.getMinutes())}:${padL(date.getSeconds())}]</span>: `
		let textRender = ''
		switch (type) {
			case ConsoleType.Common:
				textRender = text.toString().trimStart();
				break;
			case ConsoleType.Warning:
				textRender = `<span style="color: #f5be05;">${text.toString().trimStart()}</span>`
				break;
			case ConsoleType.Error:
				textRender = `<span style="color: red;">${text.toString().trimStart()}</span>`
				break
		}
		if (!this.logContent) {
			this.logContent += (`${dateTime}` + textRender)
		} else {
			this.logContent += (`\n${dateTime}` + textRender);
		}
		const {contentEl} = this;
		contentEl.innerHTML = this.logContent + '<br>';
		contentEl.appendChild(this.makeClearButton())
		contentEl.scrollTop = contentEl.scrollHeight;
	}

	private makeClearButton() {
		const button = document.createElement("button");
		button.innerHTML = "clear logs";
		button.style.marginTop = '8px';
		button.addEventListener("click", () => {
			this.contentEl.innerHTML = this.CONSOLE_MODAL_EMPTY_TEXT
			this.logContent = '';
		});
		return button;
	}
}
