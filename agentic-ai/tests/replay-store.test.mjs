import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

describe("Replay store resilience", () => {
  it("does not crash startup when replay store file is malformed", () => {
    const replayPath = path.join(
      os.tmpdir(),
      `estatewise-replay-bad-${Date.now()}.json`,
    );
    fs.writeFileSync(replayPath, "{invalid-json", "utf8");

    const output = execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        "import { ReplayStore } from './dist/lang/replay-store.js'; const s = new ReplayStore({ filePath: process.env.REPLAY_PATH }); console.log(JSON.stringify(s.stats()));",
      ],
      {
        cwd: path.resolve(process.cwd()),
        env: { ...process.env, REPLAY_PATH: replayPath },
      },
    )
      .toString()
      .trim();

    const parsed = JSON.parse(output);
    assert.equal(parsed.entries, 0);

    if (fs.existsSync(replayPath)) fs.unlinkSync(replayPath);
  });
});
