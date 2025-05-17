"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStorageObjectData = void 0;
const helpers_1 = require("../helpers");
/** Storage Data */
function getStorageObjectData(bucket, filename, generation) {
    const now = new Date().toISOString();
    return {
        metageneration: 1,
        metadata: {
            firebaseStorageDownloadTokens: '00000000-0000-0000-0000-000000000000',
        },
        kind: 'storage#object',
        mediaLink: `https://www.googleapis.com/download/storage/v1/b/${bucket}/o/${helpers_1.FILENAME}?generation=${generation}&alt=media`,
        etag: 'xxxxxxxxx/yyyyy=',
        timeStorageClassUpdated: now,
        generation,
        md5Hash: 'E9LIfVl7pcVu3/moXc743w==',
        crc32c: 'qqqqqq==',
        selfLink: `https://www.googleapis.com/storage/v1/b/${bucket}/o/${helpers_1.FILENAME}`,
        name: helpers_1.FILENAME,
        storageClass: 'REGIONAL',
        size: 42,
        updated: now,
        contentDisposition: `inline; filename*=utf-8''${helpers_1.FILENAME}`,
        contentType: 'image/gif',
        timeCreated: now,
        id: `${bucket}/${helpers_1.FILENAME}/${generation}`,
        bucket,
    };
}
exports.getStorageObjectData = getStorageObjectData;
