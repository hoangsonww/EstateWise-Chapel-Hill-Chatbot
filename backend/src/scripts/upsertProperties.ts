import dotenv from "dotenv";
dotenv.config();

import fs, { createReadStream } from "fs";
import path from "path";
import { parser } from "stream-json";
import { streamArray } from "stream-json/streamers/StreamArray";

import { index } from "../pineconeClient";

import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GOOGLE_AI_API_KEY) {
  console.error("GOOGLE_AI_API_KEY is not set in .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
const model = genAI.getGenerativeModel({ model: "models/text-embedding-004" });

const BATCH_SIZE = 50;

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
function safeStr(val: any, fallback = "Unknown"): string {
  if (typeof val === "string" && val.trim().length > 0) return val.trim();
  return fallback;
}

/**
 * Helper: if a value is a number, return it; otherwise, return a fallback.
 * Optionally, check if the value is within a specified range (min and max).
 */
function safeNum(val: any, fallback = 0, min?: number, max?: number): number {
  const n = Number(val);
  if (isNaN(n)) return fallback;
  if (typeof min === "number" && n < min) return fallback;
  if (typeof max === "number" && n > max) return fallback;
  return n;
}

/**
 * Clean the document by extracting and validating necessary fields.
 * This function will return a CleanedProperty object.
 */
function cleanDocument(doc: any): CleanedProperty {
  const currentYear = new Date().getFullYear();

  let yearBuilt = safeNum(doc.yearBuilt, 0);
  if (yearBuilt < 1800 || yearBuilt > currentYear + 1) {
    yearBuilt = 0;
  }

  return {
    zpid: safeNum(doc.zpid, 0),
    city:
      safeStr(doc.city, "") ||
      (doc.address && safeStr(doc.address.city, "")) ||
      "Unknown",
    state:
      safeStr(doc.state, "") ||
      (doc.address && safeStr(doc.address.state, "")) ||
      "Unknown",
    homeStatus: safeStr(doc.homeStatus, ""),
    address: {
      streetAddress:
        (doc.address && safeStr(doc.address.streetAddress, "")) ||
        safeStr(doc.streetAddress, "Unknown"),
      city:
        (doc.address && safeStr(doc.address.city, "")) ||
        safeStr(doc.city, "Unknown"),
      state:
        (doc.address && safeStr(doc.address.state, "")) ||
        safeStr(doc.state, "Unknown"),
      zipcode:
        (doc.address && safeStr(doc.address.zipcode, "")) ||
        safeStr(doc.zipcode, "Unknown"),
      neighborhood: doc.address ? (doc.address.neighborhood ?? null) : null,
      community: doc.address ? (doc.address.community ?? null) : null,
      subdivision: doc.address ? (doc.address.subdivision ?? null) : null,
    },
    bedrooms: safeNum(doc.bedrooms, 0, 0, 20),
    bathrooms: safeNum(doc.bathrooms, 0, 0, 20),
    price: safeNum(doc.price, 0, 10000, 10000000),
    yearBuilt: yearBuilt,
    latitude: safeNum(doc.latitude, 0),
    longitude: safeNum(doc.longitude, 0),
    livingArea: safeNum(doc.livingArea, 0, 100, 20000),
    homeType: safeStr(doc.homeType, ""),
    listingDataSource: safeStr(doc.listingDataSource, "Legacy"),
    description: safeStr(doc.description, ""),
  };
}

/**
 * Given a cleaned property document, produce a metadata object where all values are either
 * string, number, boolean, or an array of strings. (Note: we JSON.stringify the address.)
 */
function createMetadata(
  cleanDoc: CleanedProperty,
): Record<string, string | number | boolean> {
  return {
    zpid: cleanDoc.zpid,
    city: cleanDoc.city,
    state: cleanDoc.state,
    homeStatus: cleanDoc.homeStatus,
    // Convert the address object to a JSON string.
    address: JSON.stringify(cleanDoc.address),
    bedrooms: cleanDoc.bedrooms,
    bathrooms: cleanDoc.bathrooms,
    price: cleanDoc.price,
    yearBuilt: cleanDoc.yearBuilt,
    latitude: cleanDoc.latitude,
    longitude: cleanDoc.longitude,
    livingArea: cleanDoc.livingArea,
    homeType: cleanDoc.homeType,
    listingDataSource: cleanDoc.listingDataSource,
    description: cleanDoc.description,
  };
}

async function processFileStreaming(
  fileName: string,
  vectorBatch: Array<{
    id: string;
    values: number[];
    metadata: Record<string, string | number | boolean>;
  }>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const filePath = path.join(__dirname, fileName);
    const readStream = createReadStream(filePath, { encoding: "utf8" });
    const jsonStream = readStream.pipe(parser()).pipe(streamArray());

    jsonStream.on("data", async ({ key, value }) => {
      jsonStream.pause();

      try {
        const cleanDoc = cleanDocument(value);

        if (
          cleanDoc.city === "Unknown" ||
          cleanDoc.state === "Unknown" ||
          cleanDoc.address.streetAddress === "Unknown" ||
          cleanDoc.address.zipcode === "Unknown" ||
          cleanDoc.zpid === 0
        ) {
          console.warn(
            `Skipping record with missing fields: zpid=${cleanDoc.zpid}`,
          );
          jsonStream.resume();
          return;
        }

        const text = `Property at ${cleanDoc.address.streetAddress}, ${cleanDoc.address.city}, ${cleanDoc.address.state} (${cleanDoc.address.zipcode}). Price: $${cleanDoc.price}. Beds: ${cleanDoc.bedrooms}, Baths: ${cleanDoc.bathrooms}, Built in ${cleanDoc.yearBuilt}. ${cleanDoc.description}`;

        console.log(
          `Generating embedding for: "${cleanDoc.address.streetAddress}"`,
        );
        let embedding: number[] = [];
        try {
          const embedResp = await model.embedContent(text);
          if (
            !embedResp ||
            !embedResp.embedding ||
            !Array.isArray(embedResp.embedding.values)
          ) {
            throw new Error("Invalid embedding response format.");
          }
          embedding = embedResp.embedding.values;
        } catch (embedError) {
          console.error(
            `Error generating embedding for zpid=${cleanDoc.zpid}:`,
            embedError,
          );
          jsonStream.resume();
          return;
        }

        vectorBatch.push({
          id: String(cleanDoc.zpid),
          values: embedding,
          metadata: createMetadata(cleanDoc),
        });

        if (vectorBatch.length >= BATCH_SIZE) {
          const batchToUpsert = vectorBatch.splice(0, BATCH_SIZE);
          try {
            await index.upsert(batchToUpsert);
            console.log(`Upserted batch of ${BATCH_SIZE} vectors to Pinecone.`);
          } catch (upsertError: any) {
            console.error("Error upserting batch: ", upsertError);
          }
        }
      } catch (recordError) {
        console.error("Error processing record:", recordError);
      } finally {
        jsonStream.resume();
      }
    });

    jsonStream.on("end", async () => {
      if (vectorBatch.length > 0) {
        try {
          await index.upsert(vectorBatch.splice(0, vectorBatch.length));
          console.log("Upserted final batch of remaining vectors.");
        } catch (finalError) {
          console.error("Error upserting final batch:", finalError);
        }
      }
      resolve();
    });

    jsonStream.on("error", (err) => {
      console.error(`Error streaming file ${fileName}:`, err);
      reject(err);
    });
  });
}

