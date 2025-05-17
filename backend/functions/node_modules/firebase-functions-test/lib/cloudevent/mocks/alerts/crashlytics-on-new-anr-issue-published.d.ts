import { MockCloudEventAbstractFactory } from '../../types';
import { CrashlyticsEvent, NewAnrIssuePayload } from 'firebase-functions/v2/alerts/crashlytics';
export declare const alertsCrashlyticsOnNewAnrIssuePublished: MockCloudEventAbstractFactory<CrashlyticsEvent<NewAnrIssuePayload>>;
