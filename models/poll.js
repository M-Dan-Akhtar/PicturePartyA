const mongoose = require('mongoose');
const pollSchema = new mongoose.Schema({
poll_title: {
    type:String,
    required:true
},
poll_author: {
    type: String,
    required: true
},
movies: [
    {
    added_by: { type:String,required:true  },
    title: { type: String, required: true},
    votes: {type: Number, required:true, default:0}
    }
],
winner: {
    type: String,
    required: false
},
winning_movie: {
    type: String,
    required: false
},
vote_list: [
    {
        username: {type:String, required:false},
        voted_for: {type:String, required:false}
    }
],
date: {
    type: Date,
    default: Date.now
}
})
module.exports = mongoose.model('poll_model',pollSchema,'polldb');