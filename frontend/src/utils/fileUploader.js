/**
 * 文件上传工具类
 * 处理大文件分片上传，使用Web Worker进行异步处理
 */
import { fileApi } from "../api";

class FileUploader {
  /**
   * 计算文件的MD5哈希值
   * @param {File} file - 要计算哈希的文件
   * @param {Function} onProgress - 进度回调函数
   * @returns {Promise<string>} 文件的MD5哈希值
   */
  static async calculateFileHash(file, onProgress) {
    return new Promise((resolve, reject) => {
      try {
        const hashWorker = new Worker(
          new URL("./fileHashWorker.js", import.meta.url),
        );

        hashWorker.onmessage = (event) => {
          const { type, data } = event.data;
          if (type === "hash") {
            hashWorker.terminate();
            resolve(data.hash);
          } else if (type === "progress") {
            if (onProgress) {
              onProgress(data.progress);
            }
          } else if (type === "error") {
            hashWorker.terminate();
            reject(new Error(data.error));
          }
        };

        // 发送文件和分块大小给Worker
        hashWorker.postMessage({
          type: "hash",
          data: file,
          chunkSize: 1024 * 1024 * 10, // 10MB 分块
        });
      } catch (error) {
        console.warn("哈希计算初始化失败:", error);
        reject(error);
      }
    });
  }

