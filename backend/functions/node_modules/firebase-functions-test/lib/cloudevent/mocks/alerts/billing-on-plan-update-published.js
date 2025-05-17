"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.alertsBillingOnPlanUpdatePublished = void 0;
const helpers_1 = require("../helpers");
exports.alertsBillingOnPlanUpdatePublished = {
    generateMock(cloudFunction) {
        const source = `//firebasealerts.googleapis.com/projects/${helpers_1.PROJECT_ID}`;
        return Object.assign(Object.assign({}, (0, helpers_1.getBaseCloudEvent)(cloudFunction)), { 
            // Spread fields specific to this CloudEvent
            source, data: getBillingPlanUpdateData() });
    },
    match(cloudFunction) {
        var _a;
        return ((0, helpers_1.getEventType)(cloudFunction) ===
            'google.firebase.firebasealerts.alerts.v1.published' &&
            ((_a = (0, helpers_1.getEventFilters)(cloudFunction)) === null || _a === void 0 ? void 0 : _a.alerttype) === 'billing.planUpdate');
    },
};
/** Alert Billing Data */
function getBillingPlanUpdateData() {
    const now = new Date().toISOString();
    return {
        createTime: now,
        endTime: now,
        payload: {
            ['@type']: 'type.googleapis.com/google.events.firebase.firebasealerts.v1.BillingPlanUpdatePayload',
            billingPlan: 'flame',
            principalEmail: 'test@test.com',
            notificationType: 'upgrade',
        },
    };
}
