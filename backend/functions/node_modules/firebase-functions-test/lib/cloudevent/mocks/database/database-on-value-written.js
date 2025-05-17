"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseOnValueWritten = void 0;
const helpers_1 = require("../helpers");
const helpers_2 = require("./helpers");
exports.databaseOnValueWritten = {
    generateMock: helpers_2.getDatabaseChangeSnapshotCloudEvent,
    match(cloudFunction) {
        return ((0, helpers_1.getEventType)(cloudFunction) === 'google.firebase.database.ref.v1.written');
    },
};
