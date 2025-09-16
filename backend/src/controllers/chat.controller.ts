import { Request, Response } from "express";
import mongoose from "mongoose";
import Conversation, { IConversation } from "../models/Conversation.model";
import { chatWithEstateWise } from "../services/geminiChat.service";
import { runEnhancedEstateWiseAgent, getIntentTelemetryService } from "../services/enhancedGeminiAgent.service";
import { IntentType } from "../services/intentClassification.service";
import { AuthRequest } from "../middleware/auth.middleware";

/**
 * Enhanced chat endpoint that supports intent classification and disambiguation.
 * Handles both logged‑in and guest users with advanced intent understanding.
 *
 * @param req - The request object containing the chat message and optional conversation ID.
 * @param res - The response object to send the chat response.
 * @return A JSON response containing the chat response, expert views, and conversation ID.
 */
export const chat = async (req: AuthRequest, res: Response) => {
  try {
    const {
      message,
      convoId,
      history,
      expertWeights: clientWeights = {},
      useEnhancedAgent = true, // Allow fallback to legacy agent
    } = req.body;

    /* authenticated users */
    if (req.user) {
      const userId = new mongoose.Types.ObjectId(req.user.id);

      let conversation: IConversation | null = null;
      if (convoId) {
        conversation = await Conversation.findOne({
          _id: convoId,
          user: userId,
        });
      }
      if (!conversation) {
        conversation = new Conversation({
          user: userId,
          title: "Untitled Conversation",
          messages: [],
          expertWeights: {
            "Data Analyst": 1,
            "Lifestyle Concierge": 1,
            "Financial Advisor": 1,
            "Neighborhood Expert": 1,
            "Cluster Analyst": 1,
          },
        });
        await conversation.save();
      }

      /* build full history (stored msgs + new one) */
      const historyForGemini = [
        ...conversation.messages.map((m) => ({
          role: m.role,
          parts: [{ text: m.text }],
        })),
        { role: "user", parts: [{ text: message }] },
      ];

      let finalText: string;
      let expertViews: Record<string, string>;
      let needsDisambiguation = false;
      let clarificationMessage: string | undefined;
      let suggestedActions: Array<{ text: string; intent: IntentType; usePropertyData: boolean }> | undefined;
      let intentClassification: any;

      if (useEnhancedAgent) {
        try {
          // Use enhanced agent with intent classification
          const result = await runEnhancedEstateWiseAgent(
            message,
            "",
            conversation.expertWeights,
            conversation._id.toString()
          );

          finalText = result.finalText;
          expertViews = result.expertViews;
          needsDisambiguation = result.needsDisambiguation || false;
          clarificationMessage = result.clarificationMessage;
          suggestedActions = result.suggestedActions;
          intentClassification = result.intentClassification;
        } catch (error) {
          console.warn("Enhanced agent failed, falling back to legacy:", error);
          // Fallback to legacy agent
          const result = await chatWithEstateWise(
            historyForGemini,
            message,
            {},
            conversation.expertWeights,
          );
          finalText = result.finalText;
          expertViews = result.expertViews;
        }
      } else {
        // Use legacy agent directly
        const result = await chatWithEstateWise(
          historyForGemini,
          message,
          {},
          conversation.expertWeights,
        );
        finalText = result.finalText;
        expertViews = result.expertViews;
      }

      /* persist both msgs */
      conversation.messages.push({
        role: "user",
        text: message,
        timestamp: new Date(),
      });
      conversation.messages.push({
        role: "model",
        text: finalText,
        timestamp: new Date(),
      });
      conversation.markModified("messages");
      await conversation.save();

      const response: any = {
        response: finalText,
        expertViews,
        convoId: conversation._id,
        expertWeights: conversation.expertWeights,
      };

      // Add enhanced features if available
      if (needsDisambiguation) {
        response.needsDisambiguation = true;
        response.clarificationMessage = clarificationMessage;
        response.suggestedActions = suggestedActions;
      }
      if (intentClassification) {
        response.intentClassification = intentClassification;
      }

      return res.json(response);
    }

    // Guest users
    const defaultWeights = {
      "Data Analyst": 1,
      "Lifestyle Concierge": 1,
      "Financial Advisor": 1,
      "Neighborhood Expert": 1,
      "Cluster Analyst": 1,
    };
    const guestWeights: Record<string, number> = {
      ...defaultWeights,
      ...clientWeights,
    };

    const rawHistory = Array.isArray(history) ? history : [];
    const normalizedHistory: Array<{
      role: string;
      parts: { text: string }[];
    }> = rawHistory.map((msg: any) => {
      if (
        Array.isArray(msg.parts) &&
        msg.parts.every((p: any) => typeof p.text === "string")
      ) {
        return { role: msg.role, parts: msg.parts };
      }
      // fallback: wrap `msg.text` in the required shape
      return {
        role: msg.role,
        parts: [{ text: typeof msg.text === "string" ? msg.text : "" }],
      };
    });

    const historyForGemini = [
      ...normalizedHistory,
      { role: "user", parts: [{ text: message }] },
    ];

    let finalText: string;
    let expertViews: Record<string, string>;
    let needsDisambiguation = false;
    let clarificationMessage: string | undefined;
    let suggestedActions: Array<{ text: string; intent: IntentType; usePropertyData: boolean }> | undefined;
    let intentClassification: any;

    if (useEnhancedAgent) {
      try {
        // Generate guest conversation ID for disambiguation tracking
        const guestConvoId = convoId || `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const result = await runEnhancedEstateWiseAgent(
          message,
          "",
          guestWeights,
          guestConvoId
        );

        finalText = result.finalText;
        expertViews = result.expertViews;
        needsDisambiguation = result.needsDisambiguation || false;
        clarificationMessage = result.clarificationMessage;
        suggestedActions = result.suggestedActions;
        intentClassification = result.intentClassification;
      } catch (error) {
        console.warn("Enhanced agent failed for guest, falling back to legacy:", error);
        // Fallback to legacy agent
        const result = await chatWithEstateWise(
          historyForGemini,
          message,
          {},
          guestWeights,
        );
        finalText = result.finalText;
        expertViews = result.expertViews;
      }
    } else {
      // Use legacy agent directly
      const result = await chatWithEstateWise(
        historyForGemini,
        message,
        {},
        guestWeights,
      );
      finalText = result.finalText;
      expertViews = result.expertViews;
    }

    const response: any = {
      response: finalText,
      expertViews,
      expertWeights: guestWeights,
    };

    // Add enhanced features if available
    if (needsDisambiguation) {
      response.needsDisambiguation = true;
      response.clarificationMessage = clarificationMessage;
      response.suggestedActions = suggestedActions;
    }
    if (intentClassification) {
      response.intentClassification = intentClassification;
    }

    return res.json(response);
  } catch (err) {
    console.error("Error processing chat request:", err);
    return res.status(500).json({ error: "Error processing chat request" });
  }
};

/**
 * Enhanced thumb‑rating endpoint with intent classification feedback.
 * For authenticated users: Update the expertWeights in the DB for the given convoId.
 * For unauthenticated users: Update the expertWeights in the request body so the UI
 * can stash them in localStorage for the next turn.
 * Also records intent classification feedback for continuous improvement.
 *
 * @param req - The request object containing the conversation ID, rating, and optional expert.
 * @param res - The response object to send the rating response.
 * @return A JSON response indicating success and the updated expert weights.
 */
export const rateConversation = async (req: AuthRequest, res: Response) => {
  try {
    const {
      convoId,
      rating,
      expertWeights = {},
      intentFeedback, // New: { classificationId, actualIntent, userComment }
    } = req.body as {
      convoId?: string;
      rating: "up" | "down";
      expertWeights?: Record<string, number>;
      intentFeedback?: {
        classificationId: string;
        actualIntent: IntentType;
        userComment?: string;
      };
    };

    // Record intent classification feedback if provided
    if (intentFeedback) {
      const telemetryService = getIntentTelemetryService();
      if (telemetryService) {
        telemetryService.recordFeedback(
          intentFeedback.classificationId,
          intentFeedback.actualIntent,
          rating === "up" ? "positive" : "negative",
          intentFeedback.userComment
        );
      }
    }

    // Unauthenticated users
    if (!req.user) {
      const wts = { ...expertWeights };
      if (Object.keys(wts).length === 0) {
        return res.json({ success: true });
      }
      // only adjust weights if rating is "down"
      // "up": keep everything as is
      if (rating === "down") {
        adjustWeightsInPlace(wts, rating);
      }
      return res.json({ success: true, expertWeights: wts });
    }

    // Authenticated users
    if (!convoId) {
      return res.status(400).json({ error: "convoId is required" });
    }
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const convo = await Conversation.findOne({ _id: convoId, user: userId });
    if (!convo) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    // on thumbs-down, randomly adjust two non-cluster experts
    if (rating === "down") {
      adjustWeightsInPlace(convo.expertWeights, rating);
      await convo.save();
    }

    return res.json({ success: true, expertWeights: convo.expertWeights });
  } catch (err) {
    console.error("Error rating conversation:", err);
    return res.status(500).json({ error: "Error rating conversation" });
  }
};

/**
 * Helper function to adjust weights in place.
 * This function modifies the weights of the experts based on the rating provided,
 * but never changes the weight of "Cluster Analyst".
 *
 * @param wts - The weights of the experts.
 * @param rating - The rating given by the user, either "up" or "down".
 * @param expert - The specific expert to adjust the weight for (optional).
 */
function adjustWeightsInPlace(
  wts: Record<string, number>,
  rating: "up" | "down",
  expert?: string,
) {
  const CLUSTER = "Cluster Analyst";
  const NON_CLUSTER = Object.keys(wts).filter((k) => k !== CLUSTER);
  const delta = rating === "up" ? 0.2 : -0.2;

  // 1) Always reset cluster to 1
  wts[CLUSTER] = 1;

  if (expert && expert !== CLUSTER && wts[expert] != null) {
    // 2a) Specific expert bump
    wts[expert] = Math.min(Math.max(wts[expert] + delta, 0.1), 2.0);
  } else if (!expert) {
    // 2b) Global thumb: pick two distinct non‐cluster experts
    const iUp = Math.floor(Math.random() * NON_CLUSTER.length);
    let iDown = Math.floor(Math.random() * NON_CLUSTER.length);
    while (iDown === iUp) {
      iDown = Math.floor(Math.random() * NON_CLUSTER.length);
    }
    // 2c) Adjust & normalize
    const keyUp = NON_CLUSTER[iUp];
    const keyDown = NON_CLUSTER[iDown];
    wts[keyUp] = Math.min(Math.max(wts[keyUp] + 0.2, 0.1), 2.0);
    wts[keyDown] = Math.min(Math.max(wts[keyDown] - 0.2, 0.1), 2.0);
  }

  // 3) Re-enforce cluster analyst at 1 to avoid drift
  wts[CLUSTER] = 1;
}
