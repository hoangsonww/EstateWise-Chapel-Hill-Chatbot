import express from "express";
import * as activeLearningController from "../controllers/activeLearning.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = express.Router();

/**
 * @swagger
 * /api/active-learning/review-queue:
 *   get:
 *     summary: Get the review queue for human reviewers
 *     tags: [Active Learning]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in_review, reviewed]
 *           default: in_review
 *         description: Status of examples to retrieve
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Maximum number of examples to retrieve
 *     responses:
 *       200:
 *         description: Successfully retrieved review queue
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 examples:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ActiveLearningExample'
 *                 count:
 *                   type: integer
 *                 status:
 *                   type: string
 *       400:
 *         description: Invalid parameters
 *       500:
 *         description: Server error
 */
router.get("/review-queue", activeLearningController.getReviewQueue);

/**
 * @swagger
 * /api/active-learning/sample:
 *   post:
 *     summary: Sample new examples for human review
 *     tags: [Active Learning]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: Maximum number of examples to sample
 *     responses:
 *       200:
 *         description: Successfully sampled examples
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sampledExamples:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ActiveLearningExample'
 *                 count:
 *                   type: integer
 *                 message:
 *                   type: string
 *       401:
 *         description: Authentication required
 *       400:
 *         description: Invalid parameters
 *       500:
 *         description: Server error
 */
router.post("/sample", authMiddleware, activeLearningController.sampleExamples);

/**
 * @swagger
 * /api/active-learning/review:
 *   post:
 *     summary: Submit a human review for an example
 *     tags: [Active Learning]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - exampleId
 *               - correctedIntent
 *               - confidence
 *             properties:
 *               exampleId:
 *                 type: string
 *                 description: ID of the example being reviewed
 *               correctedIntent:
 *                 type: string
 *                 description: Human-corrected intent classification
 *               correctedResponse:
 *                 type: string
 *                 description: Optional corrected response
 *               confidence:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Reviewer confidence (1-5 scale)
 *               reviewNotes:
 *                 type: string
 *                 description: Additional notes from the reviewer
 *     responses:
 *       200:
 *         description: Review submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 reviewedExample:
 *                   $ref: '#/components/schemas/ActiveLearningExample'
 *                 message:
 *                   type: string
 *       401:
 *         description: Authentication required
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Example not found
 *       500:
 *         description: Server error
 */
router.post("/review", authMiddleware, activeLearningController.submitReview);

/**
 * @swagger
 * /api/active-learning/stats:
 *   get:
 *     summary: Get active learning statistics and metrics
 *     tags: [Active Learning]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for statistics (ISO format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for statistics (ISO format)
 *     responses:
 *       200:
 *         description: Successfully retrieved statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 activeLearning:
 *                   type: object
 *                   description: Active learning pipeline statistics
 *                 confidence:
 *                   type: object
 *                   description: Confidence tracking statistics
 *                 timeRange:
 *                   type: object
 *                   description: Time range for the statistics
 *       400:
 *         description: Invalid date format
 *       500:
 *         description: Server error
 */
router.get("/stats", activeLearningController.getActiveLearningStats);

/**
 * @swagger
 * /api/active-learning/validated:
 *   get:
 *     summary: Get validated examples ready for training data integration
 *     tags: [Active Learning]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 500
 *           default: 100
 *         description: Maximum number of examples to retrieve
 *     responses:
 *       200:
 *         description: Successfully retrieved validated examples
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 validatedExamples:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ActiveLearningExample'
 *                 count:
 *                   type: integer
 *                 message:
 *                   type: string
 *       401:
 *         description: Authentication required
 *       400:
 *         description: Invalid parameters
 *       500:
 *         description: Server error
 */
router.get("/validated", authMiddleware, activeLearningController.getValidatedExamples);

/**
 * @swagger
 * /api/active-learning/integrate:
 *   post:
 *     summary: Mark examples as integrated into training data
 *     tags: [Active Learning]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - exampleIds
 *             properties:
 *               exampleIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of example IDs to mark as integrated
 *     responses:
 *       200:
 *         description: Examples marked as integrated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 integratedCount:
 *                   type: integer
 *                 message:
 *                   type: string
 *       401:
 *         description: Authentication required
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Server error
 */
router.post("/integrate", authMiddleware, activeLearningController.markExamplesIntegrated);

/**
 * @swagger
 * /api/active-learning/examples/{exampleId}:
 *   get:
 *     summary: Get specific example details for review
 *     tags: [Active Learning]
 *     parameters:
 *       - in: path
 *         name: exampleId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the example to retrieve
 *     responses:
 *       200:
 *         description: Successfully retrieved example details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 example:
 *                   $ref: '#/components/schemas/ActiveLearningExample'
 *       400:
 *         description: Invalid example ID
 *       404:
 *         description: Example not found
 *       500:
 *         description: Server error
 */
router.get("/examples/:exampleId", activeLearningController.getExampleDetails);

export default router;