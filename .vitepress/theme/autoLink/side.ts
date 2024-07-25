import {sep} from 'path';
import {getDirectoriesOnFolder, getMdFilesOnFolder, removeMarkdownSuffix} from "./nav";
import {DefaultTheme} from "vitepress";

type SidebarItem = DefaultTheme.SidebarItem;

// 提取当前目录名
const extractFolderName = (path) => {
    return path.split(sep).pop();
}

const removeFilePathPrefix = (str, prefixName) => {
    return str.replace(new RegExp(`^${prefixName}`), '')
}

/**
 * 读取侧栏
 * @param rootDirName 根目录名
 * @param readDir 当前读取的路径
 * @param needCombineTopLevelMenu
 */
const getSidebars = (rootDirName, readDir, needCombineTopLevelMenu = true) => {
    let files = getMdFilesOnFolder(readDir);
    const currentFolderName = extractFolderName(readDir);
    let superItem: SidebarItem = null
    // 同名文件单独处理
    if (needCombineTopLevelMenu && files.includes(`${currentFolderName}.md`)) {
        files = files.filter(item => {
            return item !== currentFolderName;
        })
        superItem = {
            text: currentFolderName,
            link: removeFilePathPrefix(`${readDir}/${currentFolderName}.html`, rootDirName)
        }
    }
    const mxList: SidebarItem[] = []
    for (const mdFileName of files) {
        mxList.push({
            text: removeMarkdownSuffix(mdFileName),
            link: removeFilePathPrefix(`${readDir}/${removeMarkdownSuffix(mdFileName)}.html`, rootDirName)
        })
    }
    let folders = getDirectoriesOnFolder(readDir);
    for (let folder of folders) {
        let subContent = getSidebars(rootDirName, `${readDir}/${folder}`, false)
        const hasSaveNameFolder = subContent.some(item => {
            return item.text === folder
        })
        if (hasSaveNameFolder) {
            mxList.push({
                text: folder,
                link: removeFilePathPrefix(`${readDir}/${folder}/${folder}.html`, rootDirName),
                items: subContent.filter(x => {
                    return x.text !== folder
                })
            })
        } else {
            mxList.push({
                text: folder,
                items: subContent
            })
        }
    }
    if (superItem) {
        superItem.items = mxList.filter(x => {
            return x.text !== superItem.text
        })
        return [superItem]
    }
    return mxList
}

export const autoSideLink = (sourceFolderName) => {
    // 遍历第一层目录。顶层目录删的md文件忽略
    let level1Folders = getDirectoriesOnFolder(sourceFolderName);
    let map = {}
    for (let folder of level1Folders) {
        map[`/${folder}`] = getSidebars(sourceFolderName, `${sourceFolderName}/${folder}`)
        const level2Folders = getDirectoriesOnFolder(`${sourceFolderName}/${folder}`)
        for (const subFolder of level2Folders) {
            map[`/${folder}/${subFolder}`] = getSidebars(sourceFolderName, `${sourceFolderName}/${folder}/${subFolder}`);
        }
    }
    return map;
}
