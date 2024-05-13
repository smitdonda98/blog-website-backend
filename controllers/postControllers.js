const Post = require('../models/postModel');
const User = require('../models/userModel');
const path = require('path');
const fs = require('fs');
const { v4: uuid } = require('uuid');
const HttpError = require('../models/errorModel')




// ===========create posts==========
// api/posts
const createPost = async (req, res, next) => {
    try {
      let { title, category, description } = req.body;
      
      // Validate required fields
      if (!title || !description || !req.files) {
        return next(new HttpError("Fill all required fields", 422));
      }
  
      const { thumbnail } = req.files;
  
      // Validate thumbnail size
      if (thumbnail.size > 2000000) {
        return next(new HttpError("Thumbnail is too big. File should be less than 2mb", 422));
      }
  
      let fileName = thumbnail.name;
      let splittedFilename = fileName.split('.');
      let newFilename = splittedFilename[0] + uuid() + "." + splittedFilename[splittedFilename.length - 1];
  
      thumbnail.mv(path.join(__dirname, '..', '/uploads', newFilename), async (err) => {
        if (err) {
          return next(new HttpError(err));
        } else {
          try {
            // Ensure that category value is valid
            if (!isValidCategory(category)) {
              return next(new HttpError("Invalid category value", 422));
            }
  
            const newPost = await Post.create({ title, category, description, thumbnail: newFilename, creator: req.user.id });
            if (!newPost) {
              return next(new HttpError("Post could not be created", 422));
            }
  
            // Update user's post count
            const currentUser = await User.findById(req.user.id);
            const userPostCount = currentUser.posts + 1;
            await User.findByIdAndUpdate(req.user.id, { posts: userPostCount });
  
            res.status(201).json(newPost);
          } catch (error) {
            return next(new HttpError("Error creating post", 500));
          }
        }
      });
    } catch (error) {
      return next(new HttpError(error.message, 500));
    }
  };
  

// Helper function to validate category value
const isValidCategory = (category) => {
    const allowedCategories = [
        "Agriculture", "Business", "Education", "Entertainment",
        "Art", "Investment", "Weather", "Uncategorized"];
    return allowedCategories.includes(category);
};
















// ===========get all posts==========
// api/posts
const getPosts = async (req, res, next) => {
    try {
        const posts = await Post.find().sort({ updateAt: -1 })
        res.status(200).json(posts);
    } catch (error) {
        return next(new HttpError(error));
    }
}

















// ===========get single post==========
// api/posts/:id
const getPost = async (req, res, next) => {
    try {
        const postId = req.params.id;
        const post = await Post.findById(postId);
        if (!post) {
            return next(new HttpError('post not found', 404));
        }
        res.status(200).json(post)
    } catch (error) {
        return next(new HttpError(error));
    }
}
















// ===========get post by category==========
// api/posts/categories/:category
const getCatPosts = async (req, res, next) => {
    try {
        const { category } = req.params;
        const catPosts = await Post.find({ category }).sort({ createdAt: -1 })
        res.status(200).json(catPosts)
    } catch (error) {
        return next(new HttpError(error))
    }
}














// ===========get post by author==========
// api/posts/users/:id
const getUserPosts = async (req, res, next) => {
    try {
        const { id } = req.params;
        const posts = await Post.find({ creator: id }).sort({ createdAt: -1 })
        res.status(200).json(posts)
    } catch (error) {
        return next(new HttpError(error))
    }
}















// ===========edit post==========
// api/posts//:id
const editPost = async (req, res, next) => {
    try {
        let fileName;
        let newFilename;
        let updatedPost;

        const { id } = req.params; // Corrected: Access id directly from req.params
        const { title, description, category } = req.body;

        // Check if all required fields are provided
        if (!title || description.length < 12 || !category) {
            return next(new HttpError("Fill all required fields", 422));
        }

        // Check if files are provided
        if (!req.files) {
            // If no files provided, update post without changing thumbnail
            updatedPost = await Post.findByIdAndUpdate(id, { title, category, description }, { new: true });
        } else {
            // If files provided, update post with new thumbnail
            const oldPost = await Post.findById(id);
            if (!oldPost) {
                return next(new HttpError("Post not found", 404));
            }

            // Delete old thumbnail file
            fs.unlink(path.join(__dirname, '..', 'uploads', oldPost.thumbnail), async (err) => {
                if (err) {
                    return next(new HttpError(err));
                }
            });

            const { thumbnail } = req.files;

            // Check thumbnail size
            if (thumbnail.size > 2000000) {
                return next(new HttpError("Thumbnail too big. Should be less than 2mb", 422));
            }

            fileName = thumbnail.name;
            let splittedFilename = fileName.split('.');
            newFilename = splittedFilename[0] + uuid() + '.' + splittedFilename[splittedFilename.length - 1];

            // Move new thumbnail to uploads folder
            thumbnail.mv(path.join(__dirname, '..', 'uploads', newFilename), async (err) => {
                if (err) {
                    return next(new HttpError(err));
                }
            });

            // Update post with new data including new thumbnail filename
            updatedPost = await Post.findByIdAndUpdate(id, { title, category, description, thumbnail: newFilename }, { new: true });
        }

        // Check if post was updated successfully
        if (!updatedPost) {
            return next(new HttpError("Couldn't update post", 400));
        }

        // Return the updated post
        res.status(200).json(updatedPost);
    } catch (error) {
        // Handle any errors that occur during the process
        return next(new HttpError(error.message, 500));
    }
};















// ===========delete post==========
// api/posts//:id
const deletePost = async (req, res, next) => {
    try {
        const postId = req.params.id;
        if (!postId) {
            return next(new HttpError("Post Unavailable", 400));
        }

        const post = await Post.findById(postId);
        if (!post) {
            return next(new HttpError("Post not found", 404));
        }

        const fileName = post.thumbnail;
        if (!fileName) {
            return next(new HttpError("Thumbnail not found", 404));
        }
        
        // Delete the corresponding thumbnail file
        fs.unlink(path.join(__dirname, '..', 'uploads', fileName), async (err) => {
            if (err) {
                return next(new HttpError(err));
            } else {
                // Delete post from database after successful file deletion
                await Post.findByIdAndDelete(postId);

                // Decrease the post count of the user who created the post
                const currentUser = await User.findById(req.user.id);
                if (currentUser) {
                    const userPostCount = currentUser.posts - 1;
                    await User.findByIdAndUpdate(req.user.id, { posts: userPostCount });
                }

                // Respond with success message
                res.json(`Post ${postId} deleted successfully`);
            }
        });
       
    } catch (error) {
        return next(new HttpError(error.message, 500));
    }
};


module.exports = { deletePost, editPost, getUserPosts, getCatPosts, createPost, getPosts, getPost }