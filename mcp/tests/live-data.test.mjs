import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { __liveDataTestUtils } from "../dist/tools/liveData.js";

describe("live data tool helpers", () => {
  it("filters snapshot by query and city", () => {
    const snapshot = {
      source: "zillow-live",
      generatedAt: "2026-04-16T00:00:00.000Z",
      listings: [
        {
          zpid: 1,
          address: "123 Main St",
          city: "Chapel Hill",
          state: "NC",
          zipcode: "27514",
          fetchedAt: "2026-04-16T00:00:00.000Z",
        },
        {
          zpid: 2,
          address: "999 Pine St",
          city: "Austin",
          state: "TX",
          zipcode: "73301",
          fetchedAt: "2026-04-15T00:00:00.000Z",
        },
      ],
    };
    const result = __liveDataTestUtils.searchSnapshot(snapshot, {
      q: "Main",
      city: "Chapel Hill",
      state: "NC",
      zipcode: undefined,
      limit: 10,
      maxAgeHours: undefined,
    });
    assert.equal(result.count, 1);
    assert.equal(result.results[0].zpid, 1);
  });

  it("respects maxAgeHours filter", () => {
    const snapshot = {
      source: "zillow-live",
      generatedAt: "2026-04-16T00:00:00.000Z",
      listings: [
        {
          zpid: 1,
          address: "123 Main St",
          city: "Chapel Hill",
          state: "NC",
          fetchedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        },
        {
          zpid: 2,
          address: "999 Pine St",
          city: "Chapel Hill",
          state: "NC",
          fetchedAt: new Date(Date.now() - 40 * 60 * 60 * 1000).toISOString(),
        },
      ],
    };
    const result = __liveDataTestUtils.searchSnapshot(snapshot, {
      q: "",
      city: "Chapel Hill",
      state: "NC",
      zipcode: undefined,
      limit: 10,
      maxAgeHours: 24,
    });
    assert.equal(result.count, 1);
    assert.equal(result.results[0].zpid, 1);
  });

  it("supports raw snapshot shape with records field", () => {
    const snapshot = {
      source: "zillow-live",
      generatedAt: "2026-04-16T00:00:00.000Z",
      records: [
        {
          zpid: 42,
          address: "42 Oak Ave",
          city: "Durham",
          state: "NC",
          fetchedAt: "2026-04-16T00:00:00.000Z",
        },
      ],
    };
    const result = __liveDataTestUtils.searchSnapshot(snapshot, {
      q: "oak",
      city: "Durham",
      state: "NC",
      zipcode: undefined,
      limit: 10,
      maxAgeHours: undefined,
    });
    assert.equal(result.count, 1);
    assert.equal(result.results[0].zpid, 42);
  });

  it("filters by minimum quality score", () => {
    const snapshot = {
      source: "zillow-live",
      generatedAt: "2026-04-16T00:00:00.000Z",
      listings: [
        {
          zpid: 1,
          address: "123 Main St",
          city: "Chapel Hill",
          state: "NC",
          fetchedAt: "2026-04-16T00:00:00.000Z",
          qualityScore: 0.9,
        },
        {
          zpid: 2,
          address: "999 Pine St",
          city: "Chapel Hill",
          state: "NC",
          fetchedAt: "2026-04-16T00:00:00.000Z",
          qualityScore: 0.2,
        },
      ],
    };
    const result = __liveDataTestUtils.searchSnapshot(snapshot, {
      q: "",
      city: "Chapel Hill",
      state: "NC",
      zipcode: undefined,
      limit: 10,
      maxAgeHours: undefined,
      minQualityScore: 0.5,
    });
    assert.equal(result.count, 1);
    assert.equal(result.results[0].zpid, 1);
  });

  it("emits stale snapshot warning when generatedAt is too old", () => {
    const stale = new Date(Date.now() - 100 * 60 * 60 * 1000).toISOString();
    const snapshot = {
      source: "zillow-live",
      generatedAt: stale,
      listings: [
        {
          zpid: 1,
          address: "123 Main St",
          city: "Chapel Hill",
          state: "NC",
          fetchedAt: stale,
          qualityScore: 0.9,
        },
      ],
    };
    const result = __liveDataTestUtils.searchSnapshot(snapshot, {
      q: "",
      city: "Chapel Hill",
      state: "NC",
      zipcode: undefined,
      limit: 10,
      maxAgeHours: undefined,
      minQualityScore: 0,
    });
    assert.ok(Array.isArray(result.warnings));
    assert.equal(result.warnings.length > 0, true);
  });

  it("preserves missing numeric fields as null (not zero)", () => {
    const snapshot = {
      source: "zillow-live",
      generatedAt: "2026-04-16T00:00:00.000Z",
      listings: [
        {
          zpid: 1,
          address: "123 Main St",
          city: "Chapel Hill",
          state: "NC",
          bedrooms: null,
          bathrooms: null,
          livingAreaSqft: null,
          fetchedAt: "2026-04-16T00:00:00.000Z",
          qualityScore: 0.9,
        },
      ],
    };
    const result = __liveDataTestUtils.searchSnapshot(snapshot, {
      q: "",
      city: "Chapel Hill",
      state: "NC",
      zipcode: undefined,
      limit: 10,
      maxAgeHours: undefined,
      minQualityScore: 0,
    });
    assert.equal(result.count, 1);
    assert.equal(result.results[0].bedrooms, null);
    assert.equal(result.results[0].bathrooms, null);
    assert.equal(result.results[0].livingAreaSqft, null);
  });
});
