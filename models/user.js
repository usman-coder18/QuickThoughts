require('dotenv').config(); // Load environment variables
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Connect to MongoDB

const mongoURI = process.env.MONGO_URI || 'fallback_mongo_uri';

mongoose.connect(mongoURI)
.then(() => console.log("✅ MongoDB connected successfully"))
.catch(err => console.log("❌ MongoDB connection error:", err));

// Define User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    name: { type: String, required: true },
    age: { type: Number, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    posts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }]
}, { timestamps: true }); // Adds createdAt & updatedAt

// Hash Password Before Saving
userSchema.pre('save', async function (next) {
    if (!this.isModified("password")) return next(); // Only hash if password is modified

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt); // Hash the password
        console.log("✅ Hashed Password Before Save:", this.password);  // Log the hashed password
        next();
    } catch (err) {
        next(err); // Error handling in the hook
    }
});

// Add a Virtual Property for Full Name (if applicable)
userSchema.virtual('fullName').get(function () {
    return `${this.name} (${this.username})`;
});

module.exports = mongoose.model('User', userSchema);
