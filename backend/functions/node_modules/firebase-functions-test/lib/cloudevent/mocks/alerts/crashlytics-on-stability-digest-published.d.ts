import { MockCloudEventAbstractFactory } from '../../types';
import { CrashlyticsEvent, StabilityDigestPayload } from 'firebase-functions/v2/alerts/crashlytics';
export declare const alertsCrashlyticsOnStabilityDigestPublished: MockCloudEventAbstractFactory<CrashlyticsEvent<StabilityDigestPayload>>;
