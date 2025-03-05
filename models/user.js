require('dotenv').config(); 
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');


const mongoURI = process.env.MONGO_URI || 'fallback_mongo_uri';

mongoose.connect(mongoURI)
.then(() => console.log("MongoDB connected successfully"))
.catch(err => console.log("MongoDB connection error:", err));

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    name: { type: String, required: true },
    age: { type: Number, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    posts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }]
}, { timestamps: true }); 

userSchema.pre('save', async function (next) {
    if (!this.isModified("password")) return next(); 

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        console.log("✅ Hashed Password Before Save:", this.password); 
        next();
    } catch (err) {
        next(err); 
    }
});

userSchema.virtual('fullName').get(function () {
    return `${this.name} (${this.username})`;
});

module.exports = mongoose.model('User', userSchema);
