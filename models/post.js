const mongoose = require('mongoose');


// Schema   
const postSchema = mongoose.Schema({
 user:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',

 },
 date:{
    type: Date,
    default: Date.now
 },
 content:String,
 likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
 }]

},
{timestamps:true});

// Model

module.exports = mongoose.model('Post', postSchema);