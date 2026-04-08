/**
 * 文件上传Web Worker
 * 在后台线程中处理大文件分片
 */

// 监听主线程消息
self.onmessage = async (event) => {
  const { type, data } = event.data;

  if (type === "slice") {
    await handleFileSlice(data);
  }
};

/**
 * 处理文件切片
 * @param {Object} data - 切片数据
 * @param {File} data.file - 要上传的文件
 * @param {number} data.chunkSize - 分块大小
 * @param {number} data.totalChunks - 总分块数
 */
async function handleFileSlice(data) {
  const { file, chunkSize, totalChunks } = data;

  try {
    // 遍历所有分块
    for (let i = 0; i < totalChunks; i++) {
      // 发送进度消息
      self.postMessage({
        type: "status",
        data: {
          message: `处理分块 ${i + 1}/${totalChunks}`,
        },
      });

      // 计算分块的起始和结束位置
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);

      // 切割文件获取分块
      const chunk = file.slice(start, end);

      // 读取分块内容为 ArrayBuffer
      const chunkData = await readChunkAsArrayBuffer(chunk);

      // 发送分块数据给主线程
      self.postMessage({
        type: "chunk",
        data: {
          chunkIndex: i,
          chunkData,
          totalChunks: totalChunks,
        },
      });
    }

    // 切片完成
    self.postMessage({
      type: "complete",
      data: {
        message: "文件切片完成",
      },
    });
  } catch (error) {
    // 发送错误消息
    self.postMessage({
      type: "error",
      data: {
        error: error.message,
      },
    });
  }
}

/**
 * 读取分块内容为 ArrayBuffer
 * @param {Blob} chunk - 文件分块
 * @returns {Promise<ArrayBuffer>} 分块内容
 */
function readChunkAsArrayBuffer(chunk) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(chunk);
  });
}
