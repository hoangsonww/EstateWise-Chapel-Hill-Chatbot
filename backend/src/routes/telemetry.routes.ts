import { Router } from "express";
import {
  getIntentMetrics,
  getConfusionMatrix,
  getEventsForReview,
  getTrainingData,
  checkErrorSpikes,
  exportTelemetryData,
  clearTelemetryData,
  getDisambiguationStatus,
  getIntentSystemHealth,
} from "../controllers/telemetry.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Telemetry
 *   description: Intent classification monitoring and analytics
 */

/**
 * @swagger
 * /api/telemetry/health:
 *   get:
 *     summary: Check intent classification system health
 *     tags: [Telemetry]
 *     responses:
 *       200:
 *         description: System health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 telemetryService:
 *                   type: boolean
 *                 disambiguationService:
 *                   type: boolean
 *                 recentErrorSpike:
 *                   type: boolean
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get("/health", getIntentSystemHealth);

/**
 * @swagger
 * /api/telemetry/metrics:
 *   get:
 *     summary: Get intent classification metrics
 *     tags: [Telemetry]
 *     responses:
 *       200:
 *         description: Intent classification performance metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 metrics:
 *                   type: object
 *                   properties:
 *                     totalClassifications:
 *                       type: number
 *                     accuracyRate:
 *                       type: number
 *                     disambiguationRate:
 *                       type: number
 *                     disambiguationSuccessRate:
 *                       type: number
 *                     averageResponseTime:
 *                       type: number
 */
router.get("/metrics", getIntentMetrics);

/**
 * @swagger
 * /api/telemetry/confusion-matrix:
 *   get:
 *     summary: Get intent classification confusion matrix
 *     tags: [Telemetry]
 *     responses:
 *       200:
 *         description: Confusion matrix showing intent misclassifications
 */
router.get("/confusion-matrix", getConfusionMatrix);

/**
 * @swagger
 * /api/telemetry/review:
 *   get:
 *     summary: Get events that need human review
 *     tags: [Telemetry]
 *     responses:
 *       200:
 *         description: List of low confidence classifications and negative feedback
 */
router.get("/review", getEventsForReview);

/**
 * @swagger
 * /api/telemetry/training-data:
 *   get:
 *     summary: Get validated training data from user feedback
 *     tags: [Telemetry]
 *     responses:
 *       200:
 *         description: Training examples validated by positive user feedback
 */
router.get("/training-data", getTrainingData);

/**
 * @swagger
 * /api/telemetry/error-spikes:
 *   get:
 *     summary: Check for error spikes in intent classification
 *     tags: [Telemetry]
 *     parameters:
 *       - in: query
 *         name: timeWindowMinutes
 *         schema:
 *           type: number
 *           default: 60
 *         description: Time window in minutes to check for spikes
 *       - in: query
 *         name: errorThreshold
 *         schema:
 *           type: number
 *           default: 0.3
 *         description: Error rate threshold to trigger spike alert
 *     responses:
 *       200:
 *         description: Error spike detection results
 */
router.get("/error-spikes", checkErrorSpikes);

/**
 * @swagger
 * /api/telemetry/export:
 *   get:
 *     summary: Export all telemetry data
 *     tags: [Telemetry]
 *     responses:
 *       200:
 *         description: Complete telemetry dataset for external analysis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 events:
 *                   type: array
 *                 feedback:
 *                   type: array
 *                 metrics:
 *                   type: object
 */
router.get("/export", exportTelemetryData);

/**
 * @swagger
 * /api/telemetry/clear:
 *   delete:
 *     summary: Clear all telemetry data
 *     tags: [Telemetry]
 *     responses:
 *       200:
 *         description: Telemetry data cleared successfully
 */
router.delete("/clear", clearTelemetryData);

/**
 * @swagger
 * /api/telemetry/disambiguation:
 *   get:
 *     summary: Get disambiguation service status
 *     tags: [Telemetry]
 *     responses:
 *       200:
 *         description: Current disambiguation service status
 */
router.get("/disambiguation", getDisambiguationStatus);

export default router;