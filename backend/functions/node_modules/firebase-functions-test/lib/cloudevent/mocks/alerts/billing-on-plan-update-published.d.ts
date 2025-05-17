import { MockCloudEventAbstractFactory } from '../../types';
import { BillingEvent, PlanUpdatePayload } from 'firebase-functions/v2/alerts/billing';
export declare const alertsBillingOnPlanUpdatePublished: MockCloudEventAbstractFactory<BillingEvent<PlanUpdatePayload>>;
