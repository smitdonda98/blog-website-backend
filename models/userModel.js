const {Schema, model} = require('mongoose')


const userSchema = new Schema({
    name: {
        type: 'string',
        required: true
    },
    email: {
        type: 'string',
        required: true
    },
    password: {
        type: 'string',
        required: true
    },
    avatar: {
        type: 'string'
    },
    posts: {
        type: 'number',
        default:0
    },
    token: {
        type: String,
        default: '', // or null depending on your preference
      },
})

module.exports = model('User', userSchema)