const { CommunityInsightsService } = require("../src/services/communityInsights.service");
const { communityInsightsSeed } = require("../src/data/communityInsightsSeed");

describe("CommunityInsightsService", () => {
  const createService = () => new CommunityInsightsService({ databaseFile: ":memory:" });

  test("listInsights returns all seeded insights", async () => {
    const service = createService();
    const insights = await service.listInsights();

    expect(insights).toHaveLength(communityInsightsSeed.length);
    expect(insights[0]).toHaveProperty("id");
  });

  test("listInsights filters by category case-insensitively", async () => {
    const service = createService();
    const sampleCategory = communityInsightsSeed[0].category;
    const filtered = await service.listInsights(sampleCategory.toUpperCase());

    expect(filtered).not.toHaveLength(0);
    expect(filtered.every((item) => item.category === sampleCategory)).toBe(true);
  });

  test("searchInsights matches keyword across fields", async () => {
    const service = createService();
    const results = await service.searchInsights("clinic");

    expect(results).not.toHaveLength(0);
    expect(
      results.some((item) => item.title.includes("Same-Day Care") || item.description.includes("clinic")),
    ).toBe(true);
  });

  test("listCategories returns sorted unique categories", async () => {
    const service = createService();
    const categories = await service.listCategories();
    const expectedCategories = Array.from(
      new Set(communityInsightsSeed.map((item) => item.category)),
    ).sort();

    expect(categories).toEqual(expectedCategories);
  });
});
