/**
 * Pipeline Testing Framework
 *
 * Comprehensive testing utilities for pipelines including mock stages,
 * assertion helpers, test runners, and coverage tracking.
 */

import type {
  Pipeline,
  PipelineStage,
  PipelineContext,
  StageResult,
  PipelineResult,
} from './types.js';
import { Stage, createStage } from './Stage.js';
import { createPipeline } from './PipelineBuilder.js';

/**
 * Test assertion result
 */
export interface AssertionResult {
  passed: boolean;
  message: string;
  expected?: unknown;
  actual?: unknown;
}

/**
 * Test case definition
 */
export interface TestCase {
  name: string;
  input: unknown;
  expectedOutput?: unknown;
  expectedSuccess?: boolean;
  expectedError?: string | RegExp;
  timeout?: number;
  setup?: () => Promise<void> | void;
  teardown?: () => Promise<void> | void;
}

/**
 * Test suite definition
 */
export interface TestSuite {
  name: string;
  pipeline: Pipeline;
  tests: TestCase[];
  beforeAll?: () => Promise<void> | void;
  afterAll?: () => Promise<void> | void;
  beforeEach?: () => Promise<void> | void;
  afterEach?: () => Promise<void> | void;
}

/**
 * Test result
 */
export interface TestResult {
  testName: string;
  passed: boolean;
  duration: number;
  error?: Error;
  assertions: AssertionResult[];
}

/**
 * Suite result
 */
export interface SuiteResult {
  suiteName: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  duration: number;
  results: TestResult[];
}

/**
 * Mock stage for testing
 */
export class MockStage<TInput = unknown, TOutput = unknown> implements PipelineStage {
  public readonly name: string;
  public readonly description?: string;
  public readonly retryable: boolean = false;
  public readonly maxRetries: number = 0;
  public readonly timeout?: number;

  public calls: Array<{
    context: PipelineContext;
    timestamp: number;
  }> = [];

  private mockFn: (context: PipelineContext<TInput>) => Promise<TOutput> | TOutput;

  constructor(
    name: string,
    mockFn: (context: PipelineContext<TInput>) => Promise<TOutput> | TOutput,
    options?: {
      description?: string;
      retryable?: boolean;
      maxRetries?: number;
      timeout?: number;
    }
  ) {
    this.name = name;
    this.mockFn = mockFn;
    this.description = options?.description;
    this.retryable = options?.retryable ?? false;
    this.maxRetries = options?.maxRetries ?? 0;
    this.timeout = options?.timeout;
  }

  async execute(context: PipelineContext<TInput>): Promise<StageResult<TOutput>> {
    this.calls.push({
      context: JSON.parse(JSON.stringify(context)),
      timestamp: Date.now(),
    });

    try {
      const output = await this.mockFn(context);
      return {
        success: true,
        output,
        continue: true,
        metadata: {
          duration: 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        continue: false,
        metadata: {
          duration: 0,
        },
      };
    }
  }

  /**
   * Reset call history
   */
  reset(): void {
    this.calls = [];
  }

  /**
   * Check if stage was called
   */
  wasCalled(): boolean {
    return this.calls.length > 0;
  }

  /**
   * Check if stage was called N times
   */
  wasCalledTimes(times: number): boolean {
    return this.calls.length === times;
  }

  /**
   * Get call at index
   */
  getCall(index: number) {
    return this.calls[index];
  }

  /**
   * Get last call
   */
  getLastCall() {
    return this.calls[this.calls.length - 1];
  }
}

/**
 * Spy stage that wraps another stage
 */
export class SpyStage<TInput = unknown, TOutput = unknown> implements PipelineStage {
  public calls: Array<{
    context: PipelineContext;
    result: StageResult;
    timestamp: number;
    duration: number;
  }> = [];

  constructor(private wrappedStage: PipelineStage) {}

  get name() {
    return this.wrappedStage.name;
  }

  get description() {
    return this.wrappedStage.description;
  }

  get retryable() {
    return this.wrappedStage.retryable;
  }

  get maxRetries() {
    return this.wrappedStage.maxRetries;
  }

  get timeout() {
    return this.wrappedStage.timeout;
  }

  async execute(context: PipelineContext<TInput>): Promise<StageResult<TOutput>> {
    const startTime = Date.now();
    const result = await this.wrappedStage.execute(context);
    const duration = Date.now() - startTime;

    this.calls.push({
      context: JSON.parse(JSON.stringify(context)),
      result: JSON.parse(JSON.stringify(result)),
      timestamp: Date.now(),
      duration,
    });

    return result as StageResult<TOutput>;
  }

