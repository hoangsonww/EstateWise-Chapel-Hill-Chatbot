import { MockCloudEventAbstractFactory } from '../../types';
import { CrashlyticsEvent, NewNonfatalIssuePayload } from 'firebase-functions/v2/alerts/crashlytics';
export declare const alertsCrashlyticsOnNewNonfatalIssuePublished: MockCloudEventAbstractFactory<CrashlyticsEvent<NewNonfatalIssuePayload>>;
