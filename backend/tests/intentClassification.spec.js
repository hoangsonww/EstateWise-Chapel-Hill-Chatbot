const { IntentClassificationService, IntentType } = require("../src/services/intentClassification.service");
const { DisambiguationService } = require("../src/services/disambiguation.service");
const { IntentTelemetryService } = require("../src/services/intentTelemetry.service");

// Mock environment variable
process.env.GOOGLE_AI_API_KEY = "test-api-key";

// Mock Google Generative AI with proper TypeScript imports
const mockGenerateContent = jest.fn();
const mockSendMessage = jest.fn();
const mockStartChat = jest.fn(() => ({
  sendMessage: mockSendMessage
}));
const mockGetGenerativeModel = jest.fn(() => ({
  startChat: mockStartChat
}));

jest.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: jest.fn(() => ({
    getGenerativeModel: mockGetGenerativeModel
  })),
  HarmCategory: {
    HARM_CATEGORY_HARASSMENT: "HARM_CATEGORY_HARASSMENT",
    HARM_CATEGORY_HATE_SPEECH: "HARM_CATEGORY_HATE_SPEECH",
    HARM_CATEGORY_SEXUALLY_EXPLICIT: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
    HARM_CATEGORY_DANGEROUS_CONTENT: "HARM_CATEGORY_DANGEROUS_CONTENT"
  },
  HarmBlockThreshold: {
    BLOCK_NONE: "BLOCK_NONE"
  }
}));

