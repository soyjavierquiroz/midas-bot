// services/minioService.js

const { S3Client, GetObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const streamToBuffer = require('stream-to-buffer');
const { promisify } = require('util');
const config = require('../config');

const s3 = new S3Client({
  region: config.minio.region || 'us-east-1',
  endpoint: config.minio.endpoint,
  credentials: {
    accessKeyId: config.minio.accessKey,
    secretAccessKey: config.minio.secretKey,
  },
  forcePathStyle: (typeof config.minio.forcePathStyle === 'boolean') ? config.minio.forcePathStyle : true,
});

const toBuffer = promisify(streamToBuffer);

/** Descarga una imagen y devuelve base64 */
async function getImageBase64(bucket, key) {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await s3.send(command);
  const buffer = await toBuffer(response.Body);
  return buffer.toString('base64');
}

/** NUEVO: descarga cualquier objeto como Buffer (para /test-audio) */
async function getAudioBuffer(bucket, key) {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await s3.send(command);
  return toBuffer(response.Body);
}

/** Obtiene un audio pregrabado aleatorio */
async function obtenerAudioAleatorio(userId, etapa) {
  const prefix = `audios_pregrabados/${userId}_${etapa}_`;
  const bucket = 'bot-uploads';

  const listCommand = new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix });
  const listed = await s3.send(listCommand);

  if (!listed.Contents || listed.Contents.length === 0) {
    throw new Error('No hay audios pregrabados');
  }

  const randomIndex = Math.floor(Math.random() * listed.Contents.length);
  const randomFileKey = listed.Contents[randomIndex].Key;
  const getCommand = new GetObjectCommand({ Bucket: bucket, Key: randomFileKey });
  const audioResponse = await s3.send(getCommand);
  return toBuffer(audioResponse.Body);
}

module.exports = {
  getImageBase64,
  getAudioBuffer,       // ← NUEVO
  obtenerAudioAleatorio,
};
