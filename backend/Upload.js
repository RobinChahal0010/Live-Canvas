
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const FileMetadata = require("./models/FileMetadata");

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, "uploads");

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB per file
const MAX_FILES = 5;

const ALLOWED_TYPES = {
    "image/png": [".png"],
    "image/jpeg": [".jpg", ".jpeg"],
    "image/gif": [".gif"],
    "image/webp": [".webp"],
    "application/pdf": [".pdf"],
    "text/plain": [".txt"]
};

const IMAGE_TYPES = new Set([
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp"
]);

const SAFE_NAME =
    /^[a-f0-9-]{36}\.(png|jpg|jpeg|gif|webp|pdf|txt)$/i;

// Make sure the disk folder exists.
fs.mkdirSync(UPLOAD_DIR, { recursive: true });


// ------------------------------------------------------------
// DISK STORAGE
// Actual files are saved to backend/uploads/.
// MongoDB stores metadata only.
// ------------------------------------------------------------

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },

    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const uniqueName = `${crypto.randomUUID()}${ext}`;

        cb(null, uniqueName);
    }
});


function fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ALLOWED_TYPES[file.mimetype];

    if (!allowedExtensions || !allowedExtensions.includes(ext)) {
        const error = new Error(
            "Unsupported file type. Allowed: PNG, JPG, GIF, WEBP, PDF, TXT."
        );

        error.code = "INVALID_FILE_TYPE";
        return cb(error);
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


// ------------------------------------------------------------
// UPLOAD FILES
// POST /api/upload
// Multipart field name: files
// Optional text field: boardId
// ------------------------------------------------------------

router.post("/api/upload", (req, res) => {
    upload.array("files", MAX_FILES)(req, res, async (error) => {
        if (error) {
            if (error instanceof multer.MulterError) {
                const messages = {
                    LIMIT_FILE_SIZE:
                        `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024} MB.`,
                    LIMIT_FILE_COUNT:
                        `Too many files. Maximum ${MAX_FILES} per upload.`,
                    LIMIT_UNEXPECTED_FILE:
                        'Send files using the field name "files".'
                };

                return res.status(400).json({
                    success: false,
                    error: messages[error.code] || error.message
                });
            }

            if (error.code === "INVALID_FILE_TYPE") {
                return res.status(415).json({
                    success: false,
                    error: error.message
                });
            }

            console.error("Upload error:", error);

            return res.status(500).json({
                success: false,
                error: "Upload failed."
            });
        }

        const uploadedFiles = req.files || [];

        if (uploadedFiles.length === 0) {
            return res.status(400).json({
                success: false,
                error: "No files uploaded."
            });
        }

        try {
            const boardId =
                typeof req.body.boardId === "string" &&
                req.body.boardId.trim()
                    ? req.body.boardId.trim()
                    : null;

            const documents = uploadedFiles.map((file) => {
                const formatted = formatFile(file);

                return {
                    ...formatted,
                    boardId,
                    uploadedAt: new Date()
                };
            });

            // Save metadata only. File contents are NOT stored in MongoDB.
            await FileMetadata.insertMany(documents);

            console.log(
                "Files saved:",
                documents.map((file) => file.filename).join(", ")
            );

            return res.status(201).json({
                success: true,
                files: documents
            });
        } catch (dbError) {
            console.error("File metadata save failed:", dbError);

            // If MongoDB save fails, remove the newly uploaded disk files
            // so that untracked files are not left behind.
            await Promise.all(
                uploadedFiles.map((file) =>
                    fs.promises.unlink(file.path).catch(() => {})
                )
            );

            return res.status(500).json({
                success: false,
                error: "Files could not be registered in MongoDB."
            });
        }
    });
});


// ------------------------------------------------------------
// GET FILE METADATA
// GET /api/files
// Optional: /api/files?boardId=YOUR_BOARD_ID
// ------------------------------------------------------------

router.get("/api/files", async (req, res) => {
    try {
        const filter = {};

        if (
            typeof req.query.boardId === "string" &&
            req.query.boardId.trim()
        ) {
            filter.boardId = req.query.boardId.trim();
        }

        const files = await FileMetadata.find(filter)
            .select("-_id filename originalName mimetype size isImage url boardId uploadedAt")
            .sort({ uploadedAt: -1 })
            .lean();

        return res.json({
            success: true,
            count: files.length,
            files
        });
    } catch (error) {
        console.error("File metadata fetch failed:", error);

        return res.status(500).json({
            success: false,
            error: "Could not fetch file metadata."
        });
    }
});


// ------------------------------------------------------------
// SERVE ACTUAL FILES FROM DISK
// GET /uploads/:filename
// ------------------------------------------------------------

router.use(
    "/uploads",
    express.static(UPLOAD_DIR, {
        index: false,
        dotfiles: "deny",
        maxAge: "7d",

        setHeaders: (res, filePath) => {
            res.setHeader("X-Content-Type-Options", "nosniff");

            const ext = path.extname(filePath).toLowerCase();

            const isImage = [
                ".png",
                ".jpg",
                ".jpeg",
                ".gif",
                ".webp"
            ].includes(ext);

            if (!isImage) {
                res.setHeader(
                    "Content-Disposition",
                    "attachment"
                );
            }
        }
    })
);


// ------------------------------------------------------------
// DELETE FILE
// DELETE /api/upload/:filename
// Deletes the disk file and its MongoDB metadata.
// ------------------------------------------------------------

router.delete("/api/upload/:filename", async (req, res) => {
    const { filename } = req.params;

    if (!SAFE_NAME.test(filename)) {
        return res.status(400).json({
            success: false,
            error: "Invalid filename."
        });
    }

    const filePath = path.join(UPLOAD_DIR, filename);

    try {
        // Remove the actual file from disk.
        await fs.promises.unlink(filePath);

        // Remove its metadata from MongoDB.
        await FileMetadata.deleteOne({ filename });

        return res.json({
            success: true,
            filename,
            message: "File and metadata deleted."
        });
    } catch (error) {
        if (error.code === "ENOENT") {
            return res.status(404).json({
                success: false,
                error: "File not found on disk."
            });
        }

        console.error("File deletion failed:", error);

        return res.status(500).json({
            success: false,
            error: "Could not delete the file."
        });
    }
});


module.exports = router;
