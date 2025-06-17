const { S3Client, GetObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const streamToBuffer = require('stream-to-buffer');
const { promisify } = require('util');

const s3 = new S3Client({
  region: process.env.MINIO_REGION || 'us-east-1',
  endpoint: process.env.MINIO_ENDPOINT,
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY,
    secretAccessKey: process.env.MINIO_SECRET_KEY
  },
  forcePathStyle: true
});

const toBuffer = promisify(streamToBuffer);

exports.getImageBase64 = async (bucket, key) => {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await s3.send(command);
  const buffer = await toBuffer(response.Body);
  return buffer.toString('base64');
};

exports.obtenerAudioAleatorio = async (userId, etapa) => {
  const prefix = `audios_pregrabados/${userId}_${etapa}_`;
  const bucket = 'bot-uploads';

  const listCommand = new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix });
  const listed = await s3.send(listCommand);

  if (!listed.Contents || listed.Contents.length === 0) throw new Error('No hay audios pregrabados');

  const randomFile = listed.Contents[Math.floor(Math.random() * listed.Contents.length)].Key;
  const getCommand = new GetObjectCommand({ Bucket: bucket, Key: randomFile });
  const audio = await s3.send(getCommand);
  return toBuffer(audio.Body);
};
