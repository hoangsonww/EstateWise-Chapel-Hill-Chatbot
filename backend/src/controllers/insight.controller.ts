import { Request, Response } from "express";
import {
  getMarketInsights,
  rebuildMarketInsights,
} from "../services/insightHdf5.service";

export const fetchMarketInsights = async (req: Request, res: Response) => {
  try {
    const insights = await getMarketInsights();
    res.status(200).json(insights);
  } catch (error) {
    console.error("Failed to load market insights", error);
    res.status(500).json({ error: "Failed to load market insights" });
  }
};

export const rebuildMarketInsightsHandler = async (req: Request, res: Response) => {
  try {
    const result = await rebuildMarketInsights();
    res.status(202).json(result);
  } catch (error) {
    console.error("Failed to rebuild market insights archive", error);
    res.status(500).json({ error: "Failed to rebuild market insights archive" });
  }
};
