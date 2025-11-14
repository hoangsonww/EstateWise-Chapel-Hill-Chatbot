import { Request, Response } from "express";
import Conversation from "../models/Conversation.model";
import { AuthRequest } from "../middleware/auth.middleware";

/**
 * Handles the creation of a new conversation.
 *
 * @param req - The request object containing the user's ID and conversation details.
 * @param res - The response object to send the created conversation back to the client.
 */
export const createConversation = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const newConversation = new Conversation({
      user: req.user.id,
      title: req.body.title || "Untitled Conversation",
      messages: [],
    });
    await newConversation.save();
    res.status(201).json(newConversation);
  } catch (err) {
    res.status(500).json({ error: "Failed to create conversation" });
  }
};

/**
 * Fetches all conversations for the authenticated user.
 *
 * @param req - The request object containing the user's ID.
 * @param res - The response object to send the conversations back to the client.
 */
export const getConversations = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const conversations = await Conversation.find({ user: req.user.id }).sort({
      updatedAt: -1,
    });
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
};

/**
 * Searches for conversations based on a query string.
 *
 * @param req - The request object containing the user's ID and search query.
 * @param res - The response object to send the search results back to the client.
 */
export const searchConversations = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { q } = req.query;
    const regex = new RegExp(q as string, "i");
    const conversations = await Conversation.find({
      user: req.user.id,
      title: regex,
    }).sort({ updatedAt: -1 });
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: "Search failed" });
  }
};

/**
 * Fetches a specific conversation by ID.
 *
 * @param req - The request object containing the user's ID and conversation ID.
 * @param res - The response object to send the conversation back to the client.
 */
export const updateConversation = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { id } = req.params;
    const { title } = req.body;
    const conv = await Conversation.findOneAndUpdate(
      { _id: id, user: req.user.id },
      { title },
      { new: true },
    );
    if (!conv) return res.status(404).json({ error: "Conversation not found" });
    res.json(conv);
  } catch (err) {
    res.status(500).json({ error: "Failed to update conversation" });
  }
};

/**
 * Deletes a specific conversation.
 *
 * @param req - The request object containing the user's ID and conversation ID.
 * @param res - The response object to send the deletion confirmation back to the client.
 */
export const deleteConversation = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { id } = req.params;
    const conv = await Conversation.findOneAndDelete({
      _id: id,
      user: req.user.id,
    });
    if (!conv) return res.status(404).json({ error: "Conversation not found" });
    res.json({ message: "Conversation deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete conversation" });
  }
};

/**
 * Generates a conversation name using AI based on conversation messages.
 *
 * @param req - The request object containing the user's ID and conversation ID.
 * @param res - The response object to send the generated name back to the client.
 */
export const generateConversationName = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { id } = req.params;
    const conv = await Conversation.findOne({
      _id: id,
      user: req.user.id,
    });
    if (!conv) return res.status(404).json({ error: "Conversation not found" });

    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return res
        .status(500)
        .json({ error: "AI service not configured properly" });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-lite",
      systemInstruction:
        "You are a helpful assistant that generates concise, descriptive conversation titles. Generate a short title (3-6 words max) that captures the main topic of the conversation. Return ONLY the title text, no quotes, no extra explanation.",
    });

    const messageSummary = conv.messages
      .slice(0, 6)
      .map((m) => `${m.role}: ${m.text.substring(0, 150)}`)
      .join("\n");

    const result = await model.generateContent(
      `Based on this conversation, generate a short, descriptive title:\n\n${messageSummary}`,
    );
    const suggestedName = result.response.text().trim();

    res.json({ suggestedName });
  } catch (err) {
    console.error("Error generating conversation name:", err);
    res.status(500).json({ error: "Failed to generate conversation name" });
  }
};
