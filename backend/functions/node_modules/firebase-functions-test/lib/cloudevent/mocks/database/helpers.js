"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCommonDatabaseFields = exports.getDatabaseChangeSnapshotCloudEvent = exports.getDatabaseSnapshotCloudEvent = void 0;
const v2_1 = require("firebase-functions/v2");
const database_1 = require("../../../providers/database");
const helpers_1 = require("../helpers");
const v1_1 = require("firebase-functions/v1");
const database_2 = require("../../../providers/database");
function getOrCreateDataSnapshot(data, ref) {
    if (data instanceof v2_1.database.DataSnapshot) {
        return data;
    }
    if (data instanceof Object) {
        return (0, database_2.makeDataSnapshot)(data, ref);
    }
    return (0, database_1.exampleDataSnapshot)(ref);
}
function getOrCreateDataSnapshotChange(data, ref) {
    if (data instanceof v1_1.Change) {
        return data;
    }
    if (data instanceof Object && (data === null || data === void 0 ? void 0 : data.before) && (data === null || data === void 0 ? void 0 : data.after)) {
        const beforeDataSnapshot = getOrCreateDataSnapshot(data.before, ref);
        const afterDataSnapshot = getOrCreateDataSnapshot(data.after, ref);
        return new v1_1.Change(beforeDataSnapshot, afterDataSnapshot);
    }
    return (0, database_1.exampleDataSnapshotChange)(ref);
}
function getDatabaseSnapshotCloudEvent(cloudFunction, cloudEventPartial) {
    const { instance, firebaseDatabaseHost, ref, location, params, } = getCommonDatabaseFields(cloudFunction, cloudEventPartial);
    const data = getOrCreateDataSnapshot(cloudEventPartial === null || cloudEventPartial === void 0 ? void 0 : cloudEventPartial.data, ref);
    return Object.assign(Object.assign({}, (0, helpers_1.getBaseCloudEvent)(cloudFunction)), { 
        // Update fields specific to this CloudEvent
        data,
        instance,
        firebaseDatabaseHost,
        ref,
        location,
        params });
}
exports.getDatabaseSnapshotCloudEvent = getDatabaseSnapshotCloudEvent;
function getDatabaseChangeSnapshotCloudEvent(cloudFunction, cloudEventPartial) {
    const { instance, firebaseDatabaseHost, ref, location, params, } = getCommonDatabaseFields(cloudFunction, cloudEventPartial);
    const data = getOrCreateDataSnapshotChange(cloudEventPartial === null || cloudEventPartial === void 0 ? void 0 : cloudEventPartial.data, ref);
    return Object.assign(Object.assign({}, (0, helpers_1.getBaseCloudEvent)(cloudFunction)), { 
        // Update fields specific to this CloudEvent
        data,
        instance,
        firebaseDatabaseHost,
        ref,
        location,
        params });
}
exports.getDatabaseChangeSnapshotCloudEvent = getDatabaseChangeSnapshotCloudEvent;
function getCommonDatabaseFields(cloudFunction, cloudEventPartial) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const instanceOrExpression = (cloudEventPartial === null || cloudEventPartial === void 0 ? void 0 : cloudEventPartial.instance) ||
        ((_c = (_b = (_a = cloudFunction.__endpoint) === null || _a === void 0 ? void 0 : _a.eventTrigger) === null || _b === void 0 ? void 0 : _b.eventFilterPathPatterns) === null || _c === void 0 ? void 0 : _c.instance) ||
        ((_f = (_e = (_d = cloudFunction.__endpoint) === null || _d === void 0 ? void 0 : _d.eventTrigger) === null || _e === void 0 ? void 0 : _e.eventFilters) === null || _f === void 0 ? void 0 : _f.instance) ||
        'instance-1';
    const instance = (0, helpers_1.resolveStringExpression)(instanceOrExpression);
    const firebaseDatabaseHost = (cloudEventPartial === null || cloudEventPartial === void 0 ? void 0 : cloudEventPartial.firebaseDatabaseHost) ||
        'firebaseDatabaseHost';
    const rawRefOrExpression = (cloudEventPartial === null || cloudEventPartial === void 0 ? void 0 : cloudEventPartial.ref) ||
        ((_j = (_h = (_g = cloudFunction === null || cloudFunction === void 0 ? void 0 : cloudFunction.__endpoint) === null || _g === void 0 ? void 0 : _g.eventTrigger) === null || _h === void 0 ? void 0 : _h.eventFilterPathPatterns) === null || _j === void 0 ? void 0 : _j.ref) ||
        '/foo/bar';
    const rawRef = (0, helpers_1.resolveStringExpression)(rawRefOrExpression);
    const location = (cloudEventPartial === null || cloudEventPartial === void 0 ? void 0 : cloudEventPartial.location) || 'us-central1';
    const params = (cloudEventPartial === null || cloudEventPartial === void 0 ? void 0 : cloudEventPartial.params) || {};
    const ref = (0, helpers_1.extractRef)(rawRef, params);
    return {
        instance,
        firebaseDatabaseHost,
        ref,
        location,
        params,
    };
}
exports.getCommonDatabaseFields = getCommonDatabaseFields;
