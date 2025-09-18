import { NextFunction, Request, Response } from "express";
import communityInsightsService from "../services/communityInsights.service";

export const getCommunityInsights = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const categoryQuery = typeof req.query.category === "string" ? req.query.category.trim() : undefined;
    const category = categoryQuery ? categoryQuery : undefined;
    const insights = await communityInsightsService.listInsights(category);

    res.json({ insights });
  } catch (error) {
    next(error);
  }
};

export const searchCommunityInsights = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const query = typeof req.query.q === "string" ? req.query.q.trim() : "";

    if (!query) {
      res.status(400).json({ message: "Query parameter 'q' is required." });
      return;
    }

    const insights = await communityInsightsService.searchInsights(query);
    res.json({ insights });
  } catch (error) {
    next(error);
  }
};

export const listCommunityInsightCategories = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const categories = await communityInsightsService.listCategories();
    res.json({ categories });
  } catch (error) {
    next(error);
  }
};
