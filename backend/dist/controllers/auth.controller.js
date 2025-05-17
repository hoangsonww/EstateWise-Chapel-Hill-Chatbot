"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordForEmail = exports.verifyEmail = exports.logout = exports.login = exports.signUp = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_model_1 = __importDefault(require("../models/User.model"));
const saltRounds = 10;
/**
 * Sign up a new user
 *
 * @param req - The request object
 * @param res - The response object
 */
const signUp = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const existingUser = await User_model_1.default.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "User already exists" });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, saltRounds);
        const user = new User_model_1.default({ username, email, password: hashedPassword });
        await user.save();
        const token = jsonwebtoken_1.default.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET);
        res.cookie("token", token, { httpOnly: true });
        res
            .status(201)
            .json({ token, user: { username: user.username, email: user.email } });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to create user" });
    }
};
exports.signUp = signUp;
/**
 * Log in an existing user
 *
 * @param req - The request object
 * @param res - The response object
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User_model_1.default.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: "Invalid credentials" });
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: "Invalid credentials" });
        }
        const token = jsonwebtoken_1.default.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET);
        res.cookie("token", token, { httpOnly: true });
        res.json({ token, user: { username: user.username, email: user.email } });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to login" });
    }
};
exports.login = login;
/**
 * Log out the user
 *
 * @param req - The request object
 * @param res - The response object
 */
const logout = async (req, res) => {
    res.clearCookie("token");
    res.json({ message: "Logged out successfully" });
};
exports.logout = logout;
/**
 * Verify the user's email
 *
 * @param req - The request object
 * @param res - The response object
 */
const verifyEmail = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User_model_1.default.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json({ message: "Email verified", email });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to verify email" });
    }
};
exports.verifyEmail = verifyEmail;
/**
 * Reset the user's password
 *
 * @param req - The request object
 * @param res - The response object
 */
const resetPasswordForEmail = async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        const user = await User_model_1.default.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        user.password = await bcryptjs_1.default.hash(newPassword, saltRounds);
        await user.save();
        res.json({ message: "Password reset successfully" });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to reset password" });
    }
};
exports.resetPasswordForEmail = resetPasswordForEmail;
