const mongoose = require('mongoose');
const redeemSchema = new mongoose.Schema({
username: {
    type: String,
    required: true
},
points: {
    type: String,
    required: true
},
movie: {
    type: String,
    required: false
},
date: {
    type: Date,
    default: Date.now
}
})
module.exports = mongoose.model('redeem_model',redeemSchema,'redeemdb');