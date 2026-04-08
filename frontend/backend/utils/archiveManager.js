import _7z from "7zip-min";
import { join, extname } from "path";
import { createExtractorFromFile } from "node-unrar-js";
import tools from "./tools.js";

/**
 * 压缩文件服务类
 */
class ArchiveService {
  constructor() {}
  /**
   * 解压RAR文件到指定目录
   * @param {string} rarPath - RAR文件路径
   * @param {string} outputDir - 输出目录
   * @param {boolean} isFlat - 是否扁平化解压（将所有文件直接解压到输出目录）
   * @returns {Promise<Array>} - 解压后的文件列表
   */
  async extractRAR(rarPath, outputDir, isFlat = false) {
    // 使用node-unrar-js解压RAR文件
    try {
      const extractedFiles = [];
      const extractor = await createExtractorFromFile({
        filepath: rarPath,
        targetPath: outputDir,
      });
      // 执行解压
      const extracted = extractor.extract();
      extractedFiles.push(...extracted.files);
      console.log(`解压完成，共 ${JSON.stringify(extractedFiles)} 个文件`);
      // 遍历结果以确保解压完成
      return extractedFiles;
    } catch (error) {
      console.error(`解压RAR文件失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 通用解压函数
   * @param {string} archivePath - 压缩文件路径
   * @param {string} outputDir - 输出目录
   * @param {boolean} isFlat - 是否扁平化解压（将所有文件直接解压到输出目录）
   * @returns {Promise}
   */
  async extractArchive(archivePath, outputDir, isFlat = false) {
    console.log(`开始解压: ${archivePath}，输出目录: ${outputDir}`);

    if (extname(archivePath).toLowerCase() === ".rar") {
      // 解压RAR文件
      console.log(`解压RAR文件: ${archivePath}`);
      const rarFiles = await this.extractRAR(archivePath, outputDir, isFlat);
      console.log(`RAR文件解压完成，共 ${rarFiles.length} 个文件`);
      return rarFiles;
    }

    if (isFlat) {
      // 扁平化解压：使用e命令并指定-o+参数
      console.log("使用扁平化解压模式");
      await _7z.cmd(["e", archivePath, `-o${outputDir}`, "-y"]);
    } else {
      // 常规解压
      await _7z.unpack(archivePath, outputDir);
    }

    console.log(`解压完成: ${archivePath}`);

    // 检查压缩文件内部是否包含其他压缩文件
    const nestedArchiveNames =
      await this.findNestedArchivesInArchive(archivePath);
    if (nestedArchiveNames.length > 0) {
      console.log("发现嵌套压缩文件，开始进一步解压...");
      for (const nestedArchiveName of nestedArchiveNames) {
        const nestedArchivePath = join(outputDir, nestedArchiveName);

        // 检查解压后的嵌套压缩文件是否存在
        const nestedArchiveExists = await tools.fileExists(nestedArchivePath);
        if (nestedArchiveExists) {
          await this.extractArchive(nestedArchivePath, outputDir, isFlat);
          // 删除已解压的嵌套压缩文件
          try {
            await tools.deleteRecursive(nestedArchivePath);
            console.log(`已删除临时文件: ${nestedArchivePath}`);
          } catch (err) {
            console.error(`删除临时文件失败: ${nestedArchivePath}`, err);
          }
        }
      }
    }
    // 返回解压的文件列表
    return nestedArchiveNames;
  }

  /**
   * 检查压缩文件内部是否包含其他压缩文件
   * @param {string} archivePath - 压缩文件路径
   * @returns {Promise<string[]>} - 嵌套压缩文件路径数组
   */
  async findNestedArchivesInArchive(archivePath) {
    try {
      const nestedArchives = [];
      const compressedExtensions = [
        ".7z",
        ".zip",
        ".rar",
        ".tar",
        ".gz",
        ".bz2",
        ".xz",
        ".tar.gz",
        ".tar.bz2",
        ".tar.xz",
        ".tgz",
        ".tbz2",
      ];

      // 使用7zip-min列出文件内容
      const files = await _7z.list(archivePath);

      for (const file of files) {
        if (file.name) {
          const ext = extname(file.name).toLowerCase();
          if (compressedExtensions.includes(ext)) {
            nestedArchives.push(file.name);
          }
        }
      }

      return nestedArchives;
    } catch (err) {
      console.error(`列出压缩文件内容失败: ${archivePath}`, err);
      return [];
    }
  }

  /**
   * 列出压缩文件内容
   * @param {string} archivePath - 压缩文件路径
   * @returns {Promise<Object[]>}
   */
  async listArchive(archivePath) {
    console.log(`列出压缩文件内容: ${archivePath}`);

    try {
      // 使用7zip-min列出文件内容
      const files = await _7z.list(archivePath);

      for (const file of files) {
        console.log(
          `文件: ${file.name} (${tools.formatSize(file.size) || "未知大小"})`,
        );
      }

      console.log(`列出完成，共 ${files.length} 个文件`);
      return files;
    } catch (err) {
      console.error(`列出失败: ${archivePath}`, err);
      throw err;
    }
  }
}

export default new ArchiveService();
