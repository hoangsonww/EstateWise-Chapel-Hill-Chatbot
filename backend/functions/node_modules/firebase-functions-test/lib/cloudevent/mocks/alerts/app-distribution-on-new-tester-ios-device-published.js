"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.alertsAppDistributionOnNewTesterIosDevicePublished = void 0;
const helpers_1 = require("../helpers");
exports.alertsAppDistributionOnNewTesterIosDevicePublished = {
    generateMock(cloudFunction) {
        const source = `//firebasealerts.googleapis.com/projects/${helpers_1.PROJECT_ID}`;
        const now = new Date().toISOString();
        return Object.assign(Object.assign({}, (0, helpers_1.getBaseCloudEvent)(cloudFunction)), { 
            // Spread fields specific to this CloudEvent
            source, data: {
                createTime: now,
                endTime: now,
                payload: {
                    ['@type']: 'type.googleapis.com/google.events.firebase.firebasealerts.v1.AppDistroNewTesterIosDevicePayload',
                    testerName: 'tester name',
                    testerEmail: 'test@test.com',
                    testerDeviceModelName: 'tester device model name',
                    testerDeviceIdentifier: 'tester device identifier',
                },
            } });
    },
    match(cloudFunction) {
        var _a;
        return ((0, helpers_1.getEventType)(cloudFunction) ===
            'google.firebase.firebasealerts.alerts.v1.published' &&
            ((_a = (0, helpers_1.getEventFilters)(cloudFunction)) === null || _a === void 0 ? void 0 : _a.alerttype) ===
                'appDistribution.newTesterIosDevice');
    },
};
