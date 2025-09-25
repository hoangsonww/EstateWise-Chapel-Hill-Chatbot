import { Router } from "express";
import {
  getCommunityInsights,
  listCommunityInsightCategories,
  searchCommunityInsights,
} from "../controllers/communityInsights.controller";

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     CommunityInsight:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         category:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         source:
 *           type: string
 *           nullable: true
 *         lastUpdated:
 *           type: string
 *           format: date
 * tags:
 *   - name: Community Insights
 *     description: Neighborhood highlights backed by a local SQLite dataset.
 */

/**
 * @swagger
 * /api/community-insights:
 *   get:
 *     summary: List curated neighborhood insights
 *     description: >-
 *       Returns curated insights about Chapel Hill amenities backed by a SQLite data store. Use the
 *       optional `category` query parameter to limit results to a specific topic such as
 *       `education`, `transportation`, or `recreation`.
 *     tags: [Community Insights]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter insights by category (case insensitive).
 *     responses:
 *       200:
 *         description: A list of curated neighborhood insights.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 insights:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       category:
 *                         type: string
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       source:
 *                         type: string
 *                         nullable: true
 *                       lastUpdated:
 *                         type: string
 *                         format: date
 */
router.get("/", getCommunityInsights);

/**
 * @swagger
 * /api/community-insights/search:
 *   get:
 *     summary: Search neighborhood insights by keyword
 *     tags: [Community Insights]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: Keyword to search within the title, description, or category.
 *     responses:
 *       200:
 *         description: Matching insights.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 insights:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CommunityInsight'
 *       400:
 *         description: Missing search query.
 */
router.get("/search", searchCommunityInsights);

/**
 * @swagger
 * /api/community-insights/categories:
 *   get:
 *     summary: List available community insight categories
 *     tags: [Community Insights]
 *     responses:
 *       200:
 *         description: Available insight categories.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 categories:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.get("/categories", listCommunityInsightCategories);

export default router;
