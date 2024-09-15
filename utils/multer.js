import multer from 'multer';
import path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();

const fileFilter = (req, file, cb) => {
    if (
        file.mimetype === "image/png" ||
        file.mimetype === "image/jpeg"
    ) {
        cb(null, true);
    } else {
        req.fileValidationError = "jpeg, png 파일만 업로드 가능합니다";
        cb(null, false);
    }
};

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, done) => {
            done(null, `${process.env.IMAGE_DIR}`)
        },
        filename: (req, file, done) => {
            const ext = path.extname(file.originalname);
            const fileName = path.basename(file.originalname, ext) + Date.now() + ext;
            done(null, fileName);
        },
    }),
    fileFilter: fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 },
});

export { upload };