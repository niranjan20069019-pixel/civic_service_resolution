const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const { authenticate } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG, WebP, GIF images allowed'));
  },
});

const router = Router();
router.use(authenticate);

router.post('/', (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) return next(err);
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const url = `/uploads/${req.file.filename}`;
    res.json({ success: true, data: { url, filename: req.file.filename, size: req.file.size } });
  });
});

module.exports = router;
