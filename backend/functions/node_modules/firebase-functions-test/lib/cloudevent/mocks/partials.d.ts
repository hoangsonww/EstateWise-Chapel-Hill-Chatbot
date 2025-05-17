import { MockCloudEventAbstractFactory } from '../types';
/**
 * Note: Ordering matters. Some MockEventPartials will match more generally
 * (eg {@link alertsOnAlertPublished}). In addition,
 * {@link eventarcOnCustomEventPublished} acts as a catch-all.
 */
export declare const LIST_OF_MOCK_CLOUD_EVENT_PARTIALS: Array<MockCloudEventAbstractFactory<any>>;
