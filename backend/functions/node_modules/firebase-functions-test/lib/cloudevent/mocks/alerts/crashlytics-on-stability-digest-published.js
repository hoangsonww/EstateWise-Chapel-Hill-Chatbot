"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.alertsCrashlyticsOnStabilityDigestPublished = void 0;
const helpers_1 = require("../helpers");
exports.alertsCrashlyticsOnStabilityDigestPublished = {
    generateMock(cloudFunction) {
        const source = `//firebasealerts.googleapis.com/projects/${helpers_1.PROJECT_ID}`;
        return Object.assign(Object.assign({}, (0, helpers_1.getBaseCloudEvent)(cloudFunction)), { 
            // Spread fields specific to this CloudEvent
            source, data: getCrashlyticsStabilityData() });
    },
    match(cloudFunction) {
        var _a;
        return ((0, helpers_1.getEventType)(cloudFunction) ===
            'google.firebase.firebasealerts.alerts.v1.published' &&
            ((_a = (0, helpers_1.getEventFilters)(cloudFunction)) === null || _a === void 0 ? void 0 : _a.alerttype) ===
                'crashlytics.stabilityDigest');
    },
};
function getCrashlyticsStabilityData() {
    const now = new Date().toISOString();
    return {
        createTime: now,
        endTime: now,
        payload: {
            ['@type']: 'type.googleapis.com/google.events.firebase.firebasealerts.v1.CrashlyticsStabilityDigestPayload',
            digestDate: new Date().toISOString(),
            trendingIssues: [
                {
                    type: 'type',
                    eventCount: 100,
                    userCount: 100,
                    issue: {
                        id: 'crashlytics_issue_id',
                        title: 'crashlytics_issue_title',
                        subtitle: 'crashlytics_issue_subtitle',
                        appVersion: 'crashlytics_issue_app_version',
                    },
                },
            ],
        },
    };
}
