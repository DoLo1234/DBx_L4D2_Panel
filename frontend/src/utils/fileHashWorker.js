/**
 * 文件哈希计算Web Worker
 * 用于在后台计算文件的MD5哈希值
 */

// 内联的MD5实现
class MD5 {
  constructor() {
    this.K = [
      0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee,
      0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
      0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be,
      0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
      0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa,
      0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
      0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed,
      0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
      0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c,
      0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
      0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05,
      0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
      0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039,
      0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
      0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1,
      0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391
    ];

    this.R = [
      7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
      5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
      4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
      6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
    ];

    // 初始化状态
    this.state = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476];
    this.totalLength = 0;
  }

  rotateLeft(x, c) {
    return (x << c) | (x >>> (32 - c));
  }

  addUnsigned(x, y) {
    const lsw = (x & 0xffff) + (y & 0xffff);
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xffff);
  }

  F(x, y, z) {
    return (x & y) | (~x & z);
  }

  G(x, y, z) {
    return (x & z) | (y & ~z);
  }

  H(x, y, z) {
    return x ^ y ^ z;
  }

  I(x, y, z) {
    return y ^ (x | ~z);
  }

  FF(a, b, c, d, x, s, ac) {
    a = this.addUnsigned(a, this.addUnsigned(this.addUnsigned(this.F(b, c, d), x), ac));
    a = this.rotateLeft(a, s);
    a = this.addUnsigned(a, b);
    return a;
  }

  GG(a, b, c, d, x, s, ac) {
    a = this.addUnsigned(a, this.addUnsigned(this.addUnsigned(this.G(b, c, d), x), ac));
    a = this.rotateLeft(a, s);
    a = this.addUnsigned(a, b);
    return a;
  }

  HH(a, b, c, d, x, s, ac) {
    a = this.addUnsigned(a, this.addUnsigned(this.addUnsigned(this.H(b, c, d), x), ac));
    a = this.rotateLeft(a, s);
    a = this.addUnsigned(a, b);
    return a;
  }

  II(a, b, c, d, x, s, ac) {
    a = this.addUnsigned(a, this.addUnsigned(this.addUnsigned(this.I(b, c, d), x), ac));
    a = this.rotateLeft(a, s);
    a = this.addUnsigned(a, b);
    return a;
  }

  transform(block) {
    let a = this.state[0];
    let b = this.state[1];
    let c = this.state[2];
    let d = this.state[3];

    const x = new Array(16);
    for (let i = 0; i < 16; i++) {
      x[i] = block[i * 4] + (block[i * 4 + 1] << 8) + (block[i * 4 + 2] << 16) + (block[i * 4 + 3] << 24);
    }

    a = this.FF(a, b, c, d, x[0], this.R[0], this.K[0]);
    d = this.FF(d, a, b, c, x[1], this.R[1], this.K[1]);
    c = this.FF(c, d, a, b, x[2], this.R[2], this.K[2]);
    b = this.FF(b, c, d, a, x[3], this.R[3], this.K[3]);
    a = this.FF(a, b, c, d, x[4], this.R[4], this.K[4]);
    d = this.FF(d, a, b, c, x[5], this.R[5], this.K[5]);
    c = this.FF(c, d, a, b, x[6], this.R[6], this.K[6]);
    b = this.FF(b, c, d, a, x[7], this.R[7], this.K[7]);
    a = this.FF(a, b, c, d, x[8], this.R[8], this.K[8]);
    d = this.FF(d, a, b, c, x[9], this.R[9], this.K[9]);
    c = this.FF(c, d, a, b, x[10], this.R[10], this.K[10]);
    b = this.FF(b, c, d, a, x[11], this.R[11], this.K[11]);
    a = this.FF(a, b, c, d, x[12], this.R[12], this.K[12]);
    d = this.FF(d, a, b, c, x[13], this.R[13], this.K[13]);
    c = this.FF(c, d, a, b, x[14], this.R[14], this.K[14]);
    b = this.FF(b, c, d, a, x[15], this.R[15], this.K[15]);

    a = this.GG(a, b, c, d, x[1], this.R[16], this.K[16]);
    d = this.GG(d, a, b, c, x[6], this.R[17], this.K[17]);
    c = this.GG(c, d, a, b, x[11], this.R[18], this.K[18]);
    b = this.GG(b, c, d, a, x[0], this.R[19], this.K[19]);
    a = this.GG(a, b, c, d, x[5], this.R[20], this.K[20]);
    d = this.GG(d, a, b, c, x[10], this.R[21], this.K[21]);
    c = this.GG(c, d, a, b, x[15], this.R[22], this.K[22]);
    b = this.GG(b, c, d, a, x[4], this.R[23], this.K[23]);
    a = this.GG(a, b, c, d, x[9], this.R[24], this.K[24]);
    d = this.GG(d, a, b, c, x[14], this.R[25], this.K[25]);
    c = this.GG(c, d, a, b, x[3], this.R[26], this.K[26]);
    b = this.GG(b, c, d, a, x[8], this.R[27], this.K[27]);
    a = this.GG(a, b, c, d, x[13], this.R[28], this.K[28]);
    d = this.GG(d, a, b, c, x[2], this.R[29], this.K[29]);
    c = this.GG(c, d, a, b, x[7], this.R[30], this.K[30]);
    b = this.GG(b, c, d, a, x[12], this.R[31], this.K[31]);

    a = this.HH(a, b, c, d, x[5], this.R[32], this.K[32]);
    d = this.HH(d, a, b, c, x[8], this.R[33], this.K[33]);
    c = this.HH(c, d, a, b, x[11], this.R[34], this.K[34]);
    b = this.HH(b, c, d, a, x[14], this.R[35], this.K[35]);
    a = this.HH(a, b, c, d, x[1], this.R[36], this.K[36]);
    d = this.HH(d, a, b, c, x[4], this.R[37], this.K[37]);
    c = this.HH(c, d, a, b, x[7], this.R[38], this.K[38]);
    b = this.HH(b, c, d, a, x[10], this.R[39], this.K[39]);
    a = this.HH(a, b, c, d, x[13], this.R[40], this.K[40]);
    d = this.HH(d, a, b, c, x[0], this.R[41], this.K[41]);
    c = this.HH(c, d, a, b, x[3], this.R[42], this.K[42]);
    b = this.HH(b, c, d, a, x[6], this.R[43], this.K[43]);
    a = this.HH(a, b, c, d, x[9], this.R[44], this.K[44]);
    d = this.HH(d, a, b, c, x[12], this.R[45], this.K[45]);
    c = this.HH(c, d, a, b, x[15], this.R[46], this.K[46]);
    b = this.HH(b, c, d, a, x[2], this.R[47], this.K[47]);

    a = this.II(a, b, c, d, x[0], this.R[48], this.K[48]);
    d = this.II(d, a, b, c, x[7], this.R[49], this.K[49]);
    c = this.II(c, d, a, b, x[14], this.R[50], this.K[50]);
    b = this.II(b, c, d, a, x[5], this.R[51], this.K[51]);
    a = this.II(a, b, c, d, x[12], this.R[52], this.K[52]);
    d = this.II(d, a, b, c, x[3], this.R[53], this.K[53]);
    c = this.II(c, d, a, b, x[10], this.R[54], this.K[54]);
    b = this.II(b, c, d, a, x[1], this.R[55], this.K[55]);
    a = this.II(a, b, c, d, x[8], this.R[56], this.K[56]);
    d = this.II(d, a, b, c, x[15], this.R[57], this.K[57]);
    c = this.II(c, d, a, b, x[6], this.R[58], this.K[58]);
    b = this.II(b, c, d, a, x[13], this.R[59], this.K[59]);
    a = this.II(a, b, c, d, x[4], this.R[60], this.K[60]);
    d = this.II(d, a, b, c, x[11], this.R[61], this.K[61]);
    c = this.II(c, d, a, b, x[2], this.R[62], this.K[62]);
    b = this.II(b, c, d, a, x[9], this.R[63], this.K[63]);

    this.state[0] = this.addUnsigned(this.state[0], a);
    this.state[1] = this.addUnsigned(this.state[1], b);
    this.state[2] = this.addUnsigned(this.state[2], c);
    this.state[3] = this.addUnsigned(this.state[3], d);
  }

  update(data) {
    const bytes = new Uint8Array(data);
    this.totalLength += bytes.length * 8;

    let offset = 0;
    while (offset < bytes.length) {
      const block = new Uint8Array(64);
      const blockSize = Math.min(64, bytes.length - offset);
      block.set(bytes.subarray(offset, offset + blockSize));
      offset += blockSize;

      if (blockSize === 64) {
        this.transform(block);
      } else {
        // 处理最后一个不完整的块
        this.finalBlock = block;
        this.finalBlockSize = blockSize;
      }
    }
  }

  final() {
    // 处理最后一个块
    if (this.finalBlock) {
      const block = this.finalBlock;
      const blockSize = this.finalBlockSize;

      // 填充数据
      block[blockSize] = 0x80;
      for (let i = blockSize + 1; i < 64; i++) {
        block[i] = 0;
      }

      // 如果块大小 >= 56，则需要额外的块来存储长度
      if (blockSize >= 56) {
        this.transform(block);
        const newBlock = new Uint8Array(64);
        for (let i = 0; i < 64; i++) {
          newBlock[i] = 0;
        }
        // 添加长度
        for (let i = 0; i < 8; i++) {
          newBlock[56 + i] = (this.totalLength >> (i * 8)) & 0xff;
        }
        this.transform(newBlock);
      } else {
        // 添加长度
        for (let i = 0; i < 8; i++) {
          block[56 + i] = (this.totalLength >> (i * 8)) & 0xff;
        }
        this.transform(block);
      }
    } else {
      // 处理空文件
      const block = new Uint8Array(64);
      block[0] = 0x80;
      for (let i = 0; i < 8; i++) {
        block[56 + i] = (this.totalLength >> (i * 8)) & 0xff;
      }
      this.transform(block);
    }

    // 生成最终哈希值
    let hash = "";
    for (let i = 0; i < 4; i++) {
      hash += this.toHexStr(this.state[i]);
    }
    return hash;
  }

  toHexStr(n) {
    const hexChars = "0123456789abcdef";
    let str = "";
    for (let i = 0; i < 4; i++) {
      str += hexChars.charAt((n >> (i * 8 + 4)) & 0x0f);
      str += hexChars.charAt((n >> (i * 8)) & 0x0f);
    }
    return str;
  }
}

