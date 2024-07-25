import {Notice} from "obsidian";

export function noticeInfo(info: string, duration?: number) {
	console.info(info)
	new Notice(info, duration);
}

export function noticeError(error: string, duration?: number) {
	console.error(error)
	new Notice(error, duration);
}

// https://github.com/MamoruDS/obsidian-open-link-with/blob/main/src/utils.ts
