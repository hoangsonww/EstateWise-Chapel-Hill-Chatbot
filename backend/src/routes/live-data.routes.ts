import { Router } from "express";
import {
  liveDataSearch,
  liveDataStatus,
} from "../controllers/live-data.controller";

const router = Router();

/**
 * @swagger
 * /api/live-data/status:
 *   get:
 *     summary: Get local live Zillow snapshot status
 *     tags: [Live Data]
 *     responses:
 *       200:
 *         description: Live snapshot metadata
 */
router.get("/status", liveDataStatus);

/**
 * @swagger
 * /api/live-data/search:
 *   get:
 *     summary: Search local live Zillow snapshot records
 *     tags: [Live Data]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Free-text query terms (city/state/address/zip)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *         description: Maximum results to return
 *     responses:
 *       200:
 *         description: Matching listings from local snapshot
 */
router.get("/search", liveDataSearch);

export default router;
