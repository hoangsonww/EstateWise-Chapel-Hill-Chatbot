import { Router } from "express";
import {
  fetchMarketInsights,
  rebuildMarketInsightsHandler,
} from "../controllers/insight.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Insights
 *     description: Market insight archives derived from the HDF5 analytics store.
 */

/**
 * @swagger
 * /api/insights/market:
 *   get:
 *     summary: Retrieve aggregated market insights stored in the HDF5 archive.
 *     tags: [Insights]
 *     responses:
 *       200:
 *         description: Insight payload containing city, home type, and pricing analytics.
 *       500:
 *         description: Server error - unable to load the HDF5 archive.
 */
router.get("/market", fetchMarketInsights);

/**
 * @swagger
 * /api/insights/rebuild:
 *   post:
 *     summary: Rebuild the market insight archive from the latest MongoDB property data.
 *     tags: [Insights]
 *     responses:
 *       202:
 *         description: Archive rebuild scheduled/completed successfully.
 *       500:
 *         description: Server error - unable to rebuild the archive.
 */
router.post("/rebuild", rebuildMarketInsightsHandler);

export default router;
