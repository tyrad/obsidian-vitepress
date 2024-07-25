import * as glob from "glob";
import {sep} from "path";

const LOCAL_FILE_MAPPING = {};
/**
 * 根据文件名获取所在目录, 可能还需要考虑 1.项目部署路径不是/的问题  2.docs指定未其他目录的问题
 * @param docsFolderName 读取工作目录的哪个目录
 */
export const extractFilenameAndDirectoryRelationship = (docsFolderName: string) => {
    if (Object.keys(LOCAL_FILE_MAPPING).length === 0) {
        const fileList = glob.sync(`${docsFolderName}/**/*.md`);
        for (const mdPath of fileList) {
            let path = mdPath.replace(new RegExp(`^${docsFolderName}/`), '')
            // for fileName
            const docsFileName = mdPath.split(sep).pop();
            LOCAL_FILE_MAPPING[docsFileName] = path;
            LOCAL_FILE_MAPPING[docsFileName.replace(/\.md$/, '')] = path;
            // for path
            const relativePath = mdPath.replace(new RegExp(`^${docsFolderName}/`), '')
            LOCAL_FILE_MAPPING[relativePath] = path;
            LOCAL_FILE_MAPPING[relativePath.replace(/\.md$/, '')] = path;
        }
    }
    return LOCAL_FILE_MAPPING;
}