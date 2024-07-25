/**
 * 移除 obsidian 标记注释的部分  %%xx%%  [TODO:不支持多行]
 * @param md
 */
export const markdownItCommentRemove = (md: any) => {
    const text = md.renderer.rules.text
    md.renderer.rules.text = (...args) => {
        let rawCode = text(...args);
        const regex = /%%[\s\S]*?%%/g
        const matches = rawCode.match(regex);
        if (!matches || matches.length === 0) {
            return rawCode;
        }
        return rawCode.replace(regex, "");
    }
}