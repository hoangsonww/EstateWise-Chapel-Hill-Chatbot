import { Agent, AgentContext, AgentMessage } from "../core/types.js";

/** Composes a concise, human-readable summary based on the blackboard. */
export class ReporterAgent implements Agent {
  role: "reporter" = "reporter";

  /** Gather key metrics and a brief trace of executed tools. */
  async think(ctx: AgentContext): Promise<AgentMessage> {
    const bb = ctx.blackboard;
    const lines: string[] = [];
    lines.push(`Goal: ${ctx.goal}`);
    // High-level metrics
    const medPrice = (bb.analytics?.summary as any)?.medianPrice as
      | number
      | null;
    const medSqft = (bb.analytics?.summary as any)?.medianSqft as number | null;
    const medPpsf = (bb.analytics?.summary as any)?.medianPricePerSqft as
      | number
      | null;
    if (medPrice || medSqft || medPpsf) {
      lines.push(
        `Market medians: ${medPrice ?? "?"} price | ${medSqft ?? "?"} sqft | ${medPpsf ? `$${Math.round(medPpsf)}/sqft` : "?"}`,
      );
    }
    if (bb.analytics?.groups) {
      const topZip = (bb.analytics.groups as any[])
        .slice(0, 3)
        .map(
          (g) =>
            `${g.zip}: ${g.count} listings @ $${Math.round(g.medianPrice || 0)}`,
        )
        .join("; ");
      if (topZip) lines.push(`Top ZIPs: ${topZip}`);
    }
    if (bb.zpids?.length)
      lines.push(
        `ZPIDs: ${bb.zpids.slice(0, 10).join(", ")}${bb.zpids.length > 10 ? "…" : ""}`,
      );
    const webResults = ((bb.web?.search as any)?.results || []) as any[];
    if (webResults.length) {
      const refs = webResults
        .slice(0, 3)
        .map((r) => `${r.title || "source"} (${r.url || "no-url"})`)
        .join("; ");
      lines.push(`Web sources: ${refs}`);
    }
    if (bb.mapLink) lines.push(`Map: ${bb.mapLink}`);
    if (bb.mortgage) {
      const m = bb.mortgage as any;
      lines.push(
        `Mortgage est.: P&I $${Math.round(m.pAndI || 0)}, taxes $${Math.round(m.taxes || 0)}, ins $${Math.round(m.insMonthly || 0)}, HOA $${Math.round(m.hoaMonthly || 0)} (total $${Math.round(m.total || 0)})`,
      );
    }

    // Include a concise log of executed tools for traceability
    const executed = ctx.history.filter((m) => (m.data as any)?.resultText);
    if (executed.length) {
      lines.push("Tools executed:");
      for (const m of executed.slice(-6)) {
        const t = ((m.data as any).resultText as string) || "";
        const snippet = t.length > 220 ? t.slice(0, 220) + "…" : t;
        lines.push(`- ${m.content}: ${snippet}`);
      }
    }

    lines.push("Note: Verify details before decisions.");
    return { from: this.role, content: lines.join("\n") };
  }
}
