import { MockCloudEventAbstractFactory } from '../../types';
import { BillingEvent, PlanAutomatedUpdatePayload } from 'firebase-functions/v2/alerts/billing';
export declare const alertsBillingOnPlanAutomatedUpdatePublished: MockCloudEventAbstractFactory<BillingEvent<PlanAutomatedUpdatePayload>>;