// 分块读取文件并计算哈希
async function calculateFileHash(file, chunkSize) {
  const md5 = new MD5();
  const fileSize = file.size;
  let offset = 0;

  while (offset < fileSize) {
    const chunk = file.slice(offset, offset + chunkSize);
    const arrayBuffer = await readFileChunk(chunk);
    md5.update(arrayBuffer);
    offset += chunkSize;

    // 发送进度信息
    const progress = Math.min(offset / fileSize, 1);
    self.postMessage({ type: "progress", data: { progress } });
  }

  return md5.final();
}

// 读取文件块
function readFileChunk(chunk) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error("读取文件块失败"));
    reader.readAsArrayBuffer(chunk);
  });
}

// 监听消息
self.onmessage = async (event) => {
  const { type, data, chunkSize } = event.data;
  
  if (type === "hash") {
    try {
      if (data instanceof File) {
        // 处理文件对象
        const hash = await calculateFileHash(data, chunkSize || 10 * 1024 * 1024); // 默认10MB分块
        self.postMessage({ type: "hash", data: { hash } });
      } else {
        // 处理ArrayBuffer
        const md5 = new MD5();
        md5.update(data);
        const hash = md5.final();
        self.postMessage({ type: "hash", data: { hash } });
      }
    } catch (error) {
      console.error("计算哈希失败:", error);
      self.postMessage({ type: "error", data: { error: error.message } });
    }
  }
};
