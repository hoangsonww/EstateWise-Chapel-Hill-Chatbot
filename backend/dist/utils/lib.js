"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runLuxeraAgentCheck = runLuxeraAgentCheck;
exports.default = agentHelper;
const geminiAgent_service_1 = require("../services/geminiAgent.service");
/**
 * Run the EstateWise agent to determine if we need to fetch
 * property data or not.
 *
 * @param message - The user’s message
 * @param userContext - Any additional context to pass through
 * @param expertWeights - Weights for each expert in the MoE
 * @return The final text response and expert views, which
 * include the decision to fetch property data or not
 */
async function runLuxeraAgentCheck(message, userContext = "", expertWeights = {}) {
    const response = await (0, geminiAgent_service_1.runLuxeraAgent)(message, userContext, expertWeights);
    return {
        finalText: response.finalText,
        expertViews: response.expertViews,
    };
}
/**
 * Detect if a user message is a simple greeting or small‑talk.
 * (Deprecated - not being used anymore in the current codebase.)
 *
 * @param message - the user’s message text
 * @return true if we can skip data retrieval and clustering
 */
function agentHelper(message) {
    // 1. Trim whitespace
    let msg = message.trim();
    // 2. Strip surrounding quotes
    msg = msg.replace(/^['"]+|['"]+$/g, "");
    // 3. Remove trailing punctuation
    msg = msg.replace(/[!?.]+$/g, "");
    // 4. Normalize case
    msg = msg.trim().toLowerCase();
    // 5. Exact-match set of simple queries
    const simples = new Set([
        // greetings
        "hi",
        "hello",
        "hey",
        "howdy",
        "yo",
        "hiya",
        "greetings",
        // time‑of‑day
        "good morning",
        "good afternoon",
        "good evening",
        "good night",
        // farewells
        "bye",
        "goodbye",
        "see you",
        "see ya",
        "later",
        "peace",
        "take care",
        "catch you later",
        "talk to you later",
        // thanks
        "thanks",
        "thank you",
        "thank you very much",
        "thank you so much",
        "thank you a lot",
        "thank u",
        // well‑being
        "how are you",
        "how are you doing",
        "how's it going",
        "how are things",
        "how have you been",
        "how you doing",
        // small talk
        "what's up",
        "whats up",
        "sup",
        "what's new",
        "whats new",
        "what have you been up to",
        "what's happening",
        "whats happening",
        // help/joke
        "help",
        "help me",
        "support",
        "assist",
        "tell me a joke",
        "joke",
        "make me laugh",
        // laughter
        "lol",
        "haha",
        "lmao",
        "rofl",
        // pleasantries
        "nice to meet you",
        "nice meeting you",
        "nice chatting",
        "pleasure meeting",
        "pleasure speaking",
        "likewise",
        // acknowledgments
        "ok",
        "okay",
        "sure",
        "got it",
        "sounds good",
        "yep",
        "yeah",
        "yup",
        // negations
        "no",
        "nope",
        "nah",
        // reactions
        "wow",
        "awesome",
        "nice",
        "cool",
    ]);
    return simples.has(msg);
}
