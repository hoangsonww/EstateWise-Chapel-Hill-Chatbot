import { MockCloudEventAbstractFactory } from '../../types';
import { CloudEvent } from 'firebase-functions/v2';
import { TestMatrixCompletedData } from 'firebase-functions/v2/testLab';
export declare const testLabOnTestMatrixCompleted: MockCloudEventAbstractFactory<CloudEvent<TestMatrixCompletedData>>;
