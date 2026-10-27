const mongoose = require("mongoose");

const boardSchema = new mongoose.Schema(
    {
        boardId: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        title: {
            type: String,
            default: ""
        },
        canvasStyle: {
            type: String,
            enum: ["blank", "grid", "dots", "lines"],
            default: "blank"
        },
        currentPage: {
            type: Number,
            default: 0,
            min: 0
        },
        // Keep page payloads flexible to support existing canvas objects.
        pages: {
            type: mongoose.Schema.Types.Mixed,
            default: []
        },
        updatedAt: {
            type: Number,
            default: () => Date.now()
        }
    },
    {
        versionKey: false,
        minimize: false
    }
);

module.exports = mongoose.models.Board || mongoose.model("Board", boardSchema);
