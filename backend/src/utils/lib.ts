/**
 * Detect if a user message is a simple greeting or small‑talk.
 *
 * @param message - the user’s message text
 * @return true if we can skip data retrieval and clustering
 */
export default function agentHelper(message: string): boolean {
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
