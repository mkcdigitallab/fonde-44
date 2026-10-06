import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { MediaStorage } from "./media-storage.js";

export class MinioMediaStorage extends MediaStorage {
  constructor({ endpoint, accessKeyId, secretAccessKey, bucket, region = "us-east-1", forcePathStyle = true, autoCreateBucket = false }) {
    super();
    this.bucket = bucket;
    this.autoCreateBucket = autoCreateBucket;
    this.client = new S3Client({
      endpoint,
      region,
      forcePathStyle,
      credentials: { accessKeyId, secretAccessKey }
    });
  }

  async ensureBucket() {
    if (!this.autoCreateBucket) return;
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch (error) {
      const status = error?.$metadata?.httpStatusCode;
      if (status !== 404 && error?.name !== "NotFound" && error?.name !== "NoSuchBucket") throw error;
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }

  async put({ key, buffer, contentType }) {
    await this.ensureBucket();
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType
    }));
    return { key, url: `/api/media/object?key=${encodeURIComponent(key)}` };
  }

  async get({ key, range }) {
    await this.ensureBucket();
    return this.client.send(new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ...(range ? { Range: `bytes=${range.start}-${range.end ?? ""}` } : {})
    }));
  }
}
