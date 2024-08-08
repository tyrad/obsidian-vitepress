import * as fs from "fs";
import * as path from "path";
import {sep} from "path";
import {readdirSync} from "fs";
import {App} from "obsidian";

function mathPrefix(path: string, regexText: string) {
	const name = path.split(sep).pop();
	if (name) {
		return new RegExp(regexText).test(name)
	}
	return false;
}

export function getCurrentMdFileRelativePath(app: App, removeSuffix = true) {
	const activeFile = app.workspace.getActiveFile();
	if (!activeFile) {
		return '';
	}
	if (removeSuffix) {
		return activeFile.path.replace(/.md$/, '')
	} else {
		return activeFile.path
	}
}

export function copyFileSyncRecursive(src: string, dest: string, isCopyDir = false, regexText = '') {
	fs.mkdirSync(path.dirname(dest), {recursive: true})
	if (!regexText) {
		if (isCopyDir) {
			//  v16.7.0 +
			fs.cpSync(src, dest, {recursive: true});
		} else {
			fs.copyFileSync(src, dest)
		}
	} else {
		if (mathPrefix(src, regexText)) {
			return
		}
		if (isCopyDir) {
			readdirSync(src, {withFileTypes: true}).forEach(file => {
				if (file.isDirectory()) {
					copyFileSyncRecursive(src + sep + file.name, dest + sep + file.name, true, regexText)
				} else {
					copyFileSyncRecursive(src + sep + file.name, dest + sep + file.name, false, regexText)
				}
			})
		} else {
			fs.copyFileSync(src, dest)
		}
	}
}

export function removeFolder(path: string) {
	fs.rmSync(path, {recursive: true, force: true})
}

export function deleteFilesInDirectorySync(directory: string) {
	const files = fs.readdirSync(directory);
	files.forEach(file => {
		const filePath = `${directory}/${file}`;
		const stats = fs.statSync(filePath);
		if (stats.isDirectory()) {
			removeFolder(filePath)
		} else {
			fs.unlinkSync(filePath);
		}
	});
}
