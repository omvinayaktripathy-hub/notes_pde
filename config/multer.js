const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Private storage directory outside public web root
const uploadDir = path.join(__dirname, '..', 'storage', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage configuration with sanitized naming, UUID/random entropy and extension preservation
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const baseName = path.basename(file.originalname, ext)
            .replace(/[^a-zA-Z0-9_-]/g, '_')
            .substring(0, 40);
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${baseName}-${uniqueSuffix}${ext}`);
    }
});

// Explicit allowed extensions and MIME types (SVG, HTML, JS, EXE strictly blocked to prevent XSS and RCE)
const ALLOWED_MIME_TYPES = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/rtf',
    'application/rtf',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream' // strictly validated with extension
]);

const ALLOWED_EXTENSIONS = new Set([
    '.pdf', '.doc', '.docx', '.ppt', '.pptx',
    '.txt', '.rtf', '.csv', '.xlsx', '.xls',
    '.jpg', '.jpeg', '.png', '.webp', '.zip', '.rar', '.ipynb'
]);

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    // Check extension
    if (!ALLOWED_EXTENSIONS.has(ext)) {
        return cb(new Error('Invalid file extension. Only academic documents, presentations, and images are permitted.'), false);
    }

    // Check declared MIME type
    if (file.mimetype && !ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
        return cb(new Error(`Forbidden file MIME type: ${file.mimetype}`), false);
    }

    cb(null, true);
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 25 * 1024 * 1024, // 25 MB max limit
        files: 1
    },
    fileFilter: fileFilter
});

upload.uploadDir = uploadDir;
module.exports = upload;

