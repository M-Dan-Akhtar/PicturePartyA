const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
username: {
    type: String,
    required: true
},
password: {
    type: String,
    required: true
},
points: {
    type: Number,
    required: true
},
date: {
    type: Date,
    default: Date.now
}
})
module.exports = mongoose.model('user_model',userSchema,'userdb');