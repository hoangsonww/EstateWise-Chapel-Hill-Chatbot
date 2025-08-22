import { Request, Response } from "express";
import { ActiveLearningService } from "../services/activeLearning.service";
import { ConfidenceTrackingService } from "../services/confidenceTracking.service";
import { AuthRequest } from "../middleware/auth.middleware";

// Create service instances
const activeLearningService = new ActiveLearningService();
const confidenceTracker = new ConfidenceTrackingService();

/**
 * Get the review queue for human reviewers
 * 
 * @param req - Request with query parameters for filtering
 * @param res - Response with review queue
 */
export const getReviewQueue = async (req: Request, res: Response) => {
  try {
    const { 
      status = "in_review", 
      limit = "20" 
    } = req.query as { 
      status?: "pending" | "in_review" | "reviewed"; 
      limit?: string;
    };

    const parsedLimit = parseInt(limit);
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      return res.status(400).json({ error: "Invalid limit. Must be between 1 and 100." });
    }

    const examples = await activeLearningService.getReviewQueue(status, parsedLimit);

    res.json({
      examples,
      count: examples.length,
      status,
    });
  } catch (error) {
    console.error("Error fetching review queue:", error);
    res.status(500).json({ error: "Failed to fetch review queue" });
  }
};

/**
 * Sample new examples for human review
 * 
 * @param req - Request with sampling parameters
 * @param res - Response with sampled examples
 */
export const sampleExamples = async (req: AuthRequest, res: Response) => {
  try {
    // Only authenticated users can trigger sampling
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { limit = "20" } = req.query as { limit?: string };
    const parsedLimit = parseInt(limit);
    
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
      return res.status(400).json({ error: "Invalid limit. Must be between 1 and 50." });
    }

    const sampledExamples = await activeLearningService.sampleExamplesForReview(parsedLimit);

    res.json({
      sampledExamples,
      count: sampledExamples.length,
      message: `Successfully sampled ${sampledExamples.length} examples for review`,
    });
  } catch (error) {
    console.error("Error sampling examples:", error);
    res.status(500).json({ error: "Failed to sample examples" });
  }
};

/**
 * Submit a human review for an example
 * 
 * @param req - Request with review data
 * @param res - Response confirming review submission
 */
export const submitReview = async (req: AuthRequest, res: Response) => {
  try {
    // Only authenticated users can submit reviews
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const {
      exampleId,
      correctedIntent,
      correctedResponse,
      confidence,
      reviewNotes,
    } = req.body as {
      exampleId: string;
      correctedIntent: string;
      correctedResponse?: string;
      confidence: number;
      reviewNotes?: string;
    };

    // Validate required fields
    if (!exampleId || !correctedIntent || typeof confidence !== "number") {
      return res.status(400).json({ 
        error: "Missing required fields: exampleId, correctedIntent, confidence" 
      });
    }

    // Validate confidence range
    if (confidence < 1 || confidence > 5) {
      return res.status(400).json({ 
        error: "Confidence must be between 1 and 5" 
      });
    }

    const reviewedExample = await activeLearningService.submitReview({
      exampleId,
      reviewerId: req.user.id,
      correctedIntent,
      correctedResponse,
      confidence,
      reviewNotes,
    });

    res.json({
      success: true,
      reviewedExample,
      message: "Review submitted successfully",
    });
  } catch (error) {
    console.error("Error submitting review:", error);
    if (error instanceof Error && error.message === "Example not found") {
      res.status(404).json({ error: "Example not found" });
    } else {
      res.status(500).json({ error: "Failed to submit review" });
    }
  }
};

/**
 * Get active learning statistics and metrics
 * 
 * @param req - Request with optional time range
 * @param res - Response with statistics
 */
export const getActiveLearningStats = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query as { 
      startDate?: string; 
      endDate?: string; 
    };

    let timeRange: { start: Date; end: Date } | undefined;
    if (startDate && endDate) {
      timeRange = {
        start: new Date(startDate),
        end: new Date(endDate),
      };

      // Validate dates
      if (isNaN(timeRange.start.getTime()) || isNaN(timeRange.end.getTime())) {
        return res.status(400).json({ error: "Invalid date format" });
      }
    }

    const [activeLearningStats, confidenceStats] = await Promise.all([
      activeLearningService.getActiveLearningStats(timeRange),
      confidenceTracker.getConfidenceStats(timeRange),
    ]);

    res.json({
      activeLearning: activeLearningStats,
      confidence: confidenceStats,
      timeRange: timeRange ? {
        start: timeRange.start.toISOString(),
        end: timeRange.end.toISOString(),
      } : null,
    });
  } catch (error) {
    console.error("Error fetching active learning stats:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
};

/**
 * Get validated examples ready for training data integration
 * 
 * @param req - Request with limit parameter
 * @param res - Response with validated examples
 */
export const getValidatedExamples = async (req: AuthRequest, res: Response) => {
  try {
    // Only authenticated users can access validated examples
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { limit = "100" } = req.query as { limit?: string };
    const parsedLimit = parseInt(limit);
    
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 500) {
      return res.status(400).json({ error: "Invalid limit. Must be between 1 and 500." });
    }

    const validatedExamples = await activeLearningService.getValidatedExamples(parsedLimit);

    res.json({
      validatedExamples,
      count: validatedExamples.length,
      message: `Retrieved ${validatedExamples.length} validated examples`,
    });
  } catch (error) {
    console.error("Error fetching validated examples:", error);
    res.status(500).json({ error: "Failed to fetch validated examples" });
  }
};

/**
 * Mark examples as integrated into training data
 * 
 * @param req - Request with example IDs to mark as integrated
 * @param res - Response confirming integration
 */
export const markExamplesIntegrated = async (req: AuthRequest, res: Response) => {
  try {
    // Only authenticated users can mark examples as integrated
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { exampleIds } = req.body as { exampleIds: string[] };

    if (!Array.isArray(exampleIds) || exampleIds.length === 0) {
      return res.status(400).json({ error: "exampleIds must be a non-empty array" });
    }

    // Validate all IDs are strings
    if (!exampleIds.every(id => typeof id === "string")) {
      return res.status(400).json({ error: "All example IDs must be strings" });
    }

    await activeLearningService.markExamplesAsIntegrated(exampleIds);

    res.json({
      success: true,
      integratedCount: exampleIds.length,
      message: `Successfully marked ${exampleIds.length} examples as integrated`,
    });
  } catch (error) {
    console.error("Error marking examples as integrated:", error);
    res.status(500).json({ error: "Failed to mark examples as integrated" });
  }
};

/**
 * Get specific example details for review
 * 
 * @param req - Request with example ID parameter
 * @param res - Response with example details
 */
export const getExampleDetails = async (req: Request, res: Response) => {
  try {
    const { exampleId } = req.params;

    if (!exampleId) {
      return res.status(400).json({ error: "Example ID is required" });
    }

    const { ActiveLearningExample } = await import("../models/ActiveLearning.model");
    const example = await ActiveLearningExample.findById(exampleId)
      .populate("inferenceLogId");

    if (!example) {
      return res.status(404).json({ error: "Example not found" });
    }

    res.json({
      example,
    });
  } catch (error) {
    console.error("Error fetching example details:", error);
    res.status(500).json({ error: "Failed to fetch example details" });
  }
};