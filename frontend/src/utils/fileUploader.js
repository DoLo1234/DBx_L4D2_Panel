/**
 * 文件上传工具类
 * 处理大文件分片上传，使用Web Worker进行异步处理
 */
import { fileApi } from "../api";

/**
 * 并发上传池
 * 生产者不断添加分片，消费者按并发限制上传
 * 切好一个分片就立即投入上传，有空位就上传，没空位就排队
 */
class UploadPool {
  /**
   * @param {Object} options
   * @param {number} options.maxConcurrency - 最大并发上传数
   * @param {Function} options.uploadFn - 上传函数 (chunkData, chunkIndex) => Promise
   * @param {Function} options.onChunkDone - 单个分片上传完成回调
   * @param {Function} options.onChunkSkip - 跳过已上传分片的回调
   * @param {Set} options.uploadedChunkIndexes - 已上传的分片索引集合
   */
  constructor(options) {
    this.maxConcurrency = options.maxConcurrency;
    this.uploadFn = options.uploadFn;
    this.onChunkDone = options.onChunkDone;
    this.onChunkSkip = options.onChunkSkip;
    this.uploadedChunkIndexes = options.uploadedChunkIndexes;

    this.queue = []; // 待上传分片队列
    this.activeCount = 0; // 当前正在上传的数量
    this.allChunksReceived = false; // 生产者是否已结束
    this.settled = false; // 池是否已结束（成功或失败）
    this.error = null;

    this._resolve = null;
    this._reject = null;
    this._promise = new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
  }

  /**
   * 添加一个就绪的分片到队列
   */
  addChunk(chunk) {
    if (this.settled) return;
    this.queue.push(chunk);
    this._schedule();
  }

  /**
   * 标记所有分片已接收完毕（生产者结束）
   */
  markAllReceived() {
    if (this.settled) return;
    this.allChunksReceived = true;
    this._checkDone();
  }

  /**
   * 等待上传池完成（所有分片上传成功或遇到错误）
   */
  waitForCompletion() {
    return this._promise;
  }

  /**
   * 调度上传：从队列中取出分片，有空位就启动上传
   */
  _schedule() {
    if (this.settled) return;

    while (this.queue.length > 0 && this.activeCount < this.maxConcurrency) {
      const chunk = this.queue.shift();

      // 跳过已上传的分片，不计入并发
      if (this.uploadedChunkIndexes.has(chunk.chunkIndex)) {
        this.onChunkSkip(chunk);
        continue; // 继续取下一个，不占并发位
      }

      this.activeCount++;

      this.uploadFn(chunk.chunkData, chunk.chunkIndex)
        .then(() => {
          if (this.settled) return;
          this.onChunkDone(chunk);
        })
        .catch((err) => {
          if (!this.settled) {
            this.settled = true;
            this.error = err;
            this._reject(err);
          }
        })
        .finally(() => {
          this.activeCount--;
          if (!this.settled) {
            this._schedule();
            this._checkDone();
          }
        });
    }
  }

