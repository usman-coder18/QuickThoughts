require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userModel = require('./models/user');
const Post = require('./models/post'); 
const path = require("path");

const app = express();
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.set("views", path.join(__dirname, "views"));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB connected successfully"))
.catch(err => console.log("❌ MongoDB connection error:", err));

// Middleware to check authentication
function isLoggedIn(req, res, next) {
    const token = req.cookies.token;
    if (!token) return res.redirect("/login?message=sessionExpired");

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (error) {
        res.clearCookie("token");
        res.redirect("/login?message=sessionExpired");
    }
}

// Home Page
app.get('/', (req, res) => res.render("index"));

// Login & Register Routes
app.get('/login', (req, res) => {
    res.render("login", { message: req.query.message });
});

app.get('/register', (req, res) => {
    res.render("register", { message: req.query.message });
});

// Registration Route
app.post('/register', async (req, res) => {
    try {
        let { name, email, password, age, username } = req.body;

        email = email.trim();
        password = password.trim();

        let existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.redirect('/register?message=emailExists');  // Email already exists
        }

        let newUser = new userModel({ name, email, password, age, username });
        await newUser.save();

        console.log("✅ User successfully registered");
        res.redirect('/login?message=registered');  // Success message
    } catch (error) {
        console.error("🔥 Registration Error:", error);
        res.status(500).send("Server error during registration");
    }
});

// Login Route
app.post('/login', async (req, res) => {
    try {
        let { email, password } = req.body;
        email = email.trim();
        password = password.trim();

        let user = await userModel.findOne({ email });

        if (!user) {
            console.log("❌ User not found:", email);
            return res.redirect('/login?message=invalid');  // Invalid email
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            console.log("❌ Incorrect password for:", email);
            return res.redirect('/login?message=incorrect');  // Incorrect password
        }

        let token = jwt.sign({ email: user.email, userid: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
        res.cookie("token", token, { httpOnly: true, secure: false });
        
        res.redirect('/profile?message=login');  // Successful login
    } catch (error) {
        console.error("🔥 Login Error:", error);
        res.status(500).send("Server error during login");
    }
});

// Profile Route
app.get('/profile', isLoggedIn, async (req, res) => {
    try {
        let user = await userModel.findOne({ email: req.user.email }).populate("posts");
        res.render('profile', { user, message: req.query.message });
    } catch (error) {
        console.error("🔥 Error loading profile:", error);
        res.status(500).send("Error loading profile");
    }
});

// Logout Route
app.get('/logout', (req, res) => {
    res.clearCookie("token");
    res.redirect("/login?message=loggedOut");
});

// Create a new post
app.post('/post', isLoggedIn, async (req, res) => {
    try {
        const { content } = req.body;
        let user = await userModel.findOne({ _id: req.user.userid });

        if (!user) {
            return res.status(404).send("User not found");
        }

        const newPost = new Post({ user: user._id, content });
        await newPost.save();

        user.posts.push(newPost._id);
        await user.save();

        res.redirect('/profile?message=postCreated');
    } catch (err) {
        console.error("🔥 Error creating post:", err);
        res.status(500).send("Error creating post");
    }
});

// Like/Unlike a post
app.get('/like/:id', isLoggedIn, async (req, res) => {
   let post = await Post.findOne({_id: req.params.id}).populate("user");
   if(post.likes.indexOf(req.user.userid)===-1){
       post.likes.push(req.user.userid);
   } else {
       post.likes.splice(post.likes.indexOf(req.user.userid), 1);
   }
   await post.save();
   res.redirect('/profile?message=liked');
});

// Edit Post
app.get('/edit/:id', isLoggedIn, async (req, res) => {
    let post = await Post.findOne({_id: req.params.id}).populate("user");
    res.render('edit', { post });
});

// Update Post
app.post('/update/:id', isLoggedIn, async (req, res) => {
    await Post.findOneAndUpdate({_id: req.params.id}, { content: req.body.content });
    res.redirect('/profile?message=postUpdated');
});

// Delete Post
app.get('/delete/:id', isLoggedIn, async (req, res) => {
    await Post.findByIdAndDelete(req.params.id);
    res.redirect('/profile?message=postDeleted');
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
