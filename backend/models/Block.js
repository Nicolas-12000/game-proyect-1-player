const mongoose = require('mongoose')

const blockSchema = new mongoose.Schema({
    name: String,  // ← nuevo campo
    x: Number,
    y: Number,
    z: Number
})


module.exports = mongoose.model('Block', blockSchema)
