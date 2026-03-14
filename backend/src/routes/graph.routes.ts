import { Router } from "express";
import {
  similarByZpid,
  explainPropertyPath,
  neighborhoodStats,
  graphOverview,
} from "../controllers/graph.controller";

const router = Router();

/**
 * @swagger
 * /api/graph/similar/{zpid}:
 *   get:
 *     summary: Similar properties via graph relationships with reasons
 *     tags: [Graph]
 *     parameters:
 *       - in: path
 *         name: zpid
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of similar properties and reasons
 *       503:
 *         description: Neo4j not configured
 */
router.get("/similar/:zpid", similarByZpid);

/**
 * @swagger
 * /api/graph/explain:
 *   get:
 *     summary: Explain why two properties are related
 *     tags: [Graph]
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Path explanation
 */
router.get("/explain", explainPropertyPath);

/**
 * @swagger
 * /api/graph/neighborhood/{name}:
 *   get:
 *     summary: Neighborhood stats and sample properties
 *     tags: [Graph]
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Stats and properties
 */
router.get("/neighborhood/:name", neighborhoodStats);

/**
 * @swagger
 * /api/graph/overview:
 *   get:
 *     summary: Sampled global graph view for visualization
 *     tags: [Graph]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 250
 *     responses:
 *       200:
 *         description: Sampled nodes/edges and total graph counts
 */
router.get("/overview", graphOverview);

export default router;
