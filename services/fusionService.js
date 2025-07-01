// services/fusionService.js

const ffmpeg = require('fluent-ffmpeg');
const { promises: fs } = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

/**
 * Fusiona dos buffers de audio en un solo MP3.
 *
 * @param {Buffer} ttsBuffer   - Audio generado por TTS.
 * @param {Buffer} baseBuffer  - Audio base de la etapa.
 * @returns {Promise<Buffer>}  Buffer con el audio final.
 */
async function fusionarAudios(ttsBuffer, baseBuffer) {
  const tmpDir = os.tmpdir();
  const id = uuidv4();
  const ttsPath = path.join(tmpDir, `${id}_tts.mp3`);
  const etapaPath = path.join(tmpDir, `${id}_etapa.mp3`);
  const outputPath = path.join(tmpDir, `${id}_final.mp3`);

  // Escribir archivos temporales
  await fs.writeFile(ttsPath, ttsBuffer);
  await fs.writeFile(etapaPath, baseBuffer);

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(ttsPath)
      .input(etapaPath)
      .on('error', async (err) => {
        await cleanupFiles([ttsPath, etapaPath, outputPath]);
        reject(err);
      })
      .on('end', async () => {
        try {
          const finalBuffer = await fs.readFile(outputPath);
          await cleanupFiles([ttsPath, etapaPath, outputPath]);
          resolve(finalBuffer);
        } catch (readErr) {
          await cleanupFiles([ttsPath, etapaPath, outputPath]);
          reject(readErr);
        }
      })
      .mergeToFile(outputPath, tmpDir);
  });
}

/**
 * Elimina un array de archivos de forma asíncrona,
 * ignorando errores si no existen.
 *
 * @param {string[]} files - Paths de los archivos a eliminar.
 */
async function cleanupFiles(files) {
  await Promise.all(files.map(async (file) => {
    try {
      await fs.unlink(file);
    } catch {
      // ignorar cualquier error de eliminación
    }
  }));
}

module.exports = { fusionarAudios };
