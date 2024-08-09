import {getAPI} from "obsidian-dataview";
import type {DataviewApi} from "obsidian-dataview";
import {App} from "obsidian";
import * as fs from "fs";
import * as path from "path";
import {sep} from "path";
import {readdirSync} from "fs";
import ObsidianPlugin from "../main";

export class DataviewActions {
	private readonly dataViewApi: DataviewApi;
	private readonly app: App
	private readonly plugin: ObsidianPlugin;

	constructor(app: App, plugin: ObsidianPlugin) {
		this.app = app;
		this.plugin = plugin
		this.dataViewApi = getAPI(app);
		if (!this.dataViewApi) {
			console.error("Dataview API not found");
		}
	}

	async copyFileSyncRecursive(
		src: string,
		dest: string,
		isCopyDir = false,
		regexText = '') {
		fs.mkdirSync(path.dirname(dest), {recursive: true})
		if (!regexText) {
			if (isCopyDir) {
				//  v16.7.0 +
				fs.cpSync(src, dest, {recursive: true});
			} else {
				await this.copyFileSync(src, dest);
			}
		} else {
			if (this.mathPrefix(src, regexText)) {
				//console.log('忽略拷贝，' + src)
				return
			}
			if (isCopyDir) {
				const content = readdirSync(src, {withFileTypes: true})
				for (const file of content) {
					if (file.isDirectory()) {
						await this.copyFileSyncRecursive(src + sep + file.name, dest + sep + file.name, true, regexText)
					} else {
						await this.copyFileSyncRecursive(src + sep + file.name, dest + sep + file.name, false, regexText)
					}
				}
			} else {
				await this.copyFileSync(src, dest);
			}
		}
	}

	mathPrefix(path: string, regexText: string) {
		const name = path.split(sep).pop();
		if (name) {
			return new RegExp(regexText).test(name)
		}
		return false;
	}

	async copyFileSync(src: string, dest: string) {
		if (this.plugin.settings.useDataView && this.dataViewApi) {
			try {
				let data = fs.readFileSync(src, 'utf8');
				const CODEBLOCK = /```(?<language>.+)?\n(?<query>[\s\S]*?)```/gm;
				const CODEBLOCK_REGEX = /```(?<language>.+)?\n(?<query>[\s\S]*?)```/m;
				const match = data.match(CODEBLOCK);
				if (match) {
					let haveDataviewBlock = false;
					for (const mmText of match) {
						const match = mmText.match(CODEBLOCK_REGEX);
						if (match && match.length) {
							const language = match.groups?.language?.trim() ?? "";
							const query = match.groups?.query?.trim() ?? "";
							if (language === 'dataview') {
								haveDataviewBlock = true
								// @ts-ignore
								const workspace = this.app.vault.adapter.basePath;
								const srcRelativePath = src.replace(new RegExp("^" + workspace + "/"), "")
								const result = await this.dataViewApi.tryQueryMarkdown(query, srcRelativePath);
								data = data.replace(match[0], result)
							}
						}
					}
					if (haveDataviewBlock) {
						fs.writeFileSync(dest, data, {encoding: 'utf8'});
						return
					}
				}
				fs.copyFileSync(src, dest)
			} catch (err) {
				console.error(err); // err.message
				fs.writeFileSync(dest, `\`\`\`\nDataview:${err.message}\n\`\`\``, {encoding: 'utf8'});
			}
		} else {
			fs.copyFileSync(src, dest)
		}
	}
}
