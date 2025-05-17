"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.remoteConfigOnConfigUpdated = void 0;
const helpers_1 = require("../helpers");
exports.remoteConfigOnConfigUpdated = {
    generateMock(cloudFunction) {
        const source = `//firebaseremoteconfig.googleapis.com/projects/${helpers_1.PROJECT_ID}`;
        return Object.assign(Object.assign({}, (0, helpers_1.getBaseCloudEvent)(cloudFunction)), { source, data: getConfigUpdateData() });
    },
    match(cloudFunction) {
        return ((0, helpers_1.getEventType)(cloudFunction) ===
            'google.firebase.remoteconfig.remoteConfig.v1.updated');
    },
};
function getConfigUpdateData() {
    const now = new Date().toISOString();
    return {
        versionNumber: 2,
        updateTime: now,
        updateUser: {
            name: 'testuser',
            email: 'test@example.com',
            imageUrl: 'test.com/img-url',
        },
        description: 'config update test',
        updateOrigin: 'REMOTE_CONFIG_UPDATE_ORIGIN_UNSPECIFIED',
        updateType: 'REMOTE_CONFIG_UPDATE_TYPE_UNSPECIFIED',
        rollbackSource: 0,
    };
}
