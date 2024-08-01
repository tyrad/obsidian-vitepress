import {FileSystemAdapter} from "obsidian";
import * as fs from "fs";
import * as path from "path";
import {sep} from "path";
import {readdirSync} from "fs";

// refer to : https://github.com/kometenstaub/linked-data-helper/blob/f18e160f091f0a0bd81c5f9a109334bcf74ffadc/src/methods/methods-loc.ts#L16
export function getAbsolutePath(fileName: string): string {
	let basePath;
	if (this.app.vault.adapter instanceof FileSystemAdapter) {
		basePath = this.app.vault.adapter.getBasePath();
	} else {
		throw new Error('Cannot determine base path.');
	}
	const relativePath = `${this.app.vault.configDir}/plugins/obsidian-vitepress/${fileName}`;
	return `${basePath}/${relativePath}`;
}

function mathPrefix(path: string, regexText: string) {
	const name = path.split(sep).pop();
	if (name) {
		return new RegExp('^_').test(name)
	}
	return false;
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
			console.log('忽略拷贝，' + src)
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
		console.log(`${filePath} deleted`);
	});
}
