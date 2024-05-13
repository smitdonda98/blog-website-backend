const {Schema, model} = require('mongoose')


const postSchema = new Schema({
    title: {
        type: 'string',
        required: true
    },
    category: {
        type: 'string',
        enum : ["Agriculture", "Business", "Education", "Entertainment", "Art", "Investment", "Uncategorized", "Weather"],message:"{VALUE is not supported",
    },
    description: {
        type: 'string',
        required: true
    },
    creator: {type:Schema.Types.ObjectId, ref:"User"},
    thumbnail: {
        type: 'string',
        required: true
    },
},{timestamps:true})

module.exports = model('Post', postSchema)