import fs from "fs/promises";
import pkg from "node-unrar-js";
const { createExtractorFromFile } = pkg;

/**
 * 解压RAR文件到指定目录
 * @param {string} rarPath - RAR文件路径
 * @param {string} outputDir - 输出目录
 * @returns {Promise<void>}
 */
async function extractRAR(rarPath, outputDir) {
  // 确保输出目录存在
  const outputDirExists = await fs.access(outputDir).then(() => true).catch(() => false);
  if (!outputDirExists) {
    await fs.mkdir(outputDir, { recursive: true });
  }
  
  // 创建文件提取器并解压
  const extractor = await createExtractorFromFile({
    filepath: rarPath,
    targetPath: outputDir
  });
  
  // 执行解压
  const extracted = extractor.extract();
  const result = [...extracted.files][0].fileHeader;
  // 遍历结果以确保解压完成
  return result;
}

// 测试函数
async function testExtractRAR() {
  try {
    const rarPath = "./map.rar";
    const outputDir = "./rar_output";
    // 解压RAR文件
    const result = await extractRAR(rarPath, outputDir);
    console.log("解压完成", result);
    
  } catch (err) {
    console.error("解压失败:", err);
  }
}

// 运行测试
testExtractRAR();