describe("Intent Classification System", () => {
  let intentService;
  let disambiguationService;
  let telemetryService;

  beforeEach(() => {
    intentService = new IntentClassificationService("test-api-key");
    disambiguationService = new DisambiguationService();
    telemetryService = new IntentTelemetryService();
    jest.clearAllMocks();
  });

  describe("IntentClassificationService", () => {
    describe("classifyIntent", () => {
      it("should classify property inquiry intents correctly", async () => {
        const mockResponse = JSON.stringify({
          primaryIntent: "PROPERTY_INQUIRY",
          confidence: 0.9,
          alternativeIntents: [],
          usePropertyData: true,
          reasoning: "User asking about rent"
        });

        mockSendMessage.mockResolvedValue({
          response: { text: () => mockResponse }
        });

        const result = await intentService.classifyIntent("What is the rent?");

        expect(result.primaryIntent).toBe(IntentType.PROPERTY_INQUIRY);
        expect(result.confidence).toBe(0.9);
        expect(result.usePropertyData).toBe(true);
        expect(result.needsDisambiguation).toBe(false);
      });

      it("should classify process inquiry intents correctly", async () => {
        const mockResponse = JSON.stringify({
          primaryIntent: "PROCESS_INQUIRY",
          confidence: 0.85,
          alternativeIntents: [],
          usePropertyData: false,
          reasoning: "User asking about payment process"
        });

        mockSendMessage.mockResolvedValue({
          response: { text: () => mockResponse }
        });

        const result = await intentService.classifyIntent("How do I pay rent?");

        expect(result.primaryIntent).toBe(IntentType.PROCESS_INQUIRY);
        expect(result.confidence).toBe(0.85);
        expect(result.usePropertyData).toBe(false);
        expect(result.needsDisambiguation).toBe(false);
      });

      it("should detect ambiguous intents and trigger disambiguation", async () => {
        const mockResponse = JSON.stringify({
          primaryIntent: "PROPERTY_INQUIRY",
          confidence: 0.6,
          alternativeIntents: [
            { intent: "SCHEDULING_REQUEST", confidence: 0.4 }
          ],
          usePropertyData: true,
          reasoning: "Ambiguous between showing properties and scheduling"
        });

        mockSendMessage.mockResolvedValue({
          response: { text: () => mockResponse }
        });

        const result = await intentService.classifyIntent("Tell me about the apartments");

        expect(result.primaryIntent).toBe(IntentType.PROPERTY_INQUIRY);
        expect(result.confidence).toBe(0.6);
        expect(result.needsDisambiguation).toBe(true);
        expect(result.suggestedClarifications).toBeDefined();
        expect(result.suggestedClarifications.length).toBeGreaterThan(0);
      });

      it("should use fallback classification when API fails", async () => {
        mockSendMessage.mockRejectedValue(new Error("API Error"));

        const result = await intentService.classifyIntent("schedule a tour");

        expect(result.primaryIntent).toBe(IntentType.SCHEDULING_REQUEST);
        expect(result.confidence).toBe(0.8);
        expect(result.usePropertyData).toBe(true);
      });

      it("should handle edge cases from the issue examples", async () => {
        // Test the specific examples from the issue
        const testCases = [
          {
            message: "What is the rent?",
            expectedIntent: IntentType.PROPERTY_INQUIRY,
            expectedUsePropertyData: true,
            mockResponse: {
              primaryIntent: "PROPERTY_INQUIRY",
              confidence: 0.8,
              alternativeIntents: [],
              usePropertyData: true,
              reasoning: "Property inquiry"
            }
          },
          {
            message: "How do I pay rent?",
            expectedIntent: IntentType.PROCESS_INQUIRY,
            expectedUsePropertyData: false,
            mockResponse: {
              primaryIntent: "PROCESS_INQUIRY",
              confidence: 0.8,
              alternativeIntents: [],
              usePropertyData: false,
              reasoning: "Process inquiry"
            }
          },
          {
            message: "Tell me about the apartments",
            expectedIntent: IntentType.PROPERTY_INQUIRY,
            expectedUsePropertyData: true,
            mockResponse: {
              primaryIntent: "PROPERTY_INQUIRY",
              confidence: 0.8,
              alternativeIntents: [],
              usePropertyData: true,
              reasoning: "Property inquiry"
            }
          },
          {
            message: "Schedule a tour of the apartments",
            expectedIntent: IntentType.SCHEDULING_REQUEST,
            expectedUsePropertyData: true,
            mockResponse: {
              primaryIntent: "SCHEDULING_REQUEST",
              confidence: 0.8,
              alternativeIntents: [],
              usePropertyData: true,
              reasoning: "Scheduling request"
            }
          }
        ];

        for (const testCase of testCases) {
          const mockResponseJson = JSON.stringify(testCase.mockResponse);

          mockSendMessage.mockResolvedValue({
            response: { text: () => mockResponseJson }
          });

          const result = await intentService.classifyIntent(testCase.message);

          expect(result.primaryIntent).toBe(testCase.expectedIntent);
          expect(result.usePropertyData).toBe(testCase.expectedUsePropertyData);
        }
      });
    });

    describe("confidence threshold management", () => {
      it("should use configurable confidence threshold", () => {
        expect(intentService.getConfidenceThreshold()).toBe(0.7);
        
        intentService.setConfidenceThreshold(0.8);
        expect(intentService.getConfidenceThreshold()).toBe(0.8);
      });

      it("should clamp confidence threshold to valid range", () => {
        intentService.setConfidenceThreshold(-0.1);
        expect(intentService.getConfidenceThreshold()).toBe(0);

        intentService.setConfidenceThreshold(1.5);
        expect(intentService.getConfidenceThreshold()).toBe(1);
      });
    });
  });

  describe("DisambiguationService", () => {
    describe("handleDisambiguation", () => {
      it("should not trigger disambiguation for high confidence intents", () => {
        const classificationResult = {
          primaryIntent: IntentType.PROPERTY_INQUIRY,
          confidence: 0.9,
          alternativeIntents: [],
          needsDisambiguation: false,
          usePropertyData: true
        };

        const result = disambiguationService.handleDisambiguation(
          "Show me apartments",
          classificationResult,
          "conv-123"
        );

        expect(result.needsClarification).toBe(false);
        expect(result.fallbackIntent).toBe(IntentType.PROPERTY_INQUIRY);
      });

      it("should trigger disambiguation for low confidence intents", () => {
        const classificationResult = {
          primaryIntent: IntentType.PROPERTY_INQUIRY,
          confidence: 0.5,
          alternativeIntents: [
            { intent: IntentType.SCHEDULING_REQUEST, confidence: 0.3 }
          ],
          needsDisambiguation: true,
          usePropertyData: true,
          suggestedClarifications: ["Would you like to see properties or schedule a tour?"]
        };

        const result = disambiguationService.handleDisambiguation(
          "Tell me about the apartments",
          classificationResult,
          "conv-123"
        );

        expect(result.needsClarification).toBe(true);
        expect(result.clarificationMessage).toBeDefined();
        expect(result.suggestedActions).toBeDefined();
        expect(result.suggestedActions.length).toBeGreaterThan(0);
      });

      it("should fall back after max clarification attempts", () => {
        const classificationResult = {
          primaryIntent: IntentType.PROPERTY_INQUIRY,
          confidence: 0.5,
          alternativeIntents: [],
          needsDisambiguation: true,
          usePropertyData: true
        };

        // Set max attempts to 1 for testing
        disambiguationService.setMaxClarificationAttempts(1);

        // First attempt should trigger clarification
        let result = disambiguationService.handleDisambiguation(
          "ambiguous message",
          classificationResult,
          "conv-123"
        );
        expect(result.needsClarification).toBe(true);

        // Second attempt should fall back
        result = disambiguationService.handleDisambiguation(
          "still ambiguous",
          classificationResult,
          "conv-123"
        );
        expect(result.needsClarification).toBe(false);
        expect(result.fallbackIntent).toBe(IntentType.PROPERTY_INQUIRY);
      });
    });

    describe("resolveDisambiguation", () => {
      beforeEach(() => {
        // Set up a pending disambiguation
        const classificationResult = {
          primaryIntent: IntentType.PROPERTY_INQUIRY,
          confidence: 0.5,
          alternativeIntents: [
            { intent: IntentType.SCHEDULING_REQUEST, confidence: 0.3 }
          ],
          needsDisambiguation: true,
          usePropertyData: true
        };

        disambiguationService.handleDisambiguation(
          "Tell me about apartments",
          classificationResult,
          "conv-123"
        );
      });

      it("should resolve to property inquiry for property-related responses", () => {
        const result = disambiguationService.resolveDisambiguation(
          "I want to see properties",
          "conv-123"
        );

        expect(result).toBeDefined();
        expect(result.resolvedIntent).toBe(IntentType.PROPERTY_INQUIRY);
        expect(result.usePropertyData).toBe(true);
      });

      it("should resolve to scheduling request for tour-related responses", () => {
        const result = disambiguationService.resolveDisambiguation(
          "I want to schedule a tour",
          "conv-123"
        );

        expect(result).toBeDefined();
        expect(result.resolvedIntent).toBe(IntentType.SCHEDULING_REQUEST);
        expect(result.usePropertyData).toBe(true);
      });

      it("should return null for truly unclear responses", () => {
        const result = disambiguationService.resolveDisambiguation(
          "hmm I don't know what I want",
          "conv-123"
        );

        expect(result).toBeNull();
      });
    });

    describe("context management", () => {
      it("should track pending disambiguations", () => {
        expect(disambiguationService.hasPendingDisambiguation("conv-123")).toBe(false);

        const classificationResult = {
          primaryIntent: IntentType.PROPERTY_INQUIRY,
          confidence: 0.5,
          alternativeIntents: [],
          needsDisambiguation: true,
          usePropertyData: true
        };

        disambiguationService.handleDisambiguation(
          "ambiguous",
          classificationResult,
          "conv-123"
        );

        expect(disambiguationService.hasPendingDisambiguation("conv-123")).toBe(true);
      });

      it("should clear disambiguations", () => {
        const classificationResult = {
          primaryIntent: IntentType.PROPERTY_INQUIRY,
          confidence: 0.5,
          alternativeIntents: [],
          needsDisambiguation: true,
          usePropertyData: true
        };

        disambiguationService.handleDisambiguation(
          "ambiguous",
          classificationResult,
          "conv-123"
        );

        disambiguationService.clearDisambiguation("conv-123");
        expect(disambiguationService.hasPendingDisambiguation("conv-123")).toBe(false);
      });
    });
  });

  describe("IntentTelemetryService", () => {
    describe("classification logging", () => {
      it("should log classification events", () => {
        const classificationResult = {
          primaryIntent: IntentType.PROPERTY_INQUIRY,
          confidence: 0.9,
          alternativeIntents: [],
          needsDisambiguation: false,
          usePropertyData: true
        };

        const eventId = telemetryService.logClassification(
          "What is the rent?",
          classificationResult,
          150,
          "conv-123"
        );

        expect(eventId).toBeDefined();
        expect(typeof eventId).toBe("string");
        expect(eventId.startsWith("intent_")).toBe(true);
      });

      it("should record user feedback", () => {
        const classificationResult = {
          primaryIntent: IntentType.PROPERTY_INQUIRY,
          confidence: 0.9,
          alternativeIntents: [],
          needsDisambiguation: false,
          usePropertyData: true
        };

        const eventId = telemetryService.logClassification(
          "What is the rent?",
          classificationResult,
          150
        );

        telemetryService.recordFeedback(
          eventId,
          IntentType.PROPERTY_INQUIRY,
          "positive",
          "Correct classification"
        );

        const metrics = telemetryService.getMetrics();
        expect(metrics.totalClassifications).toBe(1);
      });
    });

    describe("metrics calculation", () => {
      beforeEach(() => {
        // Add some test data
        const classificationResults = [
          {
            primaryIntent: IntentType.PROPERTY_INQUIRY,
            confidence: 0.9,
            alternativeIntents: [],
            needsDisambiguation: false,
            usePropertyData: true
          },
          {
            primaryIntent: IntentType.PROCESS_INQUIRY,
            confidence: 0.6,
            alternativeIntents: [{ intent: IntentType.PROPERTY_INQUIRY, confidence: 0.4 }],
            needsDisambiguation: true,
            usePropertyData: false
          }
        ];

        const messages = ["What is the rent?", "How do I pay rent?"];
        
        classificationResults.forEach((result, index) => {
          const eventId = telemetryService.logClassification(
            messages[index],
            result,
            100 + index * 50
          );
          
          // Add feedback for accuracy calculation
          telemetryService.recordFeedback(
            eventId,
            result.primaryIntent,
            "positive"
          );
        });
      });

      it("should calculate accuracy metrics", () => {
        const metrics = telemetryService.getMetrics();
        
        expect(metrics.totalClassifications).toBe(2);
        expect(metrics.accuracyRate).toBe(1.0); // 100% accuracy in test data
        expect(metrics.disambiguationRate).toBe(0.5); // 1 out of 2 needed disambiguation
      });

      it("should calculate confidence distribution", () => {
        const metrics = telemetryService.getMetrics();
        
        expect(metrics.confidenceDistribution.very_high).toBe(1); // 0.9 confidence
        expect(metrics.confidenceDistribution.medium).toBe(1); // 0.6 confidence
        expect(metrics.confidenceDistribution.high).toBe(0);
        expect(metrics.confidenceDistribution.low).toBe(0);
        expect(metrics.confidenceDistribution.very_low).toBe(0);
      });

      it("should calculate intent distribution", () => {
        const metrics = telemetryService.getMetrics();
        
        expect(metrics.intentDistribution[IntentType.PROPERTY_INQUIRY]).toBe(1);
        expect(metrics.intentDistribution[IntentType.PROCESS_INQUIRY]).toBe(1);
        expect(metrics.intentDistribution[IntentType.SCHEDULING_REQUEST]).toBe(0);
      });
    });

    describe("error spike detection", () => {
      it("should detect error spikes", () => {
        // Add events with errors
        for (let i = 0; i < 20; i++) {
          const classificationResult = {
            primaryIntent: IntentType.UNCLEAR,
            confidence: 0.2, // Low confidence
            alternativeIntents: [],
            needsDisambiguation: true,
            usePropertyData: false
          };

          telemetryService.logClassification(
            "unclear message",
            classificationResult,
            200
          );
        }

        const hasSpike = telemetryService.detectErrorSpikes(60, 0.3);
        expect(hasSpike).toBe(true);
      });

      it("should not detect spikes for normal operation", () => {
        // Add normal events
        for (let i = 0; i < 20; i++) {
          const classificationResult = {
            primaryIntent: IntentType.PROPERTY_INQUIRY,
            confidence: 0.9,
            alternativeIntents: [],
            needsDisambiguation: false,
            usePropertyData: true
          };

          telemetryService.logClassification(
            "What is the rent?",
            classificationResult,
            150
          );
        }

        const hasSpike = telemetryService.detectErrorSpikes(60, 0.3);
        expect(hasSpike).toBe(false);
      });
    });

    describe("training data generation", () => {
      it("should generate training data from positive feedback", () => {
        const classificationResult = {
          primaryIntent: IntentType.PROPERTY_INQUIRY,
          confidence: 0.9,
          alternativeIntents: [],
          needsDisambiguation: false,
          usePropertyData: true
        };

        const eventId = telemetryService.logClassification(
          "What is the rent?",
          classificationResult,
          150
        );

        telemetryService.recordFeedback(
          eventId,
          IntentType.PROPERTY_INQUIRY,
          "positive"
        );

        const trainingData = telemetryService.getTrainingData();
        expect(trainingData.length).toBe(1);
        expect(trainingData[0].text).toBe("What is the rent?");
        expect(trainingData[0].intent).toBe(IntentType.PROPERTY_INQUIRY);
        expect(trainingData[0].confidence).toBe(1.0);
      });
    });
  });
});