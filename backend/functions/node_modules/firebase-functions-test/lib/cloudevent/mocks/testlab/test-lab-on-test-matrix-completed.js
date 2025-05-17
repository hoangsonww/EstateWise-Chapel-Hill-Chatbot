"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testLabOnTestMatrixCompleted = void 0;
const helpers_1 = require("../helpers");
exports.testLabOnTestMatrixCompleted = {
    generateMock(cloudFunction) {
        const source = `//firebasetestlab.googleapis.com/projects/${helpers_1.PROJECT_ID}`;
        return Object.assign(Object.assign({}, (0, helpers_1.getBaseCloudEvent)(cloudFunction)), { source, data: getTestMatrixCompletedData() });
    },
    match(cloudFunction) {
        return ((0, helpers_1.getEventType)(cloudFunction) ===
            'google.firebase.testlab.testMatrix.v1.completed');
    },
};
function getTestMatrixCompletedData() {
    const now = new Date().toISOString();
    return {
        createTime: now,
        state: 'TEST_STATE_UNSPECIFIED',
        invalidMatrixDetails: '',
        outcomeSummary: 'OUTCOME_SUMMARY_UNSPECIFIED',
        resultStorage: {
            toolResultsHistory: `projects/${helpers_1.PROJECT_ID}/histories/1234`,
            toolResultsExecution: `projects/${helpers_1.PROJECT_ID}/histories/1234/executions/5678`,
            resultsUri: 'console.firebase.google.com/test/results',
            gcsPath: 'gs://bucket/path/to/test',
        },
        clientInfo: {
            client: 'gcloud',
            details: {},
        },
        testMatrixId: '1234',
    };
}
