import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import Property, { IProperty } from "../models/Property.model";

const MONGO_URI = process.env.MONGO_URI!;
if (!MONGO_URI) {
  console.error("MONGO_URI is not set in .env");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => {
    console.error("Error connecting to MongoDB", err);
    process.exit(1);
  });

/**
 * This is the cleaned property interface.
 * It contains only the fields needed for chatbot recommendations.
 */
interface CleanedProperty {
  zpid: number;
  city: string;
  state: string;
  homeStatus: string;
  address: {
    streetAddress: string;
    city: string;
    state: string;
    zipcode: string;
    neighborhood?: string | null;
    community?: string | null;
    subdivision?: string | null;
  };
  bedrooms: number;
  bathrooms: number;
  price: number;
  yearBuilt: number;
  latitude: number;
  longitude: number;
  livingArea: number;
  homeType: string;
  listingDataSource: string;
  description: string;
}

/**
 * Helper: if a value is a nonempty string, return the trimmed version;
 * otherwise, return a fallback.
 */
const safeStr = (val: any, fallback = "Unknown"): string => {
  if (typeof val === "string" && val.trim().length > 0) return val.trim();
  return fallback;
};

/**
 * Helper for numeric values: convert to a number and (optionally) enforce minimum/maximum.
 */
const safeNum = (
  val: any,
  fallback = 0,
  min?: number,
  max?: number,
): number => {
  const n = Number(val);
  if (isNaN(n)) return fallback;
  if (typeof min === "number" && n < min) return fallback;
  if (typeof max === "number" && n > max) return fallback;
  return n;
};

/**
 * Cleans an object representing a property. Only the relevant keys are retained,
 * and defaults/outlier checks are applied (for example, yearBuilt is set to 0 if invalid).
 */
export function cleanDocument(property: any): IProperty {
  return {
    ...property, // Spread the original property to include all fields
    id: property.id.toString(),
    price: Number(property.price) || 0,
    bedrooms: Number(property.bedrooms) || 0,
    bathrooms: Number(property.bathrooms) || 0,
    livingArea: Number(property.livingArea) || 0,
    yearBuilt: property.yearBuilt || 0,
    homeType: property.homeType || "Unknown",
    homeStatus: property.homeStatus || "Unknown",
    city: property.city || "Unknown",
    link: property.link || "", // Include the link field
  } as IProperty; // Explicitly cast to IProperty
}

/**
 * Main cleaning function: load all documents, clean each one and update the document individually.
 * This reduces the write batch size so that MongoDB Atlas does not hit our free-tier Pinecone quota.
 */
async function cleanProperties() {
  try {
    const docs = await Property.find({});
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
      } catch (error) {
        console.error(`Error updating document ${doc._id}:`, error);
      }
    }
    console.log(
      `Data cleaning completed. Total updated: ${updatedCount} documents.`,
    );
    process.exit(0);
  } catch (err) {
    console.error("Error during cleaning:", err);
    process.exit(1);
  }
}

cleanProperties();
