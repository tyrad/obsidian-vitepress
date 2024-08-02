import {moment} from "obsidian";
// @ts-ignore
import * as en from "./locales/en.json";
// @ts-ignore
import * as zh_cn from "./locales/zh-cn.json";

export const resources = {
	en: {translation: en},
	"zh_cn": {translation: zh_cn},
} as const;

export const translationLanguage = Object.keys(resources).find(
	(i) => i == moment.locale().replace("-", "_")
)
	? moment.locale().replace("-", "_")
	: "en";
