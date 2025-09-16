import { Request, Response } from "express";
import { getIntentTelemetryService, getDisambiguationService } from "../services/enhancedGeminiAgent.service";
import { AuthRequest } from "../middleware/auth.middleware";

/**
 * Get intent classification metrics and performance data.
 * Admin-only endpoint for monitoring system performance.
 */
export const getIntentMetrics = async (req: AuthRequest, res: Response) => {
  try {
    const telemetryService = getIntentTelemetryService();
    if (!telemetryService) {
      return res.status(503).json({ error: "Telemetry service not available" });
    }

    const metrics = telemetryService.getMetrics();
    
    res.json({
      metrics,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error("Error getting intent metrics:", err);
    return res.status(500).json({ error: "Error getting intent metrics" });
  }
};

/**
 * Get confusion matrix for intent classification.
 * Useful for understanding which intents are commonly confused.
 */
export const getConfusionMatrix = async (req: AuthRequest, res: Response) => {
  try {
    const telemetryService = getIntentTelemetryService();
    if (!telemetryService) {
      return res.status(503).json({ error: "Telemetry service not available" });
    }

    const confusionMatrix = telemetryService.getConfusionMatrix();
    
    res.json({
      confusionMatrix,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error("Error getting confusion matrix:", err);
    return res.status(500).json({ error: "Error getting confusion matrix" });
  }
};

/**
 * Get events that need human review.
 * Returns low confidence classifications, negative feedback, etc.
 */
export const getEventsForReview = async (req: AuthRequest, res: Response) => {
  try {
    const telemetryService = getIntentTelemetryService();
    if (!telemetryService) {
      return res.status(503).json({ error: "Telemetry service not available" });
    }

    const events = telemetryService.getEventsForReview();
    
    res.json({
      events,
      count: events.length,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error("Error getting events for review:", err);
    return res.status(500).json({ error: "Error getting events for review" });
  }
};

/**
 * Get training data generated from validated feedback.
 * Can be used to retrain or improve the intent classification model.
 */
export const getTrainingData = async (req: AuthRequest, res: Response) => {
  try {
    const telemetryService = getIntentTelemetryService();
    if (!telemetryService) {
      return res.status(503).json({ error: "Telemetry service not available" });
    }

    const trainingData = telemetryService.getTrainingData();
    
    res.json({
      trainingData,
      count: trainingData.length,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error("Error getting training data:", err);
    return res.status(500).json({ error: "Error getting training data" });
  }
};

/**
 * Check for error spikes in intent classification.
 * Returns alert status and spike details.
 */
export const checkErrorSpikes = async (req: AuthRequest, res: Response) => {
  try {
    const telemetryService = getIntentTelemetryService();
    if (!telemetryService) {
      return res.status(503).json({ error: "Telemetry service not available" });
    }

    const {
      timeWindowMinutes = 60,
      errorThreshold = 0.3
    } = req.query as {
      timeWindowMinutes?: number;
      errorThreshold?: number;
    };

    const hasSpike = telemetryService.detectErrorSpikes(
      Number(timeWindowMinutes),
      Number(errorThreshold)
    );
    
    res.json({
      hasSpike,
      timeWindowMinutes: Number(timeWindowMinutes),
      errorThreshold: Number(errorThreshold),
      timestamp: new Date(),
    });
  } catch (err) {
    console.error("Error checking error spikes:", err);
    return res.status(500).json({ error: "Error checking error spikes" });
  }
};

/**
 * Export all telemetry data for external analysis.
 * Includes events, feedback, and metrics.
 */
export const exportTelemetryData = async (req: AuthRequest, res: Response) => {
  try {
    const telemetryService = getIntentTelemetryService();
    if (!telemetryService) {
      return res.status(503).json({ error: "Telemetry service not available" });
    }

    const exportData = telemetryService.exportData();
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=intent-telemetry-${Date.now()}.json`);
    
    res.json(exportData);
  } catch (err) {
    console.error("Error exporting telemetry data:", err);
    return res.status(500).json({ error: "Error exporting telemetry data" });
  }
};

/**
 * Clear all telemetry data.
 * Admin-only endpoint for data cleanup.
 */
export const clearTelemetryData = async (req: AuthRequest, res: Response) => {
  try {
    const telemetryService = getIntentTelemetryService();
    if (!telemetryService) {
      return res.status(503).json({ error: "Telemetry service not available" });
    }

    telemetryService.clearData();
    
    res.json({
      success: true,
      message: "Telemetry data cleared",
      timestamp: new Date(),
    });
  } catch (err) {
    console.error("Error clearing telemetry data:", err);
    return res.status(500).json({ error: "Error clearing telemetry data" });
  }
};

/**
 * Get current disambiguation contexts.
 * Shows pending clarification conversations.
 */
export const getDisambiguationStatus = async (req: AuthRequest, res: Response) => {
  try {
    const disambiguationService = getDisambiguationService();
    if (!disambiguationService) {
      return res.status(503).json({ error: "Disambiguation service not available" });
    }

    // Clean up old contexts first
    disambiguationService.cleanupOldContexts(30);

    // Note: We can't expose internal disambiguation contexts directly for privacy,
    // but we can provide aggregate statistics
    res.json({
      message: "Disambiguation service is running",
      // Add aggregate stats here if needed in the future
      timestamp: new Date(),
    });
  } catch (err) {
    console.error("Error getting disambiguation status:", err);
    return res.status(500).json({ error: "Error getting disambiguation status" });
  }
};

/**
 * Health check endpoint for intent classification system.
 */
export const getIntentSystemHealth = async (req: Request, res: Response) => {
  try {
    const telemetryService = getIntentTelemetryService();
    const disambiguationService = getDisambiguationService();

    const health: {
      telemetryService: boolean;
      disambiguationService: boolean;
      timestamp: Date;
      recentErrorSpike?: boolean;
    } = {
      telemetryService: !!telemetryService,
      disambiguationService: !!disambiguationService,
      timestamp: new Date(),
    };

    if (telemetryService) {
      const recentSpike = telemetryService.detectErrorSpikes(15, 0.5);
      health.recentErrorSpike = recentSpike;
    }

    res.json(health);
  } catch (err) {
    console.error("Error checking intent system health:", err);
    return res.status(500).json({ error: "Error checking intent system health" });
  }
};