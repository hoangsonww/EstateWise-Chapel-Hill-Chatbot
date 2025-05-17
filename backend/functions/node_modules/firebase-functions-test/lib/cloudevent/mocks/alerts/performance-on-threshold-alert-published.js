"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceThresholdOnThresholdAlertPublished = void 0;
const helpers_1 = require("../helpers");
exports.performanceThresholdOnThresholdAlertPublished = {
    generateMock(cloudFunction) {
        const source = `//firebasealerts.googleapis.com/projects/${helpers_1.PROJECT_ID}`;
        const alertType = 'performance.threshold';
        const appId = helpers_1.APP_ID;
        return Object.assign(Object.assign({}, (0, helpers_1.getBaseCloudEvent)(cloudFunction)), { alertType,
            appId,
            source, data: getThresholdAlertPayload() });
    },
    match(cloudFunction) {
        var _a;
        return ((0, helpers_1.getEventType)(cloudFunction) ===
            'google.firebase.firebasealerts.alerts.v1.published' &&
            ((_a = (0, helpers_1.getEventFilters)(cloudFunction)) === null || _a === void 0 ? void 0 : _a.alerttype) === 'performance.threshold');
    },
};
function getThresholdAlertPayload() {
    const now = new Date().toISOString();
    return {
        createTime: now,
        endTime: now,
        payload: {
            eventName: 'test.com/api/123',
            eventType: 'network_request',
            metricType: 'duration',
            numSamples: 200,
            thresholdValue: 100,
            thresholdUnit: 'ms',
            violationValue: 200,
            violationUnit: 'ms',
            investigateUri: 'firebase.google.com/firebase/console',
        },
    };
}
