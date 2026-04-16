import { Request, Response } from "express";
import {
  getLiveDataStatus,
  searchLiveListings,
} from "../services/liveData.service";

export function liveDataStatus(_req: Request, res: Response) {
  try {
    return res.json(getLiveDataStatus());
  } catch (error: any) {
    return res.status(500).json({
      error: "Failed to load live data status",
      message: error?.message || String(error),
    });
  }
}

export function liveDataSearch(req: Request, res: Response) {
  try {
    const query = String(req.query.q || "");
    const parsedLimit =
      req.query.limit != null ? Number(req.query.limit) : Number.NaN;
    const limit = Number.isFinite(parsedLimit) ? parsedLimit : 10;
    return res.json(searchLiveListings(query, limit));
  } catch (error: any) {
    return res.status(500).json({
      error: "Failed to search live data snapshot",
      message: error?.message || String(error),
    });
  }
}
