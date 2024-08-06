import {FileSystemAdapter} from "obsidian";
import * as fs from "fs";

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
