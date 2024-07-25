import {coreMakeObLink} from "./utils/coreMakeObLink";
import {extractFilenameAndDirectoryRelationship} from "./utils/extractFilenameAndDirectoryRelationship";

export const markdownItObLink = (md: any, docsFolderName: string) => {
    const text = md.renderer.rules.text
    md.renderer.rules.text = (...args) => {
        let rawCode = text(...args);
        return coreMakeObLink(rawCode, extractFilenameAndDirectoryRelationship(docsFolderName));
    }
}