# Active Learning Pipeline Documentation

## Overview

The Active Learning Pipeline for EstateWise is designed to systematically improve intent classification by identifying ambiguous and low-confidence user interactions from production, routing them for human review/labeling, and integrating validated examples back into the training set.

## Architecture

### Core Components

1. **Confidence Tracking Service** (`confidenceTracking.service.ts`)
   - Analyzes expert predictions for ambiguity
   - Logs production inferences with confidence scores
   - Implements multiple ambiguity detection heuristics

2. **Active Learning Service** (`activeLearning.service.ts`)
   - Samples high-value ambiguous examples for review
   - Manages review queue and prioritization
   - Handles consensus tracking for multiple reviewers

3. **Retraining Integration Service** (`retrainingIntegration.service.ts`)
   - Prepares validated examples for training data integration
   - Creates ambiguity-focused validation slices
   - Processes retraining results and updates metrics

4. **Data Models**
   - `InferenceLog` - Logs all production inferences with confidence analysis
   - `ActiveLearningExample` - Manages examples selected for human review
   - `ReviewerConsensus` - Tracks consensus for conflict resolution

## Usage Guide

### Automatic Operation

The pipeline operates automatically as users interact with the chatbot:

1. **Inference Logging**: Every conversation is analyzed for confidence and ambiguity
2. **Ambiguity Detection**: Low-confidence or ambiguous interactions are flagged
3. **Automatic Sampling**: High-priority examples are queued for review

### API Endpoints

#### Review Queue Management

```bash
# Get pending examples for review
GET /api/active-learning/review-queue?status=pending&limit=20

# Get specific example details
GET /api/active-learning/examples/{exampleId}
```

#### Human Review Workflow

```bash
# Sample new examples for review (Admin only)
POST /api/active-learning/sample?limit=10

# Submit a human review
POST /api/active-learning/review
{
  "exampleId": "example-id",
  "correctedIntent": "property_search",
  "correctedResponse": "Let me help you find properties...",
  "confidence": 4,
  "reviewNotes": "Clear property search intent"
}
```

#### Training Data Integration

```bash
# Get retraining status
GET /api/active-learning/retraining/status

# Prepare training data
POST /api/active-learning/retraining/prepare

# Process retraining results
POST /api/active-learning/retraining/results
{
  "modelVersion": "v1.2.0",
  "trainingAccuracy": 0.92,
  "validationAccuracy": 0.88,
  "ambiguitySliceAccuracy": 0.85,
  "trainingDate": "2024-01-15T10:00:00Z",
  "examplesUsed": ["example-id-1", "example-id-2"]
}
```

#### Analytics and Monitoring

```bash
# Get active learning statistics
GET /api/active-learning/stats?startDate=2024-01-01&endDate=2024-01-31

# Get validated examples for training
GET /api/active-learning/validated?limit=100
```

## Configuration

### Confidence Tracking Configuration

```typescript
const confidenceConfig = {
  lowConfidenceThreshold: 0.6,     // Below this is low confidence
  nearEqualScoreThreshold: 0.15,   // Difference between top 2 experts
  minExpertAgreement: 0.7,         // Minimum agreement between experts
  complexityScoreThreshold: 0.8    // Above this is complex query
};
```

### Active Learning Configuration

```typescript
const activeLearningConfig = {
  maxSamplesPerDay: 50,      // Maximum examples to sample per day
  priorityThreshold: 0.5,    // Minimum priority score to consider
  diversityWeight: 0.3,      // Weight for query diversity
  recentnessWeight: 0.2,     // Weight for recent examples
  minConfidenceGap: 0.1      // Minimum confidence gap for interesting examples
};
```

### Retraining Configuration

```typescript
const retrainingConfig = {
  minExamplesForRetraining: 50,     // Minimum examples needed
  minReviewerConfidence: 3,         // Minimum reviewer confidence (1-5)
  retrainingSchedule: "weekly",     // How often to check
  validationSplitRatio: 0.2         // 20% for validation
};
```

## Ambiguity Detection Heuristics

The system uses multiple heuristics to detect ambiguous interactions:

1. **Low Confidence**: Overall confidence below threshold (default: 0.6)
2. **Near-Equal Scores**: Top two expert predictions within 0.15 confidence points
3. **Low Expert Agreement**: High variance in expert confidence scores
4. **Query Complexity**: Complex queries with multiple intents or unclear phrasing

## Human Review Interface

### Review Process

1. **Queue Management**: Reviewers access prioritized examples through the review queue
2. **Context Display**: Each example shows:
   - Original user query
   - Expert predictions with confidence scores
   - Context snippet from conversation
   - Ambiguity reason and priority score

3. **Labeling**: Reviewers provide:
   - Corrected intent classification
   - Optional corrected response
   - Confidence in their correction (1-5 scale)
   - Review notes

### Consensus Resolution

When multiple reviewers disagree:
- **Majority Rule**: Clear majority intent is accepted
- **Expert Review**: Escalation for complex cases
- **Discussion**: Collaborative resolution for edge cases

## Metrics and Success Tracking

### Key Performance Indicators

1. **Labeling Volume**: High-value examples labeled per week
2. **Confidence Improvement**: Reduction in low-confidence predictions
3. **Accuracy Gains**: Improvement on ambiguity-focused validation slice
4. **Pipeline Efficiency**: Time from surfacing to retraining incorporation
5. **Review Quality**: Inter-reviewer agreement and confidence scores

### Monitoring Dashboard

Access real-time metrics through:
```bash
GET /api/active-learning/stats
```

Returns:
- Total inferences and ambiguity rates
- Review queue status and throughput
- Consensus resolution statistics
- Retraining readiness indicators

## Best Practices

### For Reviewers

1. **Context Awareness**: Consider the full conversation context
2. **Consistency**: Follow established labeling guidelines
3. **Confidence Calibration**: Use the 1-5 confidence scale accurately
4. **Documentation**: Provide clear review notes for edge cases

### For System Administrators

1. **Regular Monitoring**: Check pipeline metrics weekly
2. **Threshold Tuning**: Adjust ambiguity thresholds based on performance
3. **Quality Control**: Monitor reviewer agreement and accuracy
4. **Retraining Schedule**: Maintain regular retraining cycles

### For Developers

1. **Error Handling**: Implement robust error handling for production logging
2. **Performance**: Monitor database performance with proper indexing
3. **Scalability**: Consider sharding for high-volume deployments
4. **Security**: Ensure proper authentication for admin endpoints

## Troubleshooting

### Common Issues

1. **High False Positive Rate**: Adjust ambiguity thresholds
2. **Low Sampling Volume**: Increase priority thresholds or daily limits
3. **Reviewer Disagreement**: Implement better labeling guidelines
4. **Poor Model Improvement**: Analyze validation slice performance

### Performance Optimization

1. **Database Indexing**: Ensure proper indexes on timestamp and confidence fields
2. **Batch Processing**: Process retraining data in batches
3. **Caching**: Cache frequently accessed statistics
4. **Async Processing**: Use background jobs for heavy computations

## Future Enhancements

### Planned Features

1. **Smart Labeling**: AI-assisted pre-labeling suggestions
2. **Advanced Analytics**: Detailed performance tracking dashboard
3. **Automated Retraining**: Trigger retraining based on performance metrics
4. **Multi-Modal Support**: Support for image and voice interactions
5. **Federated Learning**: Distributed learning across multiple deployments

### Integration Opportunities

1. **A/B Testing**: Compare model versions in production
2. **Real-time Feedback**: Immediate user feedback integration
3. **External Reviewers**: Support for third-party labeling services
4. **Model Versioning**: Advanced model lifecycle management