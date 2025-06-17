const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

exports.fusionarAudios = async (audio1Buffer, audio2Buffer) => {
  const tmpDir = os.tmpdir();
  const id = uuidv4();

  const path1 = path.join(tmpDir, `${id}_tts.mp3`);
  const path2 = path.join(tmpDir, `${id}_etapa.mp3`);
  const outputPath = path.join(tmpDir, `${id}_final.mp3`);

  fs.writeFileSync(path1, audio1Buffer);
  fs.writeFileSync(path2, audio2Buffer);

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(path1)
      .input(path2)
      .on('error', reject)
      .on('end', () => {
        const finalBuffer = fs.readFileSync(outputPath);
        fs.unlinkSync(path1);
        fs.unlinkSync(path2);
        fs.unlinkSync(outputPath);
        resolve(finalBuffer);
      })
      .mergeToFile(outputPath, tmpDir);
  });
};
