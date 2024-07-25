const regex = /\|(\d+)(?:x(\d+))?$/;
/**
 * 支持obsidian的图片大小。例如 [xxx|200x100](a.png) 表示宽为200 高为100的图片， [xxx|200](a.png) 表示宽为200的图片
 * @param md
 */
export const markdownItImgSize = (md: any) => {
    function getSizeAttribute(token) {
        const match = token.match(regex)
        if (!match) {
            return '';
        }
        const width = (match.length > 1 && match[1] !== undefined) ? `width="${match[1]}" ` : ''
        const height = (match.length > 2 && match[2] !== undefined) ? `height="${match[2]}"` : ''
        return width + height
    }

    md.renderer.rules.image = function (tokens, idx, options, env, self) {
        const token = tokens[idx];
        const imageSrc = token.attrs[token.attrIndex('src')][1];
        const imageAlt = token.content;
        // Check if the image tag has size attribute
        const sizeAttribute = getSizeAttribute(token.content);
        // Generate the new HTML tag with size attribute
        return `<img src="${imageSrc}" alt="${imageAlt}" ${sizeAttribute} />`;
    };
}