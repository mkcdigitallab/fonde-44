#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const endpoint = process.env.MINIO_ENDPOINT;
const accessKeyId = process.env.MINIO_ACCESS_KEY;
const secretAccessKey = process.env.MINIO_SECRET_KEY;
const bucket = process.env.MINIO_BUCKET || "fonde44";
const region = process.env.S3_REGION || "us-east-1";
const forcePathStyle = process.env.S3_FORCE_PATH_STYLE !== "false";

function fail(message) {
  console.error(`FAIL — ${message}`);
  process.exitCode = 1;
}

function anonymousObjectUrl(key) {
  if (!endpoint) {
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  }

  const url = new URL(endpoint);
  if (forcePathStyle) {
    url.pathname = `${url.pathname.replace(/\/$/, "")}/${bucket}/${key}`;
  } else {
    url.hostname = `${bucket}.${url.hostname}`;
    url.pathname = `${url.pathname.replace(/\/$/, "")}/${key}`;
  }
  return url.toString();
}

if (!endpoint || !accessKeyId || !secretAccessKey) {
  fail("MINIO_ENDPOINT, MINIO_ACCESS_KEY et MINIO_SECRET_KEY sont requis.");
} else {
  const client = new S3Client({
    endpoint,
    region,
    forcePathStyle,
    credentials: { accessKeyId, secretAccessKey },
  });
  const key = `storage-check/${randomUUID()}.txt`;
  const payload = Buffer.from("Fondé 44 private storage check");
  let objectWritten = false;

  try {
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: payload,
      ContentType: "text/plain",
    }));
    objectWritten = true;
    console.log("PASS — écriture signée dans le bucket.");

    const stored = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const chunks = [];
    for await (const chunk of stored.Body) chunks.push(Buffer.from(chunk));
    const received = Buffer.concat(chunks);
    if (!received.equals(payload)) {
      throw new Error("Le contenu relu ne correspond pas au contenu écrit.");
    }
    console.log("PASS — lecture signée et contenu vérifié.");

    const response = await fetch(anonymousObjectUrl(key), { redirect: "manual" });
    if (response.ok) {
      throw new Error("L'objet est lisible sans authentification : le bucket ou l'objet semble public.");
    }
    if (![401, 403, 404].includes(response.status)) {
      throw new Error(`La lecture anonyme a retourné HTTP ${response.status}, résultat non concluant.`);
    }
    console.log("PASS — la lecture anonyme est refusée.");

    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    objectWritten = false;
    console.log("PASS — objet de test supprimé.");
  } catch (error) {
    fail(error instanceof Error ? error.message : "test de stockage échoué.");
  } finally {
    if (objectWritten) {
      try {
        await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
      } catch {
        fail("suppression de l'objet de test impossible ; vérifiez le bucket.");
      }
    }
    client.destroy();
  }
}
