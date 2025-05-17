"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pubsubOnMessagePublished = void 0;
const v2_1 = require("firebase-functions/v2");
const helpers_1 = require("../helpers");
exports.pubsubOnMessagePublished = {
    generateMock(cloudFunction, cloudEventPartial) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        const topicId = ((_a = (0, helpers_1.getEventFilters)(cloudFunction)) === null || _a === void 0 ? void 0 : _a.topic) || '';
        const source = `//pubsub.googleapis.com/projects/${helpers_1.PROJECT_ID}/topics/${topicId}`;
        const subscription = `projects/${helpers_1.PROJECT_ID}/subscriptions/pubsubexample-1`;
        // Used if no data.message.json is provided by the partial;
        const dataMessageJsonDefault = { hello: 'world' };
        const dataMessageAttributesDefault = {
            'sample-attribute': 'I am an attribute',
        };
        const dataMessageJson = ((_c = (_b = cloudEventPartial === null || cloudEventPartial === void 0 ? void 0 : cloudEventPartial.data) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.json) || dataMessageJsonDefault;
        // We should respect if the user provides their own message.data.
        const dataMessageData = ((_e = (_d = cloudEventPartial === null || cloudEventPartial === void 0 ? void 0 : cloudEventPartial.data) === null || _d === void 0 ? void 0 : _d.message) === null || _e === void 0 ? void 0 : _e.data) ||
            Buffer.from(JSON.stringify(dataMessageJson)).toString('base64');
        // TODO - consider warning the user if their data does not match the json they provide
        const messageData = {
            data: dataMessageData,
            messageId: ((_g = (_f = cloudEventPartial === null || cloudEventPartial === void 0 ? void 0 : cloudEventPartial.data) === null || _f === void 0 ? void 0 : _f.message) === null || _g === void 0 ? void 0 : _g.messageId) || 'message_id',
            attributes: ((_j = (_h = cloudEventPartial === null || cloudEventPartial === void 0 ? void 0 : cloudEventPartial.data) === null || _h === void 0 ? void 0 : _h.message) === null || _j === void 0 ? void 0 : _j.attributes) ||
                dataMessageAttributesDefault,
        };
        const message = new v2_1.pubsub.Message(messageData);
        return Object.assign(Object.assign({}, (0, helpers_1.getBaseCloudEvent)(cloudFunction)), { 
            // Spread fields specific to this CloudEvent
            source, data: {
                /**
                 * Note: Its very important we return the JSON representation of the message here. Without it,
                 * ts-merge blows away `data.message`.
                 */
                message: message.toJSON(),
                subscription,
            } });
    },
    match(cloudFunction) {
        return ((0, helpers_1.getEventType)(cloudFunction) ===
            'google.cloud.pubsub.topic.v1.messagePublished');
    },
};
