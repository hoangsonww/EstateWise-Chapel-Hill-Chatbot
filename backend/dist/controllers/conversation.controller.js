"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteConversation = exports.updateConversation = exports.searchConversations = exports.getConversations = exports.createConversation = void 0;
const Conversation_model_1 = __importDefault(require("../models/Conversation.model"));
/**
 * Handles the creation of a new conversation.
 *
 * @param req - The request object containing the user's ID and conversation details.
 * @param res - The response object to send the created conversation back to the client.
 */
const createConversation = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: "Unauthorized" });
        const newConversation = new Conversation_model_1.default({
            user: req.user.id,
            title: req.body.title || "Untitled Conversation",
            messages: [],
        });
        await newConversation.save();
        res.status(201).json(newConversation);
    }
    catch (err) {
        res.status(500).json({ error: "Failed to create conversation" });
    }
};
exports.createConversation = createConversation;
/**
 * Fetches all conversations for the authenticated user.
 *
 * @param req - The request object containing the user's ID.
 * @param res - The response object to send the conversations back to the client.
 */
const getConversations = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: "Unauthorized" });
        const conversations = await Conversation_model_1.default.find({ user: req.user.id }).sort({
            updatedAt: -1,
        });
        res.json(conversations);
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch conversations" });
    }
};
exports.getConversations = getConversations;
/**
 * Searches for conversations based on a query string.
 *
 * @param req - The request object containing the user's ID and search query.
 * @param res - The response object to send the search results back to the client.
 */
const searchConversations = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: "Unauthorized" });
        const { q } = req.query;
        const regex = new RegExp(q, "i");
        const conversations = await Conversation_model_1.default.find({
            user: req.user.id,
            title: regex,
        }).sort({ updatedAt: -1 });
        res.json(conversations);
    }
    catch (error) {
        res.status(500).json({ error: "Search failed" });
    }
};
exports.searchConversations = searchConversations;
/**
 * Fetches a specific conversation by ID.
 *
 * @param req - The request object containing the user's ID and conversation ID.
 * @param res - The response object to send the conversation back to the client.
 */
const updateConversation = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: "Unauthorized" });
        const { id } = req.params;
        const { title } = req.body;
        const conv = await Conversation_model_1.default.findOneAndUpdate({ _id: id, user: req.user.id }, { title }, { new: true });
        if (!conv)
            return res.status(404).json({ error: "Conversation not found" });
        res.json(conv);
    }
    catch (err) {
        res.status(500).json({ error: "Failed to update conversation" });
    }
};
exports.updateConversation = updateConversation;
/**
 * Updates the title of a specific conversation.
 *
 * @param req - The request object containing the user's ID, conversation ID, and new title.
 * @param res - The response object to send the updated conversation back to the client.
 */
const deleteConversation = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: "Unauthorized" });
        const { id } = req.params;
        const conv = await Conversation_model_1.default.findOneAndDelete({
            _id: id,
            user: req.user.id,
        });
        if (!conv)
            return res.status(404).json({ error: "Conversation not found" });
        res.json({ message: "Conversation deleted successfully" });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to delete conversation" });
    }
};
exports.deleteConversation = deleteConversation;
