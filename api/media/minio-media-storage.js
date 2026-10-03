import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { MediaStorage } from "./media-storage.js";

export class MinioMediaStorage extends MediaStorage {
  constructor({ endpoint, accessKeyId, secretAccessKey, bucket }) {
    super();
    this.bucket = bucket;
    this.client = new S3Client({
      endpoint, region: "us-east-1", forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey }
    });
  }

  async put({ key, buffer, contentType }) {
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket, Key: key, Body: buffer, ContentType: contentType
    }));
    return { key, url: `/api/media/object?key=${encodeURIComponent(key)}` };
  }

  async get({ key }) {
    return this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