  /**
   * 上传大文件（分块上传）
   * @param {File} file - 要上传的文件
   * @param {Object} options - 上传选项
   * @param {string} options.uploadPath - 上传路径
   * @param {number} options.chunkSize - 分块大小（默认5MB）
   * @param {Function} options.onProgress - 进度回调函数
   * @param {Function} options.onStatus - 状态回调函数
   * @param {boolean} options.enableResume - 是否启用断点续传
   * @param {Function} options.onHashProgress - 哈希计算进度回调
   * @returns {Promise<Object>} 上传结果
   */
  static async uploadLargeFile(file, options = {}) {
    const {
      uploadPath,
      chunkSize = 5 * 1024 * 1024, // 默认5MB，更适合慢速网络
      onProgress,
      onStatus,
      onHashProgress,
      maxRetries = 5, // 最大重试次数增加到5次
      timeout = 600000, // 超时时间增加到600秒（10分钟）
    } = options;

    // 启用断点续传，默认为false
    let enableResume = options.enableResume ?? false;

    // 计算总分块数
    const totalChunks = Math.ceil(file.size / chunkSize);
    let uploadId;
    let uploadedChunks = 0;
    let uploadedChunkIndexes = new Set();
    let isCancelled = false; // 标记是否已取消上传

    // 带重试的上传函数
    const uploadChunkWithRetry = async (
      chunkData,
      chunkIndex,
      retryCount = 0,
    ) => {
      try {
        // 创建FormData
        const formData = new FormData();
        formData.append("uploadId", uploadId);
        formData.append("chunkIndex", chunkIndex.toString());

        // 将ArrayBuffer转换为Blob上传
        const chunkBlob = new Blob([chunkData]);
        formData.append("chunk", chunkBlob);

        // 上传分块
        if (onStatus && retryCount > 0) {
          onStatus(
            `正在上传分块 ${chunkIndex + 1}/${totalChunks} (重试 ${retryCount}/${maxRetries})...`,
          );
        }
        await fileApi.uploadChunk(formData);
        return true;
      } catch (error) {
        // 如果已取消，直接抛出错误
        if (isCancelled) {
          throw new Error("上传已取消");
        }

        // 记录详细的错误信息
        console.error(`分块 ${chunkIndex} 上传失败:`, error);

        // 如果还有重试次数，继续重试
        if (retryCount < maxRetries) {
          const waitTime = 2000 * (retryCount + 1); // 更长的等待时间
          console.warn(
            `分块 ${chunkIndex + 1}/${totalChunks} 上传失败，等待 ${waitTime / 1000}秒后重试 (${retryCount + 1}/${maxRetries})...`,
          );
          if (onStatus) {
            onStatus(
              `分块 ${chunkIndex + 1}/${totalChunks} 上传失败，等待 ${waitTime / 1000}秒后重试 (${retryCount + 1}/${maxRetries})...`,
            );
          }
          // 等待一段时间后重试
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          return await uploadChunkWithRetry(
            chunkData,
            chunkIndex,
            retryCount + 1,
          );
        }
        // 重试次数用完，抛出错误
        console.error(
          `分块 ${chunkIndex + 1}/${totalChunks} 上传失败，已重试 ${maxRetries} 次，放弃上传`,
        );
        throw new Error(
          `分块 ${chunkIndex + 1}/${totalChunks} 上传失败，已重试 ${maxRetries} 次`,
        );
      }
    };

    // 如果启用断点续传，计算文件哈希
    let fileHash = null;
    if (enableResume) {
      if (onStatus) {
        onStatus("计算文件哈希...");
      }
      try {
        fileHash = await this.calculateFileHash(file, onHashProgress);
        if (onStatus) {
          onStatus(`文件哈希计算完成: ${fileHash.substring(0, 8)}...`);
        }
      } catch (error) {
        console.warn("计算文件哈希失败，禁用断点续传:", error);
        enableResume = false;
      }
    }

    // 初始化上传
    if (onStatus) {
      onStatus("初始化上传...");
    }
    const initResponse = await fileApi.initChunkUpload({
      filename: file.name,
      totalSize: file.size,
      chunkSize: chunkSize,
      totalChunks: totalChunks,
      uploadPath: uploadPath,
      directoryType: "SERVER_FILE",
      fileHash: fileHash,
    });
    const initData = initResponse.data || {};
    uploadId = initData.uploadId;

    // 如果服务器返回了已上传的块，记录下来
    if (initData.uploadedChunks) {
      uploadedChunkIndexes = new Set(initData.uploadedChunks);
      uploadedChunks = uploadedChunkIndexes.size;
      if (onStatus) {
        onStatus(`发现已上传 ${uploadedChunks} 个分块，继续上传...`);
      }
    } else {
      if (onStatus) {
        onStatus("开始上传文件...");
      }
    }

    // 检查是否支持Web Worker
    if (typeof Worker !== "undefined") {
      // 使用Web Worker进行分片处理
      return new Promise((resolve, reject) => {
        try {
          // 创建Web Worker
          const worker = new Worker(
            new URL("./fileUploadWorker.js", import.meta.url),
          );

          // 分块队列
          const chunkQueue = [];
          let isProcessing = false;

          // 处理队列中的分块
          const processQueue = async () => {
            if (isProcessing || chunkQueue.length === 0) return;

            isProcessing = true;
            const chunkData = chunkQueue.shift();

            // 如果该分块已经上传过，跳过
            if (uploadedChunkIndexes.has(chunkData.chunkIndex)) {
              uploadedChunks++;
              const progress = Math.round((uploadedChunks / totalChunks) * 100);
              if (onProgress) {
                onProgress(progress, uploadedChunks, totalChunks);
              }
              isProcessing = false;
              processQueue(); // 处理下一个分块
              return;
            }

            try {
              // 使用带重试的上传函数
              await uploadChunkWithRetry(
                chunkData.chunkData,
                chunkData.chunkIndex,
              );

              // 标记该分块为已上传
              uploadedChunkIndexes.add(chunkData.chunkIndex);
              uploadedChunks = uploadedChunkIndexes.size;

              // 更新进度
              const progress = Math.round((uploadedChunks / totalChunks) * 100);
              if (onProgress) {
                onProgress(progress, uploadedChunks, totalChunks);
              }

              if (onStatus) {
                onStatus(`上传分块 ${uploadedChunks}/${totalChunks}`);
              }
            } catch (error) {
              console.error(
                `上传分块 ${chunkData.chunkIndex + 1}/${totalChunks} 失败:`,
                error,
              );
              isCancelled = true;
              worker.terminate();
              // 尝试通知后端清理资源
              try {
                await fileApi.cancelUpload({ uploadId });
              } catch (cleanupError) {
                console.warn("清理上传资源失败:", cleanupError);
              }
              reject(new Error(`上传分块失败: ${error.message}`));
              return;
            } finally {
              isProcessing = false;
              if (!isCancelled) {
                processQueue(); // 处理下一个分块
              }
            }
          };

          // 监听Worker消息
          worker.onmessage = async (event) => {
            const { type, data } = event.data;

            switch (type) {
              case "status":
                if (onStatus) {
                  onStatus(data.message);
                }
                break;
              case "chunk":
                // 将分块添加到队列
                chunkQueue.push(data);
                // 开始处理队列
                processQueue();
                break;
              case "complete":
                // 等待所有分块上传完成
                const waitForQueue = setInterval(() => {
                  if (chunkQueue.length === 0 && !isProcessing) {
                    clearInterval(waitForQueue);
                    worker.terminate();
                    if (onStatus) {
                      onStatus(`完成上传: ${file.name}`);
                    }
                    resolve({ success: true, uploadId });
                  }
                }, 100);
                break;
              case "error":
                worker.terminate();
                reject(new Error(data.error));
                break;
            }
          };

          // 发送切片任务给Worker
          worker.postMessage({
            type: "slice",
            data: {
              file,
              chunkSize,
              totalChunks,
            },
          });
        } catch (error) {
          // 如果Web Worker失败，回退到同步上传
          console.warn("Web Worker初始化失败，回退到同步上传:", error);
          return this.uploadLargeFileSync(
            file,
            options,
            uploadId,
            totalChunks,
            chunkSize,
            onProgress,
            onStatus,
            uploadedChunkIndexes,
          );
        }
      });
    } else {
      // 不支持Web Worker，使用同步上传
      console.warn("浏览器不支持Web Worker，使用同步上传");
      return this.uploadLargeFileSync(
        file,
        options,
        uploadId,
        totalChunks,
        chunkSize,
        onProgress,
        onStatus,
        uploadedChunkIndexes,
      );
    }
  }

