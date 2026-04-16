import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { __webTestUtils } from "../dist/tools/web.js";

describe("web tool helpers", () => {
  it("extracts duckduckgo html results with citation ids", () => {
    const html = `
      <a class="result__a" href="https://example.com/path">Example Result</a>
      <div class="result__snippet">A short snippet</div>
    `;
    const results = __webTestUtils.parseDuckDuckGoHtml(html, 5);
    assert.equal(results.length, 1);
    assert.ok(results[0].citationId.startsWith("src-"));
    assert.equal(results[0].host, "example.com");
  });

  it("extracts published timestamp from html metadata", () => {
    const html =
      '<meta property="article:published_time" content="2024-01-15T10:30:00Z" />';
    const published = __webTestUtils.extractPublishedAt(html);
    assert.equal(published, "2024-01-15T10:30:00.000Z");
  });

  it("hashes content deterministically", () => {
    const h1 = __webTestUtils.hashText("same content");
    const h2 = __webTestUtils.hashText("same content");
    assert.equal(h1, h2);
  });
});
