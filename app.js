const express = require('express');

const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userModel = require('./models/user');
require('dotenv').config();
const Post = require('./models/post');  // Adjust the path if needed
const post = require('./models/post');
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

// Registration Route
// Registration Route
app.post('/register', async (req, res) => {
    try {
        let { name, email, password, age, username } = req.body;

        // Ensure no extra spaces in input
        email = email.trim();
        password = password.trim();

        // Create a new user object and save it to the database (password will be hashed in the pre-save hook)
        let newUser = new userModel({
            name,
            email,
            password,  // Just save the raw password, hashing will be done automatically
            age,
            username,
        });

        await newUser.save();
        console.log("✅ User successfully registered");

        res.redirect('/login?message=success');
    } catch (error) {
        console.error("🔥 Registration Error:", error);
        res.status(500).send("Server error during registration");
    }
});


// Login Route
// Login Route
// Login Route
// Login Route
app.post('/login', async (req, res) => {
    try {
        let { email, password } = req.body;

        // Trim spaces to avoid any leading/trailing whitespace issues
        email = email.trim();
        password = password.trim();

        console.log("🗝️ Entered Password Length:", password.length);  // Log the length of entered password
        console.log("🗝️ Entered Password (raw):", password);  // Log the entered password (raw)

        // Fetch user from the database
        let user = await userModel.findOne({ email });

        if (!user) {
            console.log("❌ User not found:", email);
            return res.redirect('/login?message=invalid');
        }

        console.log("✅ User found:", user.email);
        console.log("🔑 Stored Hashed Password Length:", user.password.length);  // Log length of stored hash
        console.log("🔑 Stored Hashed Password (raw):", user.password);  // Log the stored hash

        // Compare the entered password with the stored hash
        const match = await bcrypt.compare(password, user.password);

        console.log("🔍 Password Match Result:", match);  // Log result of password comparison

        if (match) {
            // Passwords match, create JWT token
            let token = jwt.sign({ email: user.email, userid: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
            res.cookie("token", token, { httpOnly: true, secure: false });  // Set the token in a cookie
            res.redirect('/profile');
        } else {
            console.log("❌ Incorrect password for:", email);
            res.redirect('/login?message=incorrect');
        }

    } catch (error) {
        console.error("🔥 Login Error:", error);
        res.status(500).send("Server error during login");
    }
});





// Profile Route
app.get('/profile', isLoggedIn, async (req, res) => {
    try {
        let user = await userModel.findOne({ email: req.user.email }).populate("posts");
        res.render('profile', { user });
    } catch (error) {
        console.error("🔥 Error loading profile:", error);
        res.status(500).send("Error loading profile");
    }
});

// Logout Route
app.get('/logout', (req, res) => {
    res.clearCookie("token");
    res.redirect("/login");
});
// Route to create a new post
app.post('/post', isLoggedIn, async (req, res) => {
    try {
        const { content } = req.body;

        // ✅ Fetch the full user document from the database
        let user = await userModel.findOne({ _id: req.user.userid });

        if (!user) {
            return res.status(404).send("User not found");
        }

        console.log("User object:", user); // Debugging line

        // ✅ Create a new post
        const newPost = new Post({
            user: user._id, // Correct user reference
            content,
        });

        await newPost.save();

        // ✅ Ensure user.posts is an array
        if (!user.posts) {
            user.posts = [];
        }

        // ✅ Push the post and save the user
        user.posts.push(newPost._id);
        await user.save(); // Now user is a proper Mongoose document

        res.redirect('/profile');
    } catch (err) {
        console.error("🔥 Error creating post:", err);
        res.status(500).send("Error creating post");
    }
});

// Route to like/unlike a post
app.get('/like/:id', isLoggedIn, async (req, res) => {
   let post = await Post.findOne({_id: req.params.id}).populate("user");
   if(post.likes.indexOf(req.user.userid)===-1){

       post.likes.push(req.user.userid)
   }else{
    post.likes.splice(post.likes.indexOf(req.user.userid),1)
   }
   await post.save()
   res.redirect('/profile')
});
app.get('/edit/:id', isLoggedIn, async (req, res) => {
    let post = await Post.findOne({_id: req.params.id}).populate("user");
    
    res.render('edit' , {post})
 });
 app.post('/update/:id', isLoggedIn, async (req, res) => {
    let post = await Post.findOneAndUpdate({_id: req.params.id}, {content:req.body.content});
    
    res.redirect('/profile')
 });
 app.get('/delete/:id', isLoggedIn, async (req, res) => {
    await Post.findByIdAndDelete(req.params.id);
    res.redirect('/profile');
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
