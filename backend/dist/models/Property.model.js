"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
/**
 * Helper: if a value is a nonempty string, return the trimmed version;
 * otherwise, return a fallback.
 */
const AddressSchema = new mongoose_1.Schema({
    streetAddress: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipcode: { type: String, required: true },
    neighborhood: { type: String, default: null },
    community: { type: String, default: null },
    subdivision: { type: String, default: null },
}, { _id: false });
/**
 * This is the property schema.
 * It contains only the fields needed for your chatbot recommendations.
 */
const PropertySchema = new mongoose_1.Schema({
    zpid: { type: Number, required: true, unique: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    homeStatus: { type: String, required: true },
    address: { type: AddressSchema, required: true },
    bedrooms: { type: Number, required: true },
    bathrooms: { type: Number, required: true },
    price: { type: Number, required: true },
    yearBuilt: { type: Number, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    livingArea: { type: Number, required: true },
    homeType: { type: String, required: true },
    listingDataSource: { type: String, required: true },
    description: { type: String, default: "" },
});
exports.default = mongoose_1.default.model("Property", PropertySchema);
