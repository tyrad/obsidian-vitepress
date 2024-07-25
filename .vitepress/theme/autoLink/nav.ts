import {readdirSync} from "fs";
import {DefaultTheme} from "vitepress/types/default-theme";

// 获取目录的文件夹
export const getDirectoriesOnFolder = source =>
    readdirSync(source, {withFileTypes: true})
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)

// 查询目录下的md文件,非递归
export const getMdFilesOnFolder = source =>
    readdirSync(source, {withFileTypes: true})
        .filter(dirent => dirent.isFile())
        .filter(dirent => dirent.name.endsWith('.md'))
        .map(dirent => dirent.name)

export const removeMarkdownSuffix = (name) => {
    return (name || '').replace(/.md$/, '')
}

const getFileOnFolder = source =>
    readdirSync(source, {withFileTypes: true})
        .filter(dirent => (dirent.isFile() && dirent.name.endsWith('.md')) || dirent.isDirectory())
        .map(dirent => dirent.name)

const sortMenuByNameList = (list: DefaultTheme.NavItem[], orderNames: string[]) => {
    for (let i = orderNames.length - 1; i >= 0; i--) {
        let index = list.findIndex(item => {
            return (item as any).text === orderNames[i]
        });
        if (index > 0) {
            let target = list.splice(index, 1);
            list.splice(0, 0, target[0]);
        }
    }
    return list;
}
/**
 * 生成导航地址链接
 *
 * 规则: 遍历目录 1.如果有目录、目录不为空、目录下有同名文件，直接显示这个文件夹名字。 参数最多支持两级。排序控制 .b-order-1 控制顺序
 * @param sourceFolderName
 * @param ignoreTopMdFile 是否忽略顶部菜单级别的md文件
 * @param orderNames 按照顺序放到前面（一级菜单)
 */
export const autoNavLink = (sourceFolderName, ignoreTopMdFile = false, orderNames: string[] = []) => {
    // 遍历第一层目录。顶层目录删的md文件忽略
    let level1Folders = getDirectoriesOnFolder(sourceFolderName);
    // 最外层的文件夹名
    const result: DefaultTheme.NavItem[] = []
    // 这里直接获取两级数据
    for (let level1FolderName of level1Folders) {
        // 1. 如果目录是空的,不进行添加
        const anyInFolder = getFileOnFolder(`${sourceFolderName}/${level1FolderName}`)
        if (anyInFolder.length === 0) {
            continue
        }
        // 2. 如果只有一个md文件,则没有下级items
        if (anyInFolder.length === 1 && anyInFolder[0].endsWith('.md')) {
            const fileName = removeMarkdownSuffix(anyInFolder[0])
            let sub: DefaultTheme.NavItemWithLink = {
                text: level1FolderName !== fileName ? `${level1FolderName}/${fileName}` : fileName,
                link: `/${level1FolderName}/${fileName}.html`
            }
            result.push(sub)
            continue
        }
        // 如果只有一个目录,并且这个目录下面一个md文件也没有
        if (anyInFolder.length === 1 && !anyInFolder[0].endsWith('.md')) {
            const mdInFolder = getMdFilesOnFolder(`${sourceFolderName}/${level1FolderName}/${anyInFolder[0]}`)
            if (mdInFolder.length === 0) {
                continue
            }
        }
        // 遍历文件并将同名文件放到第一个(删除并重新添加到第一个）
        const childItems = []
        if (!ignoreTopMdFile) {
            const mdInFolder = getMdFilesOnFolder(`${sourceFolderName}/${level1FolderName}`)
            for (const mdFile of mdInFolder) {
                let sub: DefaultTheme.NavItemWithLink = {
                    text: removeMarkdownSuffix(mdFile),
                    link: `/${level1FolderName}/${removeMarkdownSuffix(mdFile)}.html`
                }
                childItems.push(sub)
            }
            let index = childItems.findIndex(item => {
                return item.text === level1FolderName
            });
            if (index > 0) {
                let target = childItems.splice(index, 1);
                childItems.splice(0, 0, target[0]);
            }
        }
        // 遍历目录
        const folderInFolder = getDirectoriesOnFolder(`${sourceFolderName}/${level1FolderName}`)
        for (const folder of folderInFolder) {
            const mdInFolder = getMdFilesOnFolder(`${sourceFolderName}/${level1FolderName}/${folder}`)
            if (mdInFolder.length === 0) {
                continue
            }
            // 如果存在文件名和目录名字或index.md(这个文件是入口文件),则链接到这个文件。没有则忽略无视其他文件入口
            if (mdInFolder.includes(`${folder}.md`) || mdInFolder.includes(`index.md`)) {
                let sub: DefaultTheme.NavItemWithLink = {
                    text: ((mdInFolder.includes(`${folder}.md`) && !ignoreTopMdFile) ? '🗃️ ' : '') + folder,
                    link: `/${level1FolderName}/${folder}/${mdInFolder.includes(`index.md`) ? 'index' : folder}.html`
                }
                childItems.push(sub)
            }
        }
        result.push({
            text: level1FolderName,
            items: childItems
        })
    }
    return sortMenuByNameList(result, orderNames)
}
