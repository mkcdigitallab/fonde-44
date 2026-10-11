import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { MinioMediaStorage } from "./minio-media-storage.js";
import { MediaStorage } from "./media-storage.js";

const MIME_BY_EXTENSION = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
  avif: "image/avif", webm: "audio/webm", ogg: "audio/ogg", mp4: "audio/mp4",
  mp3: "audio/mpeg", wav: "audio/wav",
};

export function createStorage() {
  if (process.env.MINIO_ENDPOINT && process.env.MINIO_ACCESS_KEY && process.env.MINIO_SECRET_KEY) {
    return new MinioMediaStorage({
      endpoint: process.env.MINIO_ENDPOINT,
      accessKeyId: process.env.MINIO_ACCESS_KEY,
      secretAccessKey: process.env.MINIO_SECRET_KEY,
      bucket: process.env.MINIO_BUCKET || "fonde44",
      region: process.env.S3_REGION || "us-east-1",
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
      autoCreateBucket: process.env.S3_AUTO_CREATE_BUCKET === "true",
    });
  }
  return new LocalMediaStorage();
}

export class LocalMediaStorage extends MediaStorage {
  constructor() {
    super();
    this.root = process.env.MEDIA_DIR || path.resolve(process.cwd(), "storage/media");
  }

  async put({ key, buffer, contentType }) {
    const target = path.join(this.root, key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, buffer);
    return { key, url: `/api/media/object?key=${encodeURIComponent(key)}`, contentType };
  }

  async get({ key, range }) {
    const target = path.join(this.root, key);
    const stat = await fs.stat(target);
    const extension = path.extname(key).slice(1).toLowerCase();
    const contentType = MIME_BY_EXTENSION[extension] || "application/octet-stream";
    const start = range?.start ?? 0;
    const end = Math.min(range?.end ?? stat.size - 1, stat.size - 1);
    if (start < 0 || start >= stat.size || end < start) {
      const error = new Error("invalid_range");
      error.code = "INVALID_RANGE";
      throw error;
    }
    return {
      Body: createReadStream(target, { start, end }),
      ContentType: contentType,
      ContentLength: end - start + 1,
      ContentRange: `bytes ${start}-${end}/${stat.size}`,
      AcceptRanges: "bytes",
      ContentSize: stat.size,
    };
  }
}
