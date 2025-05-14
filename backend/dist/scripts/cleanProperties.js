"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const mongoose_1 = __importDefault(require("mongoose"));
const Property_model_1 = __importDefault(require("../models/Property.model"));
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
    console.error("MONGO_URI is not set in .env");
    process.exit(1);
}
mongoose_1.default
    .connect(MONGO_URI)
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => {
    console.error("Error connecting to MongoDB", err);
    process.exit(1);
});
/**
 * Helper: if a value is a nonempty string, return the trimmed version;
 * otherwise, return a fallback.
 */
const safeStr = (val, fallback = "Unknown") => {
    if (typeof val === "string" && val.trim().length > 0)
        return val.trim();
    return fallback;
};
/**
 * Helper for numeric values: convert to a number and (optionally) enforce minimum/maximum.
 */
const safeNum = (val, fallback = 0, min, max) => {
    const n = Number(val);
    if (isNaN(n))
        return fallback;
    if (typeof min === "number" && n < min)
        return fallback;
    if (typeof max === "number" && n > max)
        return fallback;
    return n;
};
/**
 * Cleans an object representing a property. Only the relevant keys are retained,
 * and defaults/outlier checks are applied (for example, yearBuilt is set to 0 if invalid).
 */
function cleanDocument(doc) {
    const currentYear = new Date().getFullYear();
    // Clean yearBuilt: if before 1800 or beyond next year, consider invalid.
    let yearBuilt = safeNum(doc.yearBuilt, 0);
    if (yearBuilt < 1800 || yearBuilt > currentYear + 1) {
        yearBuilt = 0;
    }
    return {
        zpid: safeNum(doc.zpid, 0),
        // Use top-level city/state if possible; if not, fallback to values in doc.address
        city: safeStr(doc.city, "") ||
            (doc.address && safeStr(doc.address.city, "")) ||
            "Unknown",
        state: safeStr(doc.state, "") ||
            (doc.address && safeStr(doc.address.state, "")) ||
            "Unknown",
        homeStatus: safeStr(doc.homeStatus, ""),
        address: {
            streetAddress: (doc.address && safeStr(doc.address.streetAddress, "")) ||
                safeStr(doc.streetAddress, "Unknown"),
            city: (doc.address && safeStr(doc.address.city, "")) ||
                safeStr(doc.city, "Unknown"),
            state: (doc.address && safeStr(doc.address.state, "")) ||
                safeStr(doc.state, "Unknown"),
            zipcode: (doc.address && safeStr(doc.address.zipcode, "")) ||
                safeStr(doc.zipcode, "Unknown"),
            neighborhood: doc.address ? (doc.address.neighborhood ?? null) : null,
            community: doc.address ? (doc.address.community ?? null) : null,
            subdivision: doc.address ? (doc.address.subdivision ?? null) : null,
        },
        bedrooms: safeNum(doc.bedrooms, 0, 0, 20),
        bathrooms: safeNum(doc.bathrooms, 0, 0, 20),
        // Accept prices between $10,000 and $10,000,000.
        price: safeNum(doc.price, 0, 10000, 10000000),
        yearBuilt,
        // Ensure valid latitude and longitude.
        latitude: safeNum(doc.latitude, 0),
        longitude: safeNum(doc.longitude, 0),
        // Living area: must be between 100 and 20,000 sqft.
        livingArea: safeNum(doc.livingArea, 0, 100, 20000),
        homeType: safeStr(doc.homeType, ""),
        listingDataSource: safeStr(doc.listingDataSource, "Legacy"),
        description: safeStr(doc.description, ""),
    };
}
/**
 * Main cleaning function: load all documents, clean each one and update the document individually.
 * This reduces the write batch size so that MongoDB Atlas does not hit our free-tier Pinecone quota.
 */
async function cleanProperties() {
    try {
        const docs = await Property_model_1.default.find({});
        console.log(`Found ${docs.length} documents.`);
        let updatedCount = 0;
        for (const doc of docs) {
            const cleaned = cleanDocument(doc.toObject());
            // Overwrite the document's content with the new cleaned document
            // while preserving the existing _id
            doc.overwrite({ _id: doc._id, ...cleaned });
            try {
                await doc.save();
                updatedCount++;
                if (updatedCount % 100 === 0) {
                    console.log(`${updatedCount} documents updated so far.`);
                }
            }
            catch (error) {
                console.error(`Error updating document ${doc._id}:`, error);
            }
        }
        console.log(`Data cleaning completed. Total updated: ${updatedCount} documents.`);
        process.exit(0);
    }
    catch (err) {
        console.error("Error during cleaning:", err);
        process.exit(1);
    }
}
cleanProperties();