  /**
   * 检查是否全部完成
   */
  _checkDone() {
    if (this.settled) return;
    if (
      this.allChunksReceived &&
      this.queue.length === 0 &&
      this.activeCount === 0
    ) {
      this.settled = true;
      this._resolve();
    }
  }
}

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
   * @param {number} options.maxConcurrency - 最大并发上传数（默认10）
   * @returns {Promise<Object>} 上传结果
   */
  static async uploadLargeFile(file, options = {}) {
    const {
      uploadPath,
      chunkSize = 5 * 1024 * 1024,
      onProgress,
      onStatus,
      onHashProgress,
      maxRetries = 5,
      maxConcurrency = 10,
    } = options;

    let enableResume = options.enableResume ?? false;

    const totalChunks = Math.ceil(file.size / chunkSize);
    let uploadId;
    let uploadedChunks = 0;
    let uploadedChunkIndexes = new Set();
    let isCancelled = false;

    // 带重试的上传函数
    const uploadChunkWithRetry = async (
      chunkData,
      chunkIndex,
      retryCount = 0,
    ) => {
      try {
        if (isCancelled) throw new Error("上传已取消");

        const formData = new FormData();
        formData.append("uploadId", uploadId);
        formData.append("chunkIndex", chunkIndex.toString());
        formData.append(
          "chunk",
          new Blob([chunkData]),
          `chunk_${uploadId}_${chunkIndex}`,
        );

        if (onStatus && retryCount > 0) {
          onStatus(
            `正在上传分块 ${chunkIndex + 1}/${totalChunks} (重试 ${retryCount}/${maxRetries})...`,
          );
        }
        await fileApi.uploadChunk(formData);
      } catch (error) {
        if (isCancelled) throw new Error("上传已取消");

        console.error(`分块 ${chunkIndex} 上传失败:`, error);

        if (retryCount < maxRetries) {
          const waitTime = 2000 * (retryCount + 1);
          console.warn(
            `分块 ${chunkIndex + 1}/${totalChunks} 上传失败，${waitTime / 1000}秒后重试 (${retryCount + 1}/${maxRetries})...`,
          );
          if (onStatus) {
            onStatus(
              `分块 ${chunkIndex + 1}/${totalChunks} 上传失败，${waitTime / 1000}秒后重试 (${retryCount + 1}/${maxRetries})...`,
            );
          }
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          return uploadChunkWithRetry(chunkData, chunkIndex, retryCount + 1);
        }

        console.error(
          `分块 ${chunkIndex + 1}/${totalChunks} 上传失败，已重试 ${maxRetries} 次`,
        );
        throw new Error(
          `分块 ${chunkIndex + 1}/${totalChunks} 上传失败，已重试 ${maxRetries} 次`,
        );
      }
    };

    // 如果启用断点续传，计算文件哈希
    let fileHash = null;
    if (enableResume) {
      if (onStatus) onStatus("计算文件哈希...");
      try {
        fileHash = await this.calculateFileHash(file, onHashProgress);
        if (onStatus)
          onStatus(`文件哈希计算完成: ${fileHash.substring(0, 8)}...`);
      } catch (error) {
        console.warn("计算文件哈希失败，禁用断点续传:", error);
        enableResume = false;
      }
    }

    // 初始化上传
    if (onStatus) onStatus("初始化上传...");
    const initResponse = await fileApi.initChunkUpload({
      filename: file.name,
      totalSize: file.size,
      chunkSize,
      totalChunks,
      uploadPath,
      directoryType: "SERVER_FILE",
      fileHash,
    });
    const initData = initResponse.data || {};
    uploadId = initData.uploadId;

    // 如果服务器返回了已上传的块，记录下来
    if (initData.uploadedChunks) {
      uploadedChunkIndexes = new Set(initData.uploadedChunks);
      uploadedChunks = uploadedChunkIndexes.size;
      if (onStatus)
        onStatus(`发现已上传 ${uploadedChunks} 个分块，继续上传...`);
    } else {
      if (onStatus) onStatus("开始上传文件...");
    }

    const updateProgress = () => {
      const progress = Math.round((uploadedChunks / totalChunks) * 100);
      if (onProgress) onProgress(progress, uploadedChunks, totalChunks);
    };

    // 创建并发上传池
    const pool = new UploadPool({
      maxConcurrency,
      uploadedChunkIndexes,
      uploadFn: uploadChunkWithRetry,
      onChunkDone: (chunk) => {
        uploadedChunkIndexes.add(chunk.chunkIndex);
        uploadedChunks++;
        updateProgress();
      },
      onChunkSkip: () => {
        uploadedChunks++;
        updateProgress();
      },
    });

    // 检查是否支持Web Worker
    if (typeof Worker !== "undefined") {
      return new Promise((resolve, reject) => {
        let worker;

        try {
          worker = new Worker(
            new URL("./fileUploadWorker.js", import.meta.url),
          );
        } catch (error) {
          console.warn("Web Worker初始化失败，回退到同步上传:", error);
          this._uploadLargeFileSyncFallback(
            file,
            chunkSize,
            totalChunks,
            uploadId,
            uploadedChunkIndexes,
            uploadedChunks,
            onProgress,
            onStatus,
            maxRetries,
            maxConcurrency,
          )
            .then(resolve)
            .catch(reject);
          return;
        }

        worker.onmessage = (event) => {
          const { type, data } = event.data;

          switch (type) {
            case "status":
              if (onStatus) onStatus(data.message);
              break;

            case "chunk":
              // 分片就绪，立即投入上传池
              pool.addChunk(data);
              break;

            case "complete":
              // 切片全部完成，标记生产结束
              worker.terminate();
              pool.markAllReceived();
              pool
                .waitForCompletion()
                .then(() => {
                  if (onStatus) onStatus(`完成上传: ${file.name}`);
                  resolve({ success: true, uploadId });
                })
                .catch(async (error) => {
                  isCancelled = true;
                  try {
                    await fileApi.cancelUpload({ uploadId });
                  } catch (cleanupError) {
                    console.warn("清理上传资源失败:", cleanupError);
                  }
                  reject(error);
                });
              break;

            case "error":
              worker.terminate();
              reject(new Error(data.error));
              break;
          }
        };

        worker.onerror = (error) => {
          worker.terminate();
          reject(new Error(`Worker错误: ${error.message}`));
        };

        // 发送切片任务给Worker
        worker.postMessage({
          type: "slice",
          data: { file, chunkSize, totalChunks },
        });
      });
    } else {
      // 不支持Web Worker，使用同步切片 + 并发上传
      return this._uploadLargeFileSyncFallback(
        file,
        chunkSize,
        totalChunks,
        uploadId,
        uploadedChunkIndexes,
        uploadedChunks,
        onProgress,
        onStatus,
        maxRetries,
        maxConcurrency,
      );
    }
  }

  /**
   * 无Worker回退：同步切片 + 并发上传
   * @private
   */
  static async _uploadLargeFileSyncFallback(
    file,
    chunkSize,
    totalChunks,
    uploadId,
    uploadedChunkIndexes,
    uploadedChunks,
    onProgress,
    onStatus,
    maxRetries,
    maxConcurrency,
  ) {
    let isCancelled = false;

    const uploadChunkWithRetry = async (chunk, chunkIndex, retryCount = 0) => {
      try {
        if (isCancelled) throw new Error("上传已取消");

        const formData = new FormData();
        formData.append("uploadId", uploadId);
        formData.append("chunkIndex", chunkIndex.toString());
        formData.append("chunk", chunk, `chunk_${uploadId}_${chunkIndex}`);

        if (onStatus && retryCount > 0) {
          onStatus(
            `正在上传分块 ${chunkIndex + 1}/${totalChunks} (重试 ${retryCount}/${maxRetries})...`,
          );
        }
        await fileApi.uploadChunk(formData);
      } catch (error) {
        if (isCancelled) throw new Error("上传已取消");

        console.error(`分块 ${chunkIndex} 上传失败:`, error);

        if (retryCount < maxRetries) {
          const waitTime = 2000 * (retryCount + 1);
          console.warn(
            `分块 ${chunkIndex + 1}/${totalChunks} 上传失败，${waitTime / 1000}秒后重试 (${retryCount + 1}/${maxRetries})...`,
          );
          if (onStatus) {
            onStatus(
              `分块 ${chunkIndex + 1}/${totalChunks} 上传失败，${waitTime / 1000}秒后重试 (${retryCount + 1}/${maxRetries})...`,
            );
          }
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          return uploadChunkWithRetry(chunk, chunkIndex, retryCount + 1);
        }

        throw new Error(
          `分块 ${chunkIndex + 1}/${totalChunks} 上传失败，已重试 ${maxRetries} 次`,
        );
      }
    };

    const updateProgress = () => {
      const progress = Math.round((uploadedChunks / totalChunks) * 100);
      if (onProgress) onProgress(progress, uploadedChunks, totalChunks);
    };

    // 同步切片，将所有分片加入上传池
    const pool = new UploadPool({
      maxConcurrency,
      uploadedChunkIndexes,
      uploadFn: (chunkData, chunkIndex) =>
        uploadChunkWithRetry(chunkData, chunkIndex),
      onChunkDone: (chunk) => {
        uploadedChunkIndexes.add(chunk.chunkIndex);
        uploadedChunks++;
        updateProgress();
      },
      onChunkSkip: () => {
        uploadedChunks++;
        updateProgress();
      },
    });

    for (let i = 0; i < totalChunks; i++) {
      if (uploadedChunkIndexes.has(i)) {
        // 已上传的分片，直接加入池让池跳过
        pool.addChunk({ chunkIndex: i, chunkData: null });
      } else {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);
        pool.addChunk({ chunkIndex: i, chunkData: chunk });
      }
    }

    pool.markAllReceived();

    try {
      await pool.waitForCompletion();
    } catch (error) {
      isCancelled = true;
      try {
        await fileApi.cancelUpload({ uploadId });
      } catch (cleanupError) {
        console.warn("清理上传资源失败:", cleanupError);
      }
      throw error;
    }

    if (onStatus) onStatus(`完成上传: ${file.name}`);
    return { success: true, uploadId };
  }

  /**
   * 上传小文件（普通上传）
   * @param {File} file - 要上传的文件
   * @param {Object} options - 上传选项
   * @param {string} options.uploadPath - 上传路径
   * @param {Function} options.onProgress - 进度回调函数
   * @returns {Promise<Object>} 上传结果
   */
  static async uploadSmallFile(file, options = {}) {
    const { uploadPath, onProgress } = options;

    const formData = new FormData();
    formData.append("path", uploadPath);
    formData.append("file", file);

    return await fileApi.uploadFile(formData, {
      timeout: 600000,
      onUploadProgress: onProgress
        ? (progressEvent) => {
            const percentCompleted = progressEvent.total
              ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
              : 0;
            onProgress(percentCompleted);
          }
        : undefined,
    });
  }

  /**
   * 并发执行任务池
   * 最多同时执行 maxConcurrency 个任务，完成一个立即补充下一个
   * @param {Array<Function>} taskFns - 任务函数数组，每个函数返回一个 Promise
   * @param {Object} options - 配置选项
   * @param {number} options.maxConcurrency - 最大并发数，默认10
   * @returns {Promise<{results: Array, errors: Array}>} 所有任务的结果
   */
  static async concurrentRun(taskFns, options = {}) {
    const { maxConcurrency = 10 } = options;
    const results = new Array(taskFns.length);
    const errors = [];

    let queueIndex = 0;
    let activeCount = 0;

    return new Promise((resolve) => {
      const runNext = () => {
        while (queueIndex < taskFns.length && activeCount < maxConcurrency) {
          const currentIndex = queueIndex++;
          activeCount++;

          taskFns[currentIndex]()
            .then((result) => {
              results[currentIndex] = result;
            })
            .catch((error) => {
              errors.push({ index: currentIndex, error });
            })
            .finally(() => {
              activeCount--;
              runNext();
              checkDone();
            });
        }
      };

      const checkDone = () => {
        if (queueIndex >= taskFns.length && activeCount === 0) {
          resolve({ results, errors });
        }
      };

      runNext();
      checkDone();
    });
  }
}

export { FileUploader };
