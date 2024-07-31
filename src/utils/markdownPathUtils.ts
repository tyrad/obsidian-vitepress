import {App} from "obsidian";

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
