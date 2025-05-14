"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.index = void 0;
const pinecone_1 = require("@pinecone-database/pinecone");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
if (!process.env.PINECONE_API_KEY) {
    throw new Error("PINECONE_API_KEY is not set in .env");
}
if (!process.env.PINECONE_INDEX) {
    throw new Error("PINECONE_INDEX is not set in .env");
}
const pinecone = new pinecone_1.Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pinecone.index(process.env.PINECONE_INDEX.trim());
exports.index = index;
