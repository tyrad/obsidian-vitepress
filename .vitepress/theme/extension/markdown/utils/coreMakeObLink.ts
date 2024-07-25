/**
 * 根据文件名获取所在目录, 可能还需要考虑 1.项目部署路径不是/的问题  2.docs指定未其他目录的问题
 * @param fileName
 * @param fileAndPathRelationship 映射关系
 */
const findFilePath = (fileName, fileAndPathRelationship) => {
    // obsidian支持通过| # ^, 添加额外信息,排除这些字符的影响
    const splitFileName = fileName.split(/[|#^]/)[0]
    // obsidian兼容了 / 开头的地址,这里去除一下
    fileName = splitFileName.replace(/^\//, '');
    const searchPath = fileAndPathRelationship[fileName]
    if (searchPath) {
        return '/' + searchPath.replace(/\.md$/, '.html')
    }
    return undefined;
}

export function coreMakeObLink(rawCode: string, fileAndPathRelationship) {
    const regex = /\[\[[^\[\]\\:]+?]]/g
    const matches = rawCode.match(regex);
    if (!matches || matches.length === 0) {
        return rawCode;
    }
    for (const match of matches) {
        let fileName = match.replace(/^\[\[/, '')
            .replace(/]]$/, '').trim();
        // 在ob中 `|` 用于起别名。另外和ob保持一致: [[a|b|c]] 显示别名为 bc
        let displayName = fileName;
        if (fileName.includes('|')) {
            fileName = fileName.substring(0, fileName.indexOf('|')).replace(/\|/g, '')
            displayName = displayName.substring(displayName.indexOf('|')).replace(/\|/g, '')
        }
        let mappingPath = findFilePath(fileName, fileAndPathRelationship);
        // vitePress中的锚点，需要将空格替换为`-`
        const anchorText = (fileName.includes('#') ? `#${fileName.split('#')[1]}` : '')
            .replace(/\s/g, '-');
        if (mappingPath) {
            // 在ob中 `#` 用于支持锚点
            rawCode = rawCode.replace(match, `<span class="group inline-block"><a href="${mappingPath}${anchorText}" class="x-ob-link">[${displayName}]</a></span>`);
        } else {
            // 页面不存在,也同样进行渲染。默认页面位置于根目录
            rawCode = rawCode.replace(match, `<span class="group inline-block"><a href="${fileName}.html${anchorText}" class="x-ob-link opacity-60">[${displayName}]</a></span>`);
        }
    }
    return rawCode;
}