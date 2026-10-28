
const mongoose = require("mongoose");

const fileMetadataSchema = new mongoose.Schema(
    {
        filename: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        originalName: {
            type: String,
            required: true
        },
        mimetype: {
            type: String,
            required: true
        },
        size: {
            type: Number,
            required: true,
            min: 0
        },
        isImage: {
            type: Boolean,
            default: false
        },
        url: {
            type: String,
            required: true
        },
        boardId: {
            type: String,
            default: null,
            index: true
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        versionKey: false
    }
);

module.exports =
    mongoose.models.FileMetadata ||
    mongoose.model("FileMetadata", fileMetadataSchema);
