import path from "path";
import { spawn } from "child_process";
import fs from "fs/promises";

import Property, { IProperty } from "../models/Property.model";

type LeanProperty = Pick<
  IProperty,
  | "zpid"
  | "price"
  | "bedrooms"
  | "bathrooms"
  | "livingArea"
  | "city"
  | "state"
  | "homeType"
  | "latitude"
  | "longitude"
> & { _id?: unknown };

export interface MarketInsightSummary {
  cityPriceSummary: Array<{
    city: string;
    properties: number;
    averagePrice: number | null;
    averageLivingArea: number | null;
  }>;
  homeTypeSummary: Array<{
    homeType: string;
    properties: number;
    averagePrice: number | null;
  }>;
  bedroomDistribution: Array<{
    band: string;
    properties: number;
  }>;
  priceQuartiles: {
    min: number | null;
    q1: number | null;
    median: number | null;
    q3: number | null;
    max: number | null;
  };
  averagePricePerSqft: number | null;
  marketTotals: Record<string, number | null>;
}

interface PythonResult {
  status?: string;
  message?: string;
  [key: string]: unknown;
}

const PYTHON_BIN = process.env.PYTHON_BIN || process.env.PYTHON_PATH || "python3";
const SCRIPT_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "data",
  "python",
  "hdf5_insights.py",
);
const HDF5_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "data",
  "hdf5",
  "property_insights.h5",
);

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toString(value: unknown, fallback = "Unknown"): string {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return fallback;
}

async function runPython(
  args: string[],
  payload?: Record<string, unknown>,
): Promise<PythonResult> {
  await fs.mkdir(path.dirname(HDF5_PATH), { recursive: true });

  return new Promise((resolve, reject) => {
    const child = spawn(PYTHON_BIN, [SCRIPT_PATH, ...args]);

    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf-8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });

    child.stderr.setEncoding("utf-8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        let parsedError: PythonResult | null = null;
        try {
          const raw = stderr || stdout;
          parsedError = raw ? (JSON.parse(raw) as PythonResult) : null;
        } catch (parseErr) {
          parsedError = null;
        }

        const reason =
          (parsedError && typeof parsedError.message === "string"
            ? parsedError.message
            : `${stderr || stdout || "no output"}`) || "Unknown error";
        const error = new Error(
          `Python script exited with code ${code}: ${reason}`,
        );

        if (
          parsedError?.message &&
          typeof parsedError.message === "string" &&
          parsedError.message.toLowerCase().includes("no such file or directory")
        ) {
          (error as NodeJS.ErrnoException).code = "ENOENT";
        }

        return reject(error);
      }
      try {
        const parsed: PythonResult = stdout ? JSON.parse(stdout) : {};
        resolve(parsed);
      } catch (error) {
        reject(error);
      }
    });

    if (payload) {
      child.stdin.write(JSON.stringify(payload));
    }
    child.stdin.end();
  });
}

export async function rebuildMarketInsights(): Promise<{
  message: string;
  propertyCount: number;
}> {
  const records: LeanProperty[] = await Property.find(
    {},
    {
      zpid: 1,
      price: 1,
      bedrooms: 1,
      bathrooms: 1,
      livingArea: 1,
      city: 1,
      state: 1,
      homeType: 1,
      latitude: 1,
      longitude: 1,
    },
  )
    .lean()
    .exec();

  const formatted = records.map((prop) => {
    const livingArea = toNumber(prop.livingArea) || 0;
    const price = toNumber(prop.price) || 0;
    const pricePerSqft = livingArea > 0 ? price / livingArea : null;

    return {
      zpid: toNumber(prop.zpid) ?? 0,
      price,
      bedrooms: toNumber(prop.bedrooms) ?? 0,
      bathrooms: toNumber(prop.bathrooms) ?? 0,
      livingArea,
      city: toString(prop.city),
      state: toString(prop.state),
      homeType: toString(prop.homeType),
      latitude: toNumber(prop.latitude) ?? 0,
      longitude: toNumber(prop.longitude) ?? 0,
      pricePerSqft,
    };
  });

  const response = await runPython(["write", "--file", HDF5_PATH], {
    properties: formatted,
  });

  const stored = typeof response.propertiesStored === "number" ? response.propertiesStored : 0;

  return {
    message: "Market insight archive refreshed",
    propertyCount: stored,
  };
}

function isMarketInsightSummary(value: PythonResult): value is MarketInsightSummary {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as MarketInsightSummary).cityPriceSummary)
  );
}

async function readMarketInsights(): Promise<MarketInsightSummary> {
  const response = await runPython(["read", "--file", HDF5_PATH]);
  if (isMarketInsightSummary(response)) {
    return response;
  }
  if (response.status === "error") {
    throw new Error(response.message || "Failed to read market insight archive");
  }
  throw new Error("Unexpected response from market insight reader");
}

export async function getMarketInsights(): Promise<MarketInsightSummary> {
  try {
    return await readMarketInsights();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      await rebuildMarketInsights();
      return readMarketInsights();
    }
    throw error;
  }
}