  reset(): void {
    this.calls = [];
  }

  wasCalled(): boolean {
    return this.calls.length > 0;
  }

  wasCalledTimes(times: number): boolean {
    return this.calls.length === times;
  }
}

/**
 * Assertion helpers
 */
export class Assertions {
  static assertEquals(actual: unknown, expected: unknown, message?: string): AssertionResult {
    const passed = JSON.stringify(actual) === JSON.stringify(expected);
    return {
      passed,
      message: message || (passed ? 'Values are equal' : 'Values are not equal'),
      expected,
      actual,
    };
  }

  static assertNotEquals(actual: unknown, expected: unknown, message?: string): AssertionResult {
    const passed = JSON.stringify(actual) !== JSON.stringify(expected);
    return {
      passed,
      message: message || (passed ? 'Values are not equal' : 'Values are equal'),
      expected,
      actual,
    };
  }

  static assertTrue(value: boolean, message?: string): AssertionResult {
    return {
      passed: value === true,
      message: message || (value ? 'Value is true' : 'Value is not true'),
      expected: true,
      actual: value,
    };
  }

  static assertFalse(value: boolean, message?: string): AssertionResult {
    return {
      passed: value === false,
      message: message || (!value ? 'Value is false' : 'Value is not false'),
      expected: false,
      actual: value,
    };
  }

  static assertNull(value: unknown, message?: string): AssertionResult {
    return {
      passed: value === null,
      message: message || (value === null ? 'Value is null' : 'Value is not null'),
      expected: null,
      actual: value,
    };
  }

  static assertNotNull(value: unknown, message?: string): AssertionResult {
    return {
      passed: value !== null,
      message: message || (value !== null ? 'Value is not null' : 'Value is null'),
      expected: 'not null',
      actual: value,
    };
  }

  static assertUndefined(value: unknown, message?: string): AssertionResult {
    return {
      passed: value === undefined,
      message: message || (value === undefined ? 'Value is undefined' : 'Value is not undefined'),
      expected: undefined,
      actual: value,
    };
  }

  static assertDefined(value: unknown, message?: string): AssertionResult {
    return {
      passed: value !== undefined,
      message: message || (value !== undefined ? 'Value is defined' : 'Value is undefined'),
      expected: 'defined',
      actual: value,
    };
  }

  static assertContains(haystack: unknown[], needle: unknown, message?: string): AssertionResult {
    const passed = haystack.some(item => JSON.stringify(item) === JSON.stringify(needle));
    return {
      passed,
      message: message || (passed ? 'Array contains value' : 'Array does not contain value'),
      expected: needle,
      actual: haystack,
    };
  }

  static assertMatches(value: string, pattern: RegExp, message?: string): AssertionResult {
    const passed = pattern.test(value);
    return {
      passed,
      message: message || (passed ? 'String matches pattern' : 'String does not match pattern'),
      expected: pattern,
      actual: value,
    };
  }

  static assertThrows(fn: () => unknown, errorPattern?: string | RegExp): AssertionResult {
    try {
      fn();
      return {
        passed: false,
        message: 'Function did not throw',
        expected: 'error',
        actual: 'no error',
      };
    } catch (error) {
      if (errorPattern) {
        const message = error instanceof Error ? error.message : String(error);
        const matches = typeof errorPattern === 'string'
          ? message.includes(errorPattern)
          : errorPattern.test(message);

        return {
          passed: matches,
          message: matches ? 'Error matches pattern' : 'Error does not match pattern',
          expected: errorPattern,
          actual: message,
        };
      }

      return {
        passed: true,
        message: 'Function threw error',
        expected: 'error',
        actual: error,
      };
    }
  }
}

/**
 * Test runner
 */
export class TestRunner {
  /**
   * Run a single test case
   */
  static async runTest(
    pipeline: Pipeline,
    testCase: TestCase
  ): Promise<TestResult> {
    const assertions: AssertionResult[] = [];
    const startTime = Date.now();

    try {
      // Setup
      if (testCase.setup) {
        await testCase.setup();
      }

      // Execute pipeline
      const result = await (testCase.timeout
        ? this.executeWithTimeout(pipeline, testCase.input, testCase.timeout)
        : pipeline.execute(testCase.input));

      // Assertions
      if (testCase.expectedSuccess !== undefined) {
        assertions.push(
          Assertions.assertEquals(
            result.success,
            testCase.expectedSuccess,
            'Pipeline success status'
          )
        );
      }

      if (testCase.expectedOutput !== undefined) {
        assertions.push(
          Assertions.assertEquals(
            result.output,
            testCase.expectedOutput,
            'Pipeline output'
          )
        );
      }

      if (testCase.expectedError) {
        const hasError = result.error !== undefined;
        assertions.push(
          Assertions.assertTrue(hasError, 'Pipeline should have error')
        );

        if (hasError && result.error) {
          if (typeof testCase.expectedError === 'string') {
            assertions.push(
              Assertions.assertTrue(
                result.error.message.includes(testCase.expectedError),
                'Error message matches'
              )
            );
          } else {
            assertions.push(
              Assertions.assertMatches(
                result.error.message,
                testCase.expectedError,
                'Error message matches pattern'
              )
            );
          }
        }
      }

      // Teardown
      if (testCase.teardown) {
        await testCase.teardown();
      }

      const allPassed = assertions.every(a => a.passed);

      return {
        testName: testCase.name,
        passed: allPassed,
        duration: Date.now() - startTime,
        assertions,
      };
    } catch (error) {
      return {
        testName: testCase.name,
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error : new Error(String(error)),
        assertions,
      };
    }
  }

