const path = require('path');

const projectRoot = path.resolve(__dirname);

function getUploadsDir() {
  return path.resolve(process.env.UPLOADS_DIR || path.join(projectRoot, 'uploads'));
}

module.exports = { getUploadsDir };
