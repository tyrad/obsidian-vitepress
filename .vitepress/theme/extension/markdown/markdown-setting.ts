import {markdownItObLink} from "./markdown-it-ob-link";
import {markdownItCommentRemove} from "./markdown-it-ob-comment-remove";
import {markdownItObHighlightMarkerText} from "./markdown-it-ob-highlight-marker-text";
import {markdownItImgSize} from "./markdown-it-img-size";

export const markDownSetting = (docsFolderName: string) => {
    return (md) => {
        md.set({
            breaks: true
        })
        md.use(markdownItObHighlightMarkerText)
        md.use(markdownItObLink, docsFolderName)
        md.use(markdownItCommentRemove)
        md.use(markdownItImgSize)
    }
}