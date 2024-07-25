/**
 * 支持文本高亮
 * @param md
 */
export const markdownItObHighlightMarkerText = (md: any) => {
    const text = md.renderer.rules.text
    md.renderer.rules.text = (...args) => {
        let rawCode = text(...args);
        /**
         * 匹配规则
         * 1.大于等于两个`=`开头
         * 2.紧跟的字符不能是`=`和空白
         * 3.回车结尾或大于等于两个`=`结尾。因为rawCode是行数据，这里只需匹配$结尾即可
         */
        const regex = /==+(?!(=|\s)).+?(==+|$)/g
        const matches = rawCode.match(regex);
        if (!matches || matches.length === 0) {
            return rawCode;
        }
        for (let match of matches) {
            match.replace(/^=+/g, "").replace(/=+$/g, "")
            rawCode = rawCode.replace(match, `<span style="background: rgba(255, 208, 0, 0.4);" class="ob-highlight-text bg-orange-400">${match.replace(/=/g, "")}</span>`);
        }
        return rawCode;
    }
}