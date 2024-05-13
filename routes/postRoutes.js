const {Router} = require('express')

const { deletePost, editPost, getUserPosts, getCatPosts, createPost, getPosts, getPost } = require('../controllers/postControllers')

const authMiddleware = require('../middleware/authMiddleware')


const router = Router()

router.post('/',authMiddleware, createPost)
router.get('/', getPosts)
router.get('/:id', getPost)
router.get('/categories/:category', getCatPosts)
router.get('/users/:id', getUserPosts)
router.patch('/:id', authMiddleware, editPost) 
router.delete('/:id', authMiddleware,deletePost)


module.exports = router