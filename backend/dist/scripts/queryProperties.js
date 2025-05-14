"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryProperties = queryProperties;
exports.queryPropertiesAsString = queryPropertiesAsString;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const pineconeClient_1 = require("../pineconeClient");
const generative_ai_1 = require("@google/generative-ai");
if (!process.env.GOOGLE_AI_API_KEY) {
    console.error("GOOGLE_AI_API_KEY is not set in .env");
    process.exit(1);
}
if (!process.env.PINECONE_INDEX) {
    console.error("PINECONE_INDEX is not set in .env");
    process.exit(1);
}
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
const model = genAI.getGenerativeModel({ model: "models/text-embedding-004" });
/**
 * Sanitizes metadata by converting all values to strings, numbers, or booleans.
 * Arrays are joined into a string if they contain only strings.
 * Objects are converted to JSON strings.
 *
 * @param metadata The metadata object to sanitize.
 * @returns A sanitized metadata object.
 */
function sanitizeMetadata(metadata) {
    const result = {};
    if (!metadata || typeof metadata !== "object")
        return result;
    for (const [key, value] of Object.entries(metadata)) {
        if (typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean") {
            result[key] = value;
        }
        else if (Array.isArray(value)) {
            if (value.every((x) => typeof x === "string")) {
                result[key] = value.join(", ");
            }
            else {
                result[key] = JSON.stringify(value);
            }
        }
        else if (value !== null && typeof value === "object") {
            result[key] = JSON.stringify(value);
        }
        else {
            result[key] = String(value);
        }
    }
    return result;
}
/**
 * Queries the Pinecone index for properties matching the given query string.
 *
 * @param query The query string to search for.
 * @param topK The number of top results to return.
 * @returns A promise that resolves with an array of RawQueryResult objects.
 */
async function queryProperties(query, topK = 10) {
    console.log(`Generating embedding for query: "${query}"`);
    const embeddingResponse = await model.embedContent(query);
    const embedding = embeddingResponse.embedding.values;
    if (!embedding || !Array.isArray(embedding)) {
        throw new Error("Invalid embedding response.");
    }
    console.log("Querying Pinecone index...");
    const queryResponse = await pineconeClient_1.index.query({
        vector: embedding,
        topK,
        includeMetadata: true,
    });
    console.log("Received query response from Pinecone.");
    const results = (queryResponse.matches || []).map((match) => ({
        id: match.id,
        score: match.score !== undefined ? match.score : 0,
        metadata: sanitizeMetadata(match.metadata),
    }));
    return results;
}
/**
 * Queries properties and formats the results as a string.
 *
 * @param query The query string to search for.
 * @param topK The number of top results to return.
 * @returns A promise that resolves with a formatted string of property details.
 */
async function queryPropertiesAsString(query, topK = 10) {
    try {
        const results = await queryProperties(query, topK);
        if (results.length === 0)
            return "No matching properties found.";
        let response = "Matching Properties:\n\n";
        results.forEach((result) => {
            // Extract and parse the address if available.
            let addressObj = {};
            if (result.metadata.address) {
                try {
                    addressObj = JSON.parse(result.metadata.address);
                }
                catch (error) {
                    console.warn(`Failed to parse address for id ${result.id}`);
                }
            }
            // Extract additional property fields from metadata.
            const street = addressObj.streetAddress || "Unknown address";
            const city = addressObj.city || "Unknown city";
            const state = addressObj.state || "Unknown state";
            const zipcode = addressObj.zipcode || "";
            const price = result.metadata.price ? `$${result.metadata.price}` : "N/A";
            const beds = result.metadata.bedrooms || "N/A";
            const baths = result.metadata.bathrooms || "N/A";
            const livingArea = result.metadata.livingArea
                ? `${result.metadata.livingArea} sqft`
                : "N/A";
            const yearBuilt = result.metadata.yearBuilt || "N/A";
            const homeType = result.metadata.homeType || "N/A";
            const description = result.metadata.description || "No description available.";
            const zpid = result.metadata.zpid ? result.metadata.zpid.toString() : "";
            const zillowLink = zpid
                ? `https://www.zillow.com/homedetails/${zpid}_zpid/`
                : "N/A";
            response +=
                `Property at ${street}, ${city}, ${state} ${zipcode}\n` +
                    `  - Price: ${price}\n` +
                    `  - Beds: ${beds}, Baths: ${baths}\n` +
                    `  - Living Area: ${livingArea}\n` +
                    `  - Year Built: ${yearBuilt}\n` +
                    `  - Type: ${homeType}\n` +
                    `  - Description: ${description}\n` +
                    `  - More details: ${zillowLink}\n\n`;
        });
        return response;
    }
    catch (error) {
        console.error("Error generating formatted query response:", error);
        return "Error retrieving property details.";
    }
}
