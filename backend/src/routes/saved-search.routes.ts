import { Router } from "express";
import {
  createSavedSearch,
  getSavedSearches,
  getSavedSearchById,
  updateSavedSearch,
  deleteSavedSearch,
  runSavedSearch,
} from "../controllers/savedSearch.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

// All saved-search endpoints require authentication
router.use(authMiddleware);

/**
 * @swagger
 * /api/saved-searches:
 *   post:
 *     summary: Create a new saved search
 *     tags: [Saved Searches]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - query
 *             properties:
 *               name:
 *                 type: string
 *                 description: Human-readable label for this search.
 *                 example: "2BR under 500k Chapel Hill"
 *               query:
 *                 type: string
 *                 description: Raw search query string.
 *                 example: "2 bedroom under 500000 Chapel Hill"
 *               filters:
 *                 type: object
 *                 description: Optional structured filter metadata.
 *               frequency:
 *                 type: string
 *                 enum: [hourly, daily, custom]
 *                 default: daily
 *               alertTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [new_match, price_drop, status_change]
 *                 default: [new_match]
 *               priceDropPercent:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Min price-drop % to trigger an alert.
 *               priceDropAmount:
 *                 type: number
 *                 minimum: 0
 *                 description: Min price-drop $ to trigger an alert.
 *     responses:
 *       201:
 *         description: Saved search created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SavedSearch'
 *       400:
 *         description: Validation error.
 *       401:
 *         description: Unauthorized.
 *       422:
 *         description: Max saved searches per user reached.
 */
router.post("/", createSavedSearch);

/**
 * @swagger
 * /api/saved-searches:
 *   get:
 *     summary: List all saved searches for the authenticated user
 *     tags: [Saved Searches]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of saved searches.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SavedSearch'
 *       401:
 *         description: Unauthorized.
 */
router.get("/", getSavedSearches);

/**
 * @swagger
 * /api/saved-searches/{id}:
 *   get:
 *     summary: Get a specific saved search by ID
 *     tags: [Saved Searches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Saved search ID.
 *     responses:
 *       200:
 *         description: The saved search.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SavedSearch'
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Not found.
 */
router.get("/:id", getSavedSearchById);

/**
 * @swagger
 * /api/saved-searches/{id}:
 *   put:
 *     summary: Update a saved search
 *     tags: [Saved Searches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               query:
 *                 type: string
 *               frequency:
 *                 type: string
 *                 enum: [hourly, daily, custom]
 *               alertTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [new_match, price_drop, status_change]
 *               priceDropPercent:
 *                 type: number
 *               priceDropAmount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Updated saved search.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SavedSearch'
 *       400:
 *         description: Validation error.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Not found.
 */
router.put("/:id", updateSavedSearch);

/**
 * @swagger
 * /api/saved-searches/{id}:
 *   delete:
 *     summary: Delete a saved search
 *     tags: [Saved Searches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted successfully.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Not found.
 */
router.delete("/:id", deleteSavedSearch);

/**
 * @swagger
 * /api/saved-searches/{id}/run:
 *   post:
 *     summary: Manually trigger the alert job for a saved search (debug/test)
 *     tags: [Saved Searches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Alert job triggered.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Not found.
 */
router.post("/:id/run", runSavedSearch);

export default router;
