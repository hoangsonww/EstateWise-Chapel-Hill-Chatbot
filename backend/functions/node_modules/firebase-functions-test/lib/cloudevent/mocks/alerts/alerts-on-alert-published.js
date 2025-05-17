"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.alertsOnAlertPublished = void 0;
const helpers_1 = require("../helpers");
exports.alertsOnAlertPublished = {
    generateMock(cloudFunction) {
        const source = `//firebasealerts.googleapis.com/projects/${helpers_1.PROJECT_ID}`;
        const alertType = 'appDistribution.newTesterIosDevice';
        const appId = helpers_1.APP_ID;
        return Object.assign(Object.assign({}, (0, helpers_1.getBaseCloudEvent)(cloudFunction)), { 
            // Spread fields specific to this CloudEvent
            alertType,
            appId, data: getOnAlertPublishedData(), source });
    },
    match(cloudFunction) {
        return ((0, helpers_1.getEventType)(cloudFunction) ===
            'google.firebase.firebasealerts.alerts.v1.published');
    },
};
/** Alert Published Data */
function getOnAlertPublishedData() {
    const now = new Date().toISOString();
    return {
        createTime: now,
        endTime: now,
        payload: {},
    };
}