  /**
   * Run a test suite
   */
  static async runSuite(suite: TestSuite): Promise<SuiteResult> {
    const results: TestResult[] = [];
    const startTime = Date.now();

    try {
      // beforeAll
      if (suite.beforeAll) {
        await suite.beforeAll();
      }

      // Run each test
      for (const testCase of suite.tests) {
        // beforeEach
        if (suite.beforeEach) {
          await suite.beforeEach();
        }

        const result = await this.runTest(suite.pipeline, testCase);
        results.push(result);

        // afterEach
        if (suite.afterEach) {
          await suite.afterEach();
        }
      }

      // afterAll
      if (suite.afterAll) {
        await suite.afterAll();
      }
    } catch (error) {
      console.error('Suite execution error:', error);
    }

    const passedTests = results.filter(r => r.passed).length;

    return {
      suiteName: suite.name,
      totalTests: suite.tests.length,
      passedTests,
      failedTests: suite.tests.length - passedTests,
      duration: Date.now() - startTime,
      results,
    };
  }

  /**
   * Execute pipeline with timeout
   */
  private static async executeWithTimeout(
    pipeline: Pipeline,
    input: unknown,
    timeout: number
  ): Promise<PipelineResult> {
    return Promise.race([
      pipeline.execute(input),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Test timeout')), timeout)
      ),
    ]);
  }

  /**
   * Format suite result as text
   */
  static formatResult(result: SuiteResult): string {
    const lines: string[] = [];

    lines.push(`\n${'='.repeat(60)}`);
    lines.push(`Test Suite: ${result.suiteName}`);
    lines.push(`${'='.repeat(60)}`);
    lines.push(`Total: ${result.totalTests} | Passed: ${result.passedTests} | Failed: ${result.failedTests}`);
    lines.push(`Duration: ${result.duration}ms`);
    lines.push('');

    for (const testResult of result.results) {
      const icon = testResult.passed ? '✓' : '✗';
      lines.push(`${icon} ${testResult.testName} (${testResult.duration}ms)`);

      if (!testResult.passed) {
        if (testResult.error) {
          lines.push(`  Error: ${testResult.error.message}`);
        }

        for (const assertion of testResult.assertions) {
          if (!assertion.passed) {
            lines.push(`  ${assertion.message}`);
            lines.push(`    Expected: ${JSON.stringify(assertion.expected)}`);
            lines.push(`    Actual: ${JSON.stringify(assertion.actual)}`);
          }
        }
      }
    }

    lines.push('');
    lines.push(`${'='.repeat(60)}`);
    lines.push(result.failedTests === 0 ? '✓ All tests passed!' : `✗ ${result.failedTests} test(s) failed`);
    lines.push(`${'='.repeat(60)}\n`);

    return lines.join('\n');
  }
}

/**
 * Test helper functions
 */
export const TestHelpers = {
  /**
   * Create a mock stage
   */
  mockStage: <TInput = unknown, TOutput = unknown>(
    name: string,
    fn: (context: PipelineContext<TInput>) => Promise<TOutput> | TOutput
  ) => new MockStage(name, fn),

  /**
   * Create a spy stage
   */
  spyStage: (stage: PipelineStage) => new SpyStage(stage),

  /**
   * Create a failing stage
   */
  failingStage: (name: string, errorMessage: string) =>
    createStage(name, async () => {
      throw new Error(errorMessage);
    }),

  /**
   * Create a delay stage
   */
  delayStage: (name: string, delayMs: number) =>
    createStage(name, async () => {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return { delayed: true };
    }),

  /**
   * Create a test pipeline
   */
  testPipeline: (name: string) => createPipeline({ name }),
};
