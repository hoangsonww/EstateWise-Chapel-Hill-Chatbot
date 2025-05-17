import { MockCloudEventAbstractFactory } from '../../types';
import { CrashlyticsEvent, RegressionAlertPayload } from 'firebase-functions/v2/alerts/crashlytics';
export declare const alertsCrashlyticsOnRegressionAlertPublished: MockCloudEventAbstractFactory<CrashlyticsEvent<RegressionAlertPayload>>;
