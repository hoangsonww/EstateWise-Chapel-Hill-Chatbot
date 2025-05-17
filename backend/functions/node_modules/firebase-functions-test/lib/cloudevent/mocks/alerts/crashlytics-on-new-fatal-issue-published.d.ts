import { MockCloudEventAbstractFactory } from '../../types';
import { CrashlyticsEvent, NewFatalIssuePayload } from 'firebase-functions/v2/alerts/crashlytics';
export declare const alertsCrashlyticsOnNewFatalIssuePublished: MockCloudEventAbstractFactory<CrashlyticsEvent<NewFatalIssuePayload>>;
