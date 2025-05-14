"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateConversation = exports.chat = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Conversation_model_1 = __importDefault(require("../models/Conversation.model"));
const geminiChat_service_1 = require("../services/geminiChat.service");
/**
 * Main chat endpoint – handles both logged‑in and guest users.
 * Guests send their current expertWeights in the request body;
 * we echo the *updated* weights back so the FE can stash them
 * in localStorage for the next turn.
 *
 * @param req - The request object containing the chat message and optional conversation ID.
 * @param res - The response object to send the chat response.
 * @return A JSON response containing the chat response, expert views, and conversation ID.
 */
const chat = async (req, res) => {
    try {
        const { message, convoId, history, expertWeights: clientWeights = {}, } = req.body;
        /* authenticated users */
        if (req.user) {
            const userId = new mongoose_1.default.Types.ObjectId(req.user.id);
            let conversation = null;
            if (convoId) {
                conversation = await Conversation_model_1.default.findOne({
                    _id: convoId,
                    user: userId,
                });
            }
            if (!conversation) {
                conversation = new Conversation_model_1.default({
                    user: userId,
                    title: "Untitled Conversation",
                    messages: [],
                    expertWeights: {
                        "Data Analyst": 1,
                        "Lifestyle Concierge": 1,
                        "Financial Advisor": 1,
                        "Neighborhood Expert": 1,
                        "Cluster Analyst": 1,
                    },
                });
                await conversation.save();
            }
            /* build full history (stored msgs + new one) */
            const historyForGemini = [
                ...conversation.messages.map((m) => ({
                    role: m.role,
                    parts: [{ text: m.text }],
                })),
                { role: "user", parts: [{ text: message }] },
            ];
            // run MoE pipeline
            const { finalText, expertViews } = await (0, geminiChat_service_1.chatWithEstateWise)(historyForGemini, message, {}, conversation.expertWeights);
            /* persist both msgs */
            conversation.messages.push({
                role: "user",
                text: message,
                timestamp: new Date(),
            });
            conversation.messages.push({
                role: "model",
                text: finalText,
                timestamp: new Date(),
            });
            conversation.markModified("messages");
            await conversation.save();
            return res.json({
                response: finalText,
                expertViews,
                convoId: conversation._id,
                expertWeights: conversation.expertWeights,
            });
        }
        // Guest users
        const defaultWeights = {
            "Data Analyst": 1,
            "Lifestyle Concierge": 1,
            "Financial Advisor": 1,
            "Neighborhood Expert": 1,
            "Cluster Analyst": 1,
        };
        const guestWeights = {
            ...defaultWeights,
            ...clientWeights,
        };
        const rawHistory = Array.isArray(history) ? history : [];
        const normalizedHistory = rawHistory.map((msg) => {
            if (Array.isArray(msg.parts) &&
                msg.parts.every((p) => typeof p.text === "string")) {
                return { role: msg.role, parts: msg.parts };
            }
            // fallback: wrap `msg.text` in the required shape
            return {
                role: msg.role,
                parts: [{ text: typeof msg.text === "string" ? msg.text : "" }],
            };
        });
        const historyForGemini = [
            ...normalizedHistory,
            { role: "user", parts: [{ text: message }] },
        ];
        const { finalText, expertViews } = await (0, geminiChat_service_1.chatWithEstateWise)(historyForGemini, message, {}, guestWeights);
        return res.json({
            response: finalText,
            expertViews,
            expertWeights: guestWeights,
        });
    }
    catch (err) {
        console.error("Error processing chat request:", err);
        return res.status(500).json({ error: "Error processing chat request" });
    }
};
exports.chat = chat;
/**
 * Thumb‑rating endpoint.
 * For authenticated users: Update the expertWeights in the DB for the given convoId.
 * For unauthenticated users: Update the expertWeights in the request body so the UI
 * can stash them in localStorage for the next turn.
 *
 * @param req - The request object containing the conversation ID, rating, and optional expert.
 * @param res - The response object to send the rating response.
 * @return A JSON response indicating success and the updated expert weights.
 */
const rateConversation = async (req, res) => {
    try {
        const { convoId, rating, expertWeights = {}, } = req.body;
        // Unauthenticated users
        if (!req.user) {
            const wts = { ...expertWeights };
            if (Object.keys(wts).length === 0) {
                return res.json({ success: true });
            }
            // only adjust weights if rating is "down"
            // "up": keep everything as is
            if (rating === "down") {
                adjustWeightsInPlace(wts, rating);
            }
            return res.json({ success: true, expertWeights: wts });
        }
        // Authenticated users
        if (!convoId) {
            return res.status(400).json({ error: "convoId is required" });
        }
        const userId = new mongoose_1.default.Types.ObjectId(req.user.id);
        const convo = await Conversation_model_1.default.findOne({ _id: convoId, user: userId });
        if (!convo) {
            return res.status(404).json({ error: "Conversation not found" });
        }
        // on thumbs-down, randomly adjust two non-cluster experts
        if (rating === "down") {
            adjustWeightsInPlace(convo.expertWeights, rating);
            await convo.save();
        }
        return res.json({ success: true, expertWeights: convo.expertWeights });
    }
    catch (err) {
        console.error("Error rating conversation:", err);
        return res.status(500).json({ error: "Error rating conversation" });
    }
};
exports.rateConversation = rateConversation;
/**
 * Helper function to adjust weights in place.
 * This function modifies the weights of the experts based on the rating provided,
 * but never changes the weight of "Cluster Analyst".
 *
 * @param wts - The weights of the experts.
 * @param rating - The rating given by the user, either "up" or "down".
 * @param expert - The specific expert to adjust the weight for (optional).
 */
function adjustWeightsInPlace(wts, rating, expert) {
    const CLUSTER = "Cluster Analyst";
    const NON_CLUSTER = Object.keys(wts).filter((k) => k !== CLUSTER);
    const delta = rating === "up" ? 0.2 : -0.2;
    // 1) Always reset cluster to 1
    wts[CLUSTER] = 1;
    if (expert && expert !== CLUSTER && wts[expert] != null) {
        // 2a) Specific expert bump
        wts[expert] = Math.min(Math.max(wts[expert] + delta, 0.1), 2.0);
    }
    else if (!expert) {
        // 2b) Global thumb: pick two distinct non‐cluster experts
        const iUp = Math.floor(Math.random() * NON_CLUSTER.length);
        let iDown = Math.floor(Math.random() * NON_CLUSTER.length);
        while (iDown === iUp) {
            iDown = Math.floor(Math.random() * NON_CLUSTER.length);
        }
        // 2c) Adjust & normalize
        const keyUp = NON_CLUSTER[iUp];
        const keyDown = NON_CLUSTER[iDown];
        wts[keyUp] = Math.min(Math.max(wts[keyUp] + 0.2, 0.1), 2.0);
        wts[keyDown] = Math.min(Math.max(wts[keyDown] - 0.2, 0.1), 2.0);
    }
    // 3) Re-enforce cluster analyst at 1 to avoid drift
    wts[CLUSTER] = 1;
}
