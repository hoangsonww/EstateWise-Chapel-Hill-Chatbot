"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractRef = exports.resolveStringExpression = exports.getBaseCloudEvent = exports.getEventFilters = exports.getEventType = exports.FILENAME = exports.PROJECT_ID = exports.APP_ID = void 0;
exports.APP_ID = '__APP_ID__';
exports.PROJECT_ID = '42';
exports.FILENAME = 'file_name';
function getEventType(cloudFunction) {
    var _a, _b;
    return ((_b = (_a = cloudFunction === null || cloudFunction === void 0 ? void 0 : cloudFunction.__endpoint) === null || _a === void 0 ? void 0 : _a.eventTrigger) === null || _b === void 0 ? void 0 : _b.eventType) || '';
}
exports.getEventType = getEventType;
function getEventFilters(cloudFunction) {
    var _a, _b;
    return ((_b = (_a = cloudFunction === null || cloudFunction === void 0 ? void 0 : cloudFunction.__endpoint) === null || _a === void 0 ? void 0 : _a.eventTrigger) === null || _b === void 0 ? void 0 : _b.eventFilters) || {};
}
exports.getEventFilters = getEventFilters;
function getBaseCloudEvent(cloudFunction) {
    return {
        specversion: '1.0',
        id: makeEventId(),
        data: undefined,
        source: '',
        type: getEventType(cloudFunction),
        time: new Date().toISOString(),
    };
}
exports.getBaseCloudEvent = getBaseCloudEvent;
function resolveStringExpression(stringOrExpression) {
    if (typeof stringOrExpression === 'string') {
        return stringOrExpression;
    }
    return stringOrExpression === null || stringOrExpression === void 0 ? void 0 : stringOrExpression.value();
}
exports.resolveStringExpression = resolveStringExpression;
function makeEventId() {
    return (Math.random()
        .toString(36)
        .substring(2, 15) +
        Math.random()
            .toString(36)
            .substring(2, 15));
}
/** Resolves param values and inserts them into the provided ref string. */
function extractRef(rawRef, params) {
    const refSegments = rawRef.split('/');
    return refSegments
        .map((segment) => {
        if (segment.startsWith('{') && segment.endsWith('}')) {
            const param = segment
                .slice(1, -1)
                .replace('=**', '')
                .replace('=*', '');
            return params[param] || 'undefined';
        }
        return segment;
    })
        .join('/');
}
exports.extractRef = extractRef;
