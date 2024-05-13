const bcrypt = require('bcryptjs');
const HttpError = require('../models/errorModel');
const User = require('../models/userModel');
const jwt = require('jsonwebtoken')
const fs = require('fs');
const path = require('path');
const {v4: uuid} = require("uuid");

// ============registeruser================
// api/users/registeruser
const registerUser = async (req, res, next) => {
    try {
        const { name, email, password, password2 } = req.body;
        console.log(req.body);

        // Check for missing fields
        if (!email || !password || !password2) {
            return next(new HttpError("Please fill all required fields", 422));
        }

        // Convert email to lowercase
        const newEmail = email.toLowerCase();

        // Check if email already exists
        const emailExists = await User.findOne({ email: newEmail });
        if (emailExists) {
            return next(new HttpError("Email already exists", 422));
        }

        // Validate password length
        if (password.trim().length < 6) {
            return next(new HttpError("Password must be at least 6 characters long", 422));
        }

        // Check if passwords match
        if (password !== password2) {
            return next(new HttpError("Passwords do not match", 422));
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPass = await bcrypt.hash(password, salt);

        // Create new user
        const newUser = await User.create({ name, email: newEmail, password: hashedPass });
        
        // Respond with JSON data
        res.status(201).json({ message: 'New user registered', user: newUser });
    } catch (error) {
        console.log(error);
        return next(new HttpError('User registration failed', 422));
    }
};









// ============Login================
// api/users/login
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body
        if (!email || !password) {
            return next(new HttpError("fill all fields", 422))
        }

        const newEmail = email.toLowerCase();

        const user = await User.findOne({ email: newEmail })
        if (!user) {
            return next(new HttpError("Invalid credentials", 422))
        }

        const comparePass = await bcrypt.compare(password, user.password)
        if (!comparePass) {
            return next(new HttpError("Invalid credentials", 422))
        }

        const { _id: id, name } = user;

        const token = jwt.sign({ id, name }, process.env.JWT_SECRET, { expiresIn: "1d" });

        user.token = token;
        await user.save();

        res.status(200).json({ token, id, name })

    } catch (error) {
        return next(new HttpError("login failed please check your credentials", 422))
    }
}









// ============userproile================
// api/users/:id
const getUser = async (req, res, next) => {
    try {
        const {id} = req.params

        const user = await User.findById(id).select('-password')

        if (!user) {
            return next(new HttpError("User not found",404))
        }

        res.status(200).json(user);
    } catch (error) {
        return next(new HttpError(error))

    }
}







// ============change user avatar================
// api/users/change-avatar
const changeAvatar = async (req, res, next) => {
    try {
        if (!req.files || !req.files.avatar) {
            return next(new HttpError("Please choose an image", 422));
        }

        const user = await User.findById(req.user.id);

        if (user.avatar) {
            // Check if the file exists before attempting to unlink it
            fs.unlink(path.join(__dirname, '..', 'uploads', user.avatar), (err) => {
                if (err) {
                    // Log the error but continue since the file might not exist
                    console.error("Error while deleting avatar file:", err);
                }
            });
        }

        const avatar = req.files.avatar;

        if (avatar.size > 500000) {
            return next(new HttpError("Profile picture too big. Should be less than 500kb", 422));
        }

        // Generate a unique filename for the avatar
        const newFilename = uuid() + '-' + avatar.name;

        // Move the uploaded avatar file to the uploads directory
        avatar.mv(path.join(__dirname, '..', 'uploads', newFilename), async (err) => {
            if (err) {
                return next(new HttpError(err));
            }

            // Update user's avatar in the database
            const updatedUser = await User.findByIdAndUpdate(req.user.id, { avatar: newFilename }, { new: true });
            if (!updatedUser) {
                return next(new HttpError("Avatar could not be changed", 422));
            }

            // Send updated user object in the response
            res.status(200).json(updatedUser);
        });
    } catch (error) {
        return next(new HttpError(error));
    }
};







// ============edit users================
// api/users/edit-user
const editUser = async (req, res, next) => {
    try {
        const {name, email, currentPassword, newPassword, confirmNewPassword} = req.body;
        if(!name || !email || !currentPassword || !newPassword){
            return next(new HttpError("Fill all required fields",422))
        }   

        const user = await User.findById(req.user.id)
        if(!user){
            return next(new HttpError("User not found",403))
        }

        const emailExist = await User.findOne({email});
        if(emailExist && (emailExist._id != req.user.id)){
            return next(new HttpError("email already exist",422))
        }

        const validateUserPassword = await bcrypt.compare(currentPassword, user.password);
        if(!validateUserPassword){
            return next(new HttpError("invalid current password",422))
        }

        if(newPassword !== confirmNewPassword){
            return next(new HttpError("New password do not match",422));
        }

        const salt = await bcrypt.genSalt(10)
        const hash = await bcrypt.hash(newPassword, salt);

        const newInfo = await User.findByIdAndUpdate(req.user.id,{name,email,password:hash},{new:true})

        res.status(200).json(newInfo)

    } catch (error) {
        return next(new HttpError(error))
    }
}








// ============get authors================
// api/users/authors
const getAuthors = async (req, res, next) => {
    try {
        const authors = await User.find().select('-password');

        res.json(authors);
    } catch (error) {
        return next(new HttpError(error));
    }
}



module.exports = { registerUser, login, getUser, changeAvatar, editUser, getAuthors }