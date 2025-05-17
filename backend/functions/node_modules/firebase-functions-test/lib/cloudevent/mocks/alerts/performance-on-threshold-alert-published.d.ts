import { MockCloudEventAbstractFactory } from '../../types';
import { PerformanceEvent, ThresholdAlertPayload } from 'firebase-functions/v2/alerts/performance';
export declare const performanceThresholdOnThresholdAlertPublished: MockCloudEventAbstractFactory<PerformanceEvent<ThresholdAlertPayload>>;
