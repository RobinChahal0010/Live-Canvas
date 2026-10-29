const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 3
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        password: {
            type: String,
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    },
    { versionKey: false }
);

userSchema.set("toJSON", {
    transform: (_doc, ret) => {
        delete ret.password;
        return ret;
    }
});

module.exports = mongoose.model("User", userSchema);
