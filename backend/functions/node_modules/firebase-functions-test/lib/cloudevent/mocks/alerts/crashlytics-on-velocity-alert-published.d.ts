import { MockCloudEventAbstractFactory } from '../../types';
import { CrashlyticsEvent, VelocityAlertPayload } from 'firebase-functions/v2/alerts/crashlytics';
export declare const alertsCrashlyticsOnVelocityAlertPublished: MockCloudEventAbstractFactory<CrashlyticsEvent<VelocityAlertPayload>>;
