import multer from 'multer';
import os from 'os';

export const upload = multer({
  dest: os.tmpdir(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
  },
});