const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, "uploads");

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 5;                    

const ALLOWED_TYPES = {
    "image/png":       [".png"],
    "image/jpeg":      [".jpg", ".jpeg"],
    "image/gif":       [".gif"],
    "image/webp":      [".webp"],
    "application/pdf": [".pdf"],
    "text/plain":      [".txt"]
};

const IMAGE_TYPES = new Set([
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp"
]);


fs.mkdirSync(UPLOAD_DIR, { recursive: true });


const storage = multer.diskStorage({

    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const unique = crypto.randomUUID();
        cb(null, `${unique}${ext}`);
    }

});


function fileFilter(req, file, cb) {

    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ALLOWED_TYPES[file.mimetype];

    if (!allowedExts || !allowedExts.includes(ext)) {

        const err = new Error(
            "Unsupported file type. Allowed: PNG, JPG, GIF, WEBP, PDF, TXT."
        );
        err.code = "INVALID_FILE_TYPE";

        return cb(err);
    }

    cb(null, true);

}

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: MAX_FILES
    }
});

const SAFE_NAME = /^[a-f0-9-]{36}\.[a-z0-9]{2,5}$/;

function formatFile(file) {
    return {
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        isImage: IMAGE_TYPES.has(file.mimetype),
        url: `/uploads/${file.filename}`
    };
}


router.post("/api/upload", (req, res) => {

    upload.array("files", MAX_FILES)(req, res, (err) => {
        if (err) {

            if (err instanceof multer.MulterError) {

                const messages = {
                    LIMIT_FILE_SIZE:
                        `File too large. Max size is ${MAX_FILE_SIZE / 1024 / 1024} MB.`,
                    LIMIT_FILE_COUNT:
                        `Too many files. Max ${MAX_FILES} per upload.`,
                    LIMIT_UNEXPECTED_FILE:
                        'Unexpected field. Send files under the field name "files".'
                };

                return res.status(400).json({
                    success: false,
                    error: messages[err.code] || err.message
                });
            }

            if (err.code === "INVALID_FILE_TYPE") {
                return res.status(415).json({
                    success: false,
                    error: err.message
                });
            }

            console.error("Upload error:", err);

            return res.status(500).json({
                success: false,
                error: "Upload failed."
            });
        }
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                error: "No files uploaded."
            });
        }

        const files = req.files.map(formatFile);

        console.log(
            "Uploaded:",
            files.map(f => f.filename).join(", ")
        );

        res.status(201).json({
            success: true,
            files
        });

    });

});


router.use(
    "/uploads",
    express.static(UPLOAD_DIR, {
        index: false,
        dotfiles: "deny",
        maxAge: "7d",
        setHeaders: (res, filePath) => {

            res.setHeader("X-Content-Type-Options", "nosniff");
            const ext = path.extname(filePath).toLowerCase();
            const isImage = [".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext);

            if (!isImage) {
                res.setHeader("Content-Disposition", "attachment");
            }
        }
    })
);

router.delete("/api/upload/:filename", (req, res) => {

    const { filename } = req.params;

    if (!SAFE_NAME.test(filename)) {
        return res.status(400).json({
            success: false,
            error: "Invalid filename."
        });
    }

    const filePath = path.join(UPLOAD_DIR, filename);

    fs.unlink(filePath, (err) => {

        if (err) {
            if (err.code === "ENOENT") {
                return res.status(404).json({
                    success: false,
                    error: "File not found."
                });
            }
            return res.status(500).json({
                success: false,
                error: "Could not delete file."
            });
        }

        res.json({ success: true, filename });

    });

});


module.exports = router;