  /**
   * 同步上传大文件（分块上传）
   * @private
   */
  static async uploadLargeFileSync(
    file,
    options,
    uploadId,
    totalChunks,
    chunkSize,
    onProgress,
    onStatus,
    uploadedChunkIndexes = new Set(),
  ) {
    const { maxRetries = 5, timeout = 600000 } = options;
    let uploadedChunks = uploadedChunkIndexes.size;
    let isCancelled = false;

    // 带重试的上传函数
    const uploadChunkWithRetry = async (chunk, chunkIndex, retryCount = 0) => {
      try {
        // 创建FormData
        const formData = new FormData();
        formData.append("uploadId", uploadId);
        formData.append("chunkIndex", chunkIndex.toString());
        formData.append("chunk", chunk);

        // 上传分块
        if (onStatus && retryCount > 0) {
          onStatus(
            `正在上传分块 ${chunkIndex + 1}/${totalChunks} (重试 ${retryCount}/${maxRetries})...`,
          );
        }
        await fileApi.uploadChunk(formData);
        return true;
      } catch (error) {
        // 如果已取消，直接抛出错误
        if (isCancelled) {
          throw new Error("上传已取消");
        }

        // 记录详细的错误信息
        console.error(`分块 ${chunkIndex} 上传失败:`, error);

        // 如果还有重试次数，继续重试
        if (retryCount < maxRetries) {
          const waitTime = 2000 * (retryCount + 1); // 更长的等待时间
          console.warn(
            `分块 ${chunkIndex + 1}/${totalChunks} 上传失败，等待 ${waitTime / 1000}秒后重试 (${retryCount + 1}/${maxRetries})...`,
          );
          if (onStatus) {
            onStatus(
              `分块 ${chunkIndex + 1}/${totalChunks} 上传失败，等待 ${waitTime / 1000}秒后重试 (${retryCount + 1}/${maxRetries})...`,
            );
          }
          // 等待一段时间后重试
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          return await uploadChunkWithRetry(chunk, chunkIndex, retryCount + 1);
        }
        // 重试次数用完，抛出错误
        console.error(
          `分块 ${chunkIndex + 1}/${totalChunks} 上传失败，已重试 ${maxRetries} 次，放弃上传`,
        );
        throw new Error(
          `分块 ${chunkIndex + 1}/${totalChunks} 上传失败，已重试 ${maxRetries} 次`,
        );
      }
    };

    for (let i = 0; i < totalChunks; i++) {
      // 如果该分块已经上传过，跳过
      if (uploadedChunkIndexes.has(i)) {
        uploadedChunks++;
        const progress = Math.round((uploadedChunks / totalChunks) * 100);
        if (onProgress) {
          onProgress(progress, uploadedChunks, totalChunks);
        }
        continue;
      }

      if (onStatus) {
        onStatus(`上传分块 ${uploadedChunks + 1}/${totalChunks}`);
      }

      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);

      try {
        // 使用带重试的上传函数
        await uploadChunkWithRetry(chunk, i);

        // 标记该分块为已上传
        uploadedChunkIndexes.add(i);
        uploadedChunks++;

        // 更新进度
        const progress = Math.round((uploadedChunks / totalChunks) * 100);
        if (onProgress) {
          onProgress(progress, uploadedChunks, totalChunks);
        }
      } catch (error) {
        console.error(`上传分块 ${i + 1}/${totalChunks} 失败:`, error);
        isCancelled = true;
        // 尝试通知后端清理资源
        try {
          await fileApi.cancelUpload({ uploadId });
        } catch (cleanupError) {
          console.warn("清理上传资源失败:", cleanupError);
        }
        throw error;
      }
    }

    if (onStatus) {
      onStatus(`完成上传: ${file.name}`);
    }

    return { success: true, uploadId };
  }

  /**
   * 上传小文件（普通上传）
   * @param {File} file - 要上传的文件
   * @param {Object} options - 上传选项
   * @param {string} options.uploadPath - 上传路径
   * @returns {Promise<Object>} 上传结果
   */
  static async uploadSmallFile(file, options = {}) {
    const { uploadPath } = options;

    // 使用FormData上传文件
    const formData = new FormData();
    formData.append("path", uploadPath);
    formData.append("file", file);

    // 使用封装的API上传文件
    return await fileApi.uploadFile(formData);
  }
}

export { FileUploader };