async function upsertPropertiesToPinecone() {
  try {
    const files = [
      "Zillow-March2025-dataset_part0.json",
      "Zillow-March2025-dataset_part1.json",
      "Zillow-March2025-dataset_part2.json",
      "Zillow-March2025-dataset_part3.json",
    ];

    const vectorBatch: Array<{
      id: string;
      values: number[];
      metadata: Record<string, string | number | boolean>;
    }> = [];

    for (const file of files) {
      console.log(`Processing file: ${file}`);
      try {
        await processFileStreaming(file, vectorBatch);
      } catch (fileErr) {
        console.error(`Error processing file ${file}:`, fileErr);
      }
    }

    console.log("Data upsert completed.");
    process.exit(0);
  } catch (error) {
    console.error("Error in upserting properties data:", error);
    process.exit(1);
  }
}

// Define the IProperty interface
interface IProperty {
  id: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  livingArea: number;
  yearBuilt?: number;
  homeType: string;
  homeStatus: string;
  city: string;
  link?: string;
}

export async function upsertProperties(properties: IProperty[]) {
  const formattedProperties = properties.map((property) => ({
    id: property.id,
    metadata: {
      price: property.price,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      livingArea: property.livingArea,
      yearBuilt: property.yearBuilt || 0,
      homeType: property.homeType,
      homeStatus: property.homeStatus,
      city: property.city,
      link: property.link || "", // Include the link field
    },
  }));

  // Upsert logic remains unchanged
}

upsertPropertiesToPinecone().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
