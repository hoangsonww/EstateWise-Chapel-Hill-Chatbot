"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import {
  graphSimilar,
  graphExplain,
  graphNeighborhood,
  lookupZpid,
} from "@/lib/api";
import { toast } from "sonner";
import Chart from "chart.js/auto";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MapPin,
  GitBranch,
  House,
  Hash,
  BarChart3,
  Calculator,
  Info,
  MessageCircleMore,
  Radar,
  HelpCircle,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { DarkModeToggle } from "@/components/dark-mode-toggle";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GraphNode = Record<string, any>;
type GraphRel = { type: string };

function prettyMoney(n?: number | null) {
  if (n == null || isNaN(Number(n))) return "N/A";
  return Number(n).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

//

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  const classes = ["flex flex-col gap-1", className].filter(Boolean).join(" ");
  return (
    <div className={classes}>
      <Label className="text-sm text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function NodeChip({ node }: { node: GraphNode }) {
  const isProperty = Object.prototype.hasOwnProperty.call(node, "zpid");
  const isZip = Object.prototype.hasOwnProperty.call(node, "code");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isNeighborhood = Object.prototype.hasOwnProperty.call(node, "name");
  const icon = isProperty ? (
    <House className="w-4 h-4" />
  ) : isZip ? (
    <Hash className="w-4 h-4" />
  ) : (
    <MapPin className="w-4 h-4" />
  );
  const label = isProperty
    ? `${node.streetAddress ?? "Property"}${node.city ? ", " + node.city : ""}${node.state ? ", " + node.state : ""}`
    : isZip
      ? `ZIP ${node.code}`
      : `Neighborhood ${node.name}`;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs bg-background">
      {icon}
      {label}
    </span>
  );
}

function RelChip({ type }: { type: string }) {
  return <span className="text-xs text-muted-foreground">{type}</span>;
}

function BreakdownChart({
  data,
}: {
  data: { label: string; value: number; color: string }[];
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const labels = data.map((d) => d.label);
  const values = data.map((d) => d.value);
  const colors = data.map((d) => d.color);

  useEffect(() => {
    if (!ref.current) return;

    const getTheme = () => {
      const isDark = document.documentElement.classList.contains("dark");
      const fontColor = isDark ? "#e5e7eb" : "#111827";
      return { isDark, fontColor } as const;
    };
    const { fontColor } = getTheme();

    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(ref.current, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{ data: values, backgroundColor: colors, borderWidth: 1 }],
      },
      options: {
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: fontColor },
          },
          tooltip: {
            titleColor: "#ffffff",
            bodyColor: "#ffffff",
            footerColor: "#ffffff",
          },
        },
        maintainAspectRatio: false,
      },
    });

    const observer = new MutationObserver(() => {
      const c = chartRef.current;
      if (!c) return;
      const { fontColor: fc } = getTheme();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      c.options.plugins!.legend!.labels!.color = fc;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c.options.plugins as any).tooltip = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(c.options.plugins as any).tooltip,
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        footerColor: "#ffffff",
      };
      c.update();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [labels.join("|"), values.join("|"), colors.join("|")]);

  return <canvas ref={ref} className="h-56" />;
}

// Additional charts for Mortgage section
function RateSensitivityChart({
  loanAmt,
  termYears,
}: {
  loanAmt: number;
  termYears: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const rates = [3, 4, 5, 6, 7, 8, 9, 10];
  const values = rates.map((apr) => {
    const r = apr / 100 / 12;
    const n = termYears * 12;
    if (!r) return loanAmt / Math.max(n, 1);
    return (loanAmt * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
  });

  useEffect(() => {
    if (!ref.current) return;
    const root = document.documentElement;
    const isDark = root.classList.contains("dark");
    const fontColor = isDark ? "#e5e7eb" : "#111827";
    const gridColor = isDark ? "#374151" : "#e5e7eb";

    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(ref.current, {
      type: "line",
      data: {
        labels: rates.map((r) => `${r}%`),
        datasets: [
          {
            label: "Monthly P&I",
            data: values.map((v) => Math.round(v)),
            borderColor: "#0ea5e9",
            backgroundColor: "rgba(14,165,233,0.2)",
            tension: 0.25,
            fill: true,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: fontColor } },
          tooltip: {
            callbacks: { label: (ctx) => `$${ctx.parsed.y?.toLocaleString()}` },
            titleColor: "#ffffff",
            bodyColor: "#ffffff",
            footerColor: "#ffffff",
          },
        },
        scales: {
          x: {
            ticks: { color: fontColor },
            grid: { color: gridColor },
          },
          y: {
            ticks: {
              color: fontColor,
              callback: (val) => `$${Number(val).toLocaleString()}`,
            },
            grid: { color: gridColor },
          },
        },
      },
    });

    const observer = new MutationObserver(() => {
      const c = chartRef.current;
      if (!c) return;
      const isDark = document.documentElement.classList.contains("dark");
      const fc = isDark ? "#e5e7eb" : "#111827";
      const gc = isDark ? "#374151" : "#e5e7eb";
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      c.options.plugins!.legend!.labels!.color = fc;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c.options.plugins as any).tooltip = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(c.options.plugins as any).tooltip,
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        footerColor: "#ffffff",
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scales: any = c.options.scales;
      if (scales?.x) {
        scales.x.ticks.color = fc;
        scales.x.grid.color = gc;
      }
      if (scales?.y) {
        scales.y.ticks.color = fc;
        scales.y.grid.color = gc;
      }
      c.update();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [loanAmt, termYears]);

  return <canvas ref={ref} className="h-56" />;
}

function DownPaymentImpactChart({
  price,
  rate,
  termYears,
}: {
  price: number;
  rate: number;
  termYears: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const pcts = [0, 5, 10, 15, 20, 25, 30, 40, 50];
  const n = termYears * 12;
  const values = pcts.map((pct) => {
    const loan = price * (1 - pct / 100);
    const r = rate / 100 / 12;
    if (!r) return loan / Math.max(n, 1);
    return (loan * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
  });

  useEffect(() => {
    if (!ref.current) return;
    const root = document.documentElement;
    const isDark = root.classList.contains("dark");
    const fontColor = isDark ? "#e5e7eb" : "#111827";
    const gridColor = isDark ? "#374151" : "#e5e7eb";

    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(ref.current, {
      type: "bar",
      data: {
        labels: pcts.map((p) => `${p}%`),
        datasets: [
          {
            label: "Monthly P&I",
            data: values.map((v) => Math.round(v)),
            backgroundColor: "rgba(16,185,129,0.7)",
            borderColor: "#10b981",
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: fontColor } },
          tooltip: {
            callbacks: { label: (ctx) => `$${ctx.parsed.y?.toLocaleString()}` },
            titleColor: "#ffffff",
            bodyColor: "#ffffff",
            footerColor: "#ffffff",
          },
        },
        scales: {
          x: { ticks: { color: fontColor }, grid: { color: gridColor } },
          y: {
            ticks: {
              color: fontColor,
              callback: (val) => `$${Number(val).toLocaleString()}`,
            },
            grid: { color: gridColor },
          },
        },
      },
    });

    const observer = new MutationObserver(() => {
      const c = chartRef.current;
      if (!c) return;
      const isDark = document.documentElement.classList.contains("dark");
      const fc = isDark ? "#e5e7eb" : "#111827";
      const gc = isDark ? "#374151" : "#e5e7eb";
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      c.options.plugins!.legend!.labels!.color = fc;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c.options.plugins as any).tooltip = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(c.options.plugins as any).tooltip,
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        footerColor: "#ffffff",
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scales: any = c.options.scales;
      if (scales?.x) {
        scales.x.ticks.color = fc;
        scales.x.grid.color = gc;
      }
      if (scales?.y) {
        scales.y.ticks.color = fc;
        scales.y.grid.color = gc;
      }
      c.update();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [price, rate, termYears]);

  return <canvas ref={ref} className="h-56" />;
}

function HelpDialog({ title, content }: { title: string; content: string }) {
  const [open, setOpen] = useState(false);

  const renderInline = (text: string, keyPrefix: string) =>
    text
      .split("**")
      .map((part, index) =>
        index % 2 === 0 ? (
          part
        ) : (
          <strong key={`${keyPrefix}-strong-${index}`}>{part}</strong>
        ),
      );

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 rounded-full hover:bg-muted"
        onClick={() => setOpen(true)}
      >
        <HelpCircle className="h-4 w-4 text-muted-foreground" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {content.split(/\n{2,}/).map((block, blockIndex) => {
              const lines = block
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean);
              if (lines.length === 0) return null;

              const blockParts: React.ReactNode[] = [];
              const headingMatch = lines[0].match(/^\*\*(.+)\*\*$/);
              let startIndex = 0;
              if (headingMatch) {
                blockParts.push(
                  <h4
                    key={`heading-${blockIndex}`}
                    className="font-semibold mt-4 mb-2"
                  >
                    {headingMatch[1]}
                  </h4>,
                );
                startIndex = 1;
              }

              const restLines = lines.slice(startIndex);
              const bulletLines = restLines.filter((line) =>
                /^[-•]/.test(line),
              );
              const textLines = restLines.filter((line) => !/^[-•]/.test(line));

              textLines.forEach((line, lineIndex) => {
                blockParts.push(
                  <p
                    key={`text-${blockIndex}-${lineIndex}`}
                    className="text-sm text-muted-foreground mb-3"
                  >
                    {renderInline(line, `${blockIndex}-text-${lineIndex}`)}
                  </p>,
                );
              });

              if (bulletLines.length > 0) {
                blockParts.push(
                  <ul
                    key={`list-${blockIndex}`}
                    className="list-disc pl-5 space-y-1"
                  >
                    {bulletLines.map((item, itemIndex) => {
                      const itemText = item.replace(/^[-•]\s*/, "").trim();
                      return (
                        <li key={`item-${blockIndex}-${itemIndex}`}>
                          {renderInline(
                            itemText,
                            `${blockIndex}-item-${itemIndex}`,
                          )}
                        </li>
                      );
                    })}
                  </ul>,
                );
              }

              if (blockParts.length === 0) return null;
              return (
                <React.Fragment key={blockIndex}>{blockParts}</React.Fragment>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function InsightsPage() {
  // ────────────────────────────────────────────────────────────────────────
  // Graph Similar
  const [similarZpid, setSimilarZpid] = useState(0);
  const [similarLimit, setSimilarLimit] = useState(5);
  const [similarLoading, setSimilarLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [similarData, setSimilarData] = useState<any[] | null>(null);

  // Memoize the nodes transformation to prevent unnecessary rerenders
  const similarGraphNodes = useMemo(() => {
    if (!similarData || similarData.length === 0) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return similarData.map((d: any) => ({
      id: String(d.property.zpid ?? Math.random()),
      label:
        d.property.streetAddress ||
        `${d.property.city || ""} ${d.property.state || ""}`.trim() ||
        "Property",
      reasons: d.reasons || [],
    }));
  }, [similarData]);

  // Store the last fetched ZPID to use in the graph label
  const [lastFetchedZpid, setLastFetchedZpid] = useState<number | null>(null);

  const [lookupOpen, setLookupOpen] = useState(false);
  const [lookupMode, setLookupMode] = useState<"explain" | "similar">(
    "explain",
  );

  async function onFetchSimilar() {
    try {
      setSimilarLoading(true);
      const res = await graphSimilar(similarZpid, similarLimit);
      setSimilarData(res.results || []);
      setLastFetchedZpid(similarZpid); // Store the ZPID that was actually fetched
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      toast.error(e.message || "Failed to fetch similar properties");
    } finally {
      setSimilarLoading(false);
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // Explain Path
  const [fromZpid, setFromZpid] = useState(0);
  const [toZpid, setToZpid] = useState(0);
  const [pathData, setPathData] = useState<{
    nodes: GraphNode[];
    rels: GraphRel[];
  } | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);

  async function onExplain() {
    try {
      setExplainLoading(true);
      const res = await graphExplain(fromZpid, toZpid);
      setPathData(res);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      toast.error(e.message || "Failed to explain path");
      setPathData(null);
    } finally {
      setExplainLoading(false);
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // Neighborhood Stats
  const [hoodName, setHoodName] = useState("");
  const [hoodLimit, setHoodLimit] = useState(20);
  const [hoodLoading, setHoodLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [hoodData, setHoodData] = useState<any | null>(null);

  async function onFetchHood() {
    try {
      setHoodLoading(true);
      const raw = (hoodName || "").trim();

      const toTitleCase = (s: string) =>
        s
          .toLowerCase()
          .replace(
            /\b([a-z])(\w*)/g,
            (_, a: string, b: string) => a.toUpperCase() + b,
          );

      const candidates = Array.from(
        new Set(
          [raw, toTitleCase(raw), raw.toUpperCase(), raw.toLowerCase()].filter(
            (x) => x.length > 0,
          ),
        ),
      );

      let usedName = raw;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let result: any | null = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let lastErr: any | null = null;
      for (const cand of candidates) {
        try {
          const r = await graphNeighborhood(cand, hoodLimit);
          result = r;
          usedName = cand;
          if (
            (Array.isArray(r?.properties) && r.properties.length > 0) ||
            (typeof r?.count === "number" && r.count > 0)
          ) {
            break;
          }
        } catch (e) {
          lastErr = e;
        }
      }
      if (!result) {
        throw lastErr || new Error("No neighborhood data found");
      }
      setHoodName(usedName);
      setHoodData(result);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      toast.error(e.message || "Failed to get neighborhood stats");
    } finally {
      setHoodLoading(false);
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // Mortgage Calculator
  const [price, setPrice] = useState(600_000);
  const [downPct, setDownPct] = useState(20);
  const [rate, setRate] = useState(6.5); // APR %
  const [termYears, setTermYears] = useState(30);
  const [taxRatePct, setTaxRatePct] = useState(0.9); // annual property tax percentage
  const [insMonthly, setInsMonthly] = useState(120); // insurance monthly
  const [hoaMonthly, setHoaMonthly] = useState(0);

  const loanAmt = useMemo(() => price * (1 - downPct / 100), [price, downPct]);
  const monthlyRate = useMemo(() => rate / 100 / 12, [rate]);
  const n = useMemo(() => termYears * 12, [termYears]);
  const pAndI = useMemo(() => {
    if (!monthlyRate) return loanAmt / Math.max(n, 1);
    const r = monthlyRate;
    return (loanAmt * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
  }, [loanAmt, monthlyRate, n]);
  const taxesMonthly = useMemo(
    () => (price * (taxRatePct / 100)) / 12,
    [price, taxRatePct],
  );
  const totalMonthly = useMemo(
    () => pAndI + taxesMonthly + insMonthly + hoaMonthly,
    [pAndI, taxesMonthly, insMonthly, hoaMonthly],
  );

  const breakdown = useMemo(
    () => [
      {
        label: "Principal+Interest",
        value: Math.round(pAndI),
        color: "#1f77b4",
      },
      { label: "Taxes", value: Math.round(taxesMonthly), color: "#ff7f0e" },
      { label: "Insurance", value: Math.round(insMonthly), color: "#2ca02c" },
      { label: "HOA", value: Math.round(hoaMonthly), color: "#9467bd" },
    ],
    [pAndI, taxesMonthly, insMonthly, hoaMonthly],
  );

  // Affordability (simple): given income and debts, estimate max home price
  const [monthlyIncome, setMonthlyIncome] = useState(9000);
  const [targetDTI, setTargetDTI] = useState(36); // %
  const [otherDebts, setOtherDebts] = useState(500);
  const maxHousingBudget = useMemo(
    () => Math.max(0, monthlyIncome * (targetDTI / 100) - otherDebts),
    [monthlyIncome, targetDTI, otherDebts],
  );
  const estMaxPAndI = useMemo(
    () =>
      Math.max(0, maxHousingBudget - (taxesMonthly + insMonthly + hoaMonthly)),
    [maxHousingBudget, taxesMonthly, insMonthly, hoaMonthly],
  );
  const estMaxLoan = useMemo(() => {
    const r = monthlyRate;
    if (!r) return estMaxPAndI * n; // edge case
    const denom = (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    if (!denom) return 0;
    return estMaxPAndI / denom;
  }, [estMaxPAndI, monthlyRate, n]);
  const estMaxPrice = useMemo(
    () => estMaxLoan / (1 - downPct / 100),
    [estMaxLoan, downPct],
  );

  return (
    <>
      <Head>
        <title>Insights & Tools | EstateWise</title>
        <meta
          name="description"
          content="Explain property relationships using the graph, explore neighborhoods, and calculate mortgages with interactive tools."
        />
      </Head>

      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <header className="sticky top-0 z-30 w-full backdrop-blur-lg bg-background/90 border-b border-border">
          <div className="max-w-7xl mx-auto h-16 px-6 flex items-center gap-4 overflow-x-auto whitespace-nowrap">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary" />
              <span className="font-extrabold tracking-tight text-lg">
                Insights & Tools
              </span>
            </div>
            <nav className="ml-auto flex items-center gap-6 text-sm">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/chat"
                    className="hover:text-primary"
                    aria-label="Chat"
                  >
                    <MessageCircleMore className="w-5 h-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Chat</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
              <Link
                href="/charts"
                className="hover:text-primary"
                aria-label="Charts"
              >
                <BarChart3 className="w-5 h-5" />
              </Link>
            </TooltipTrigger>
            <TooltipContent>Charts</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/policy-radar"
                className="hover:text-primary"
                aria-label="Policy Radar"
              >
                <Radar className="w-5 h-5" />
              </Link>
            </TooltipTrigger>
            <TooltipContent>Policy Radar</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/map"
                className="hover:text-primary"
                    aria-label="Map"
                  >
                    <MapPin className="w-5 h-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Map</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <DarkModeToggle />
                  </span>
                </TooltipTrigger>
                <TooltipContent>Toggle theme</TooltipContent>
              </Tooltip>
            </nav>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full">
          <header className="mb-6">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BarChart3 className="w-7 h-7" /> Insights & Tools
            </h1>
            <p className="text-muted-foreground">
              Graph explanations, neighborhood insights, and mortgage
              calculators.
            </p>
          </header>

          <Card className="mb-8 overflow-hidden border-primary/30 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent shadow-sm">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="space-y-3 max-w-2xl">
                  <span className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                    <TrendingUp className="h-4 w-4" /> Market Pulse
                  </span>
                  <h2 className="text-2xl font-semibold leading-tight">
                    Live market dashboards for the neighborhoods you monitor
                  </h2>
                  <p className="text-muted-foreground">
                    Track listing velocity, median price shifts, and absorption
                    rates without leaving your workflow. Market Pulse distills
                    the essentials into actionable visuals.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div className="rounded-lg border border-primary/20 bg-background/70 px-3 py-2">
                      Rolling price change snapshots
                    </div>
                    <div className="rounded-lg border border-primary/20 bg-background/70 px-3 py-2">
                      Inventory &amp; demand ratio alerts
                    </div>
                    <div className="rounded-lg border border-primary/20 bg-background/70 px-3 py-2">
                      Fresh comp highlights
                    </div>
                    <div className="rounded-lg border border-primary/20 bg-background/70 px-3 py-2">
                      Export-friendly chart views
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-start gap-4 md:items-end">
                  <div className="rounded-full border border-primary/30 bg-background/70 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                    Updated daily
                  </div>
                  <Button asChild size="lg" className="group">
                    <Link href="/market-pulse">
                      Explore Market Pulse
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                  <p className="text-xs text-muted-foreground md:text-right">
                    Preview coverage for Raleigh-Durham, Charlotte, and coastal
                    NC markets.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-10 overflow-hidden border-emerald-500/40 bg-gradient-to-r from-emerald-500/15 via-primary/10 to-transparent shadow-sm">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="space-y-3 max-w-2xl">
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
                    <Radar className="h-4 w-4" /> New: Policy Radar
                  </span>
                  <h2 className="text-2xl font-semibold leading-tight">
                    Anticipate civic decisions before they move the market
                  </h2>
                  <p className="text-muted-foreground">
                    Orchestrate rezonings, incentives, and institutional expansions with a live playbook for Chapel Hill. Get coalition intelligence, activation checklists, and engagement calendars in one briefing deck.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div className="rounded-lg border border-emerald-500/30 bg-background/70 px-3 py-2">
                      Civic signal filtering &amp; sentiment pulse
                    </div>
                    <div className="rounded-lg border border-emerald-500/30 bg-background/70 px-3 py-2">
                      Scenario-based playbooks for teams
                    </div>
                    <div className="rounded-lg border border-emerald-500/30 bg-background/70 px-3 py-2">
                      Engagement calendar with prep windows
                    </div>
                    <div className="rounded-lg border border-emerald-500/30 bg-background/70 px-3 py-2">
                      Opportunity + risk scoreboard summaries
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-start gap-4 md:items-end">
                  <div className="rounded-full border border-emerald-500/40 bg-background/70 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
                    Weekly civic scan
                  </div>
                  <Button asChild size="lg" variant="outline" className="border-emerald-500/50 text-emerald-600 dark:text-emerald-300 group">
                    <Link href="/policy-radar">
                      Launch Policy Radar
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                  <p className="text-xs text-muted-foreground md:text-right">
                    Updated with rezoning, infrastructure, and incentive files driving Chapel Hill valuations.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Graph Tools */}
            <div className="flex flex-col gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <GitBranch className="w-5 h-5" /> Explain Relationship
                    </span>
                    <HelpDialog
                      title="How to Use Explain Relationship"
                      content={`This tool finds and displays the shortest connection path between two properties in our graph database.

**What you need:**
• From ZPID: The starting property's Zillow ID
• To ZPID: The destination property's Zillow ID

**How it works:**
The tool searches for connections through:
• Same ZIP code relationships
• Same neighborhood relationships
• Property similarity edges

**Tips:**
• Use the "Get ZPID" button if you don't know a property's ZPID
• The visual graph shows how properties are connected
• Shorter paths indicate stronger relationships`}
                    />
                  </CardTitle>
                  <CardDescription>
                    Return the shortest path between two properties via same
                    ZIP, same neighborhood, or similarity edges.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                    <Field label="From ZPID">
                      <Input
                        type="number"
                        value={fromZpid || ""}
                        onChange={(e) => setFromZpid(Number(e.target.value))}
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" &&
                            fromZpid &&
                            toZpid &&
                            !explainLoading
                          ) {
                            onExplain();
                          }
                        }}
                        placeholder="e.g. 123456"
                      />
                    </Field>
                    <Field label="To ZPID">
                      <Input
                        type="number"
                        value={toZpid || ""}
                        onChange={(e) => setToZpid(Number(e.target.value))}
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" &&
                            fromZpid &&
                            toZpid &&
                            !explainLoading
                          ) {
                            onExplain();
                          }
                        }}
                        placeholder="e.g. 789012"
                      />
                    </Field>
                    <Button
                      onClick={onExplain}
                      disabled={explainLoading || !fromZpid || !toZpid}
                    >
                      {explainLoading ? "Explaining..." : "Explain"}
                    </Button>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="mt-2 cursor-pointer"
                      onClick={() => {
                        setLookupMode("explain");
                        setLookupOpen(true);
                      }}
                    >
                      Get ZPID
                    </Button>
                  </div>
                  <Separator />
                  {pathData ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {pathData.nodes.map((n, i) => (
                          <React.Fragment key={i}>
                            <NodeChip node={n} />
                            {i < pathData.rels.length && (
                              <RelChip type={pathData.rels[i].type} />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                      <div className="rounded-md border p-2 bg-muted/30">
                        <PathGraph
                          nodes={pathData.nodes}
                          rels={pathData.rels}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Info className="w-4 h-4" /> Enter two zpids to see their
                      connection.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <House className="w-5 h-5" /> Graph Similar Properties
                    </span>
                    <HelpDialog
                      title="How to Use Graph Similar Properties"
                      content={`This tool finds properties similar to your target property based on graph relationships.

**What you need:**
• ZPID: The property's Zillow ID to find similar homes for
• Limit: Number of similar properties to return (1-20)

**Similarity factors:**
• Same neighborhood (green nodes)
• Same ZIP code (orange nodes)
• Vector similarity based on features (purple nodes)

**Understanding results:**
• Each result shows a similarity score
• Reasons explain why properties are considered similar
• The visual graph displays relationships with color coding

**Use cases:**
• Finding comparable properties for pricing
• Discovering alternative homes to consider
• Market analysis in specific areas`}
                    />
                  </CardTitle>
                  <CardDescription>
                    Find similar homes by explicit graph relationships with
                    reasons.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                    <Field label="ZPID">
                      <Input
                        type="number"
                        value={similarZpid || ""}
                        onChange={(e) => setSimilarZpid(Number(e.target.value))}
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" &&
                            similarZpid &&
                            !similarLoading
                          ) {
                            onFetchSimilar();
                          }
                        }}
                        placeholder="e.g. 123456"
                      />
                    </Field>
                    <Field
                      label={`Limit: ${similarLimit}`}
                      className="md:self-center md:h-full md:justify-center"
                    >
                      <Slider
                        value={[similarLimit]}
                        min={1}
                        max={20}
                        step={1}
                        onValueChange={(v) => setSimilarLimit(v[0])}
                        className="w-full"
                      />
                    </Field>
                    <Button
                      onClick={onFetchSimilar}
                      disabled={similarLoading || !similarZpid}
                    >
                      {similarLoading ? "Loading..." : "Fetch"}
                    </Button>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="mt-2 cursor-pointer"
                      onClick={() => {
                        setLookupMode("similar");
                        setLookupOpen(true);
                      }}
                    >
                      Get ZPID
                    </Button>
                  </div>
                  <Separator />
                  <div className="flex flex-col gap-2">
                    {similarData && similarData.length > 0 ? (
                      <>
                        <ul className="space-y-2">
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          {similarData.map((item: any, idx: number) => (
                            <li key={idx} className="rounded border p-3">
                              <div className="flex justify-between text-sm">
                                <div>
                                  <div className="font-medium">
                                    {item.property.streetAddress || "Property"}
                                    {item.property.city
                                      ? `, ${item.property.city}`
                                      : ""}
                                    {item.property.state
                                      ? `, ${item.property.state}`
                                      : ""}
                                    {item.property.zipcode
                                      ? ` ${item.property.zipcode}`
                                      : ""}
                                  </div>
                                  <div className="text-muted-foreground">
                                    {prettyMoney(item.property.price)} •{" "}
                                    {item.property.bedrooms ?? "?"} bd •{" "}
                                    {item.property.bathrooms ?? "?"} ba •{" "}
                                    {item.property.livingArea ?? "?"} sqft
                                  </div>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  score{" "}
                                  {item.score?.toFixed
                                    ? item.score.toFixed(3)
                                    : item.score}
                                </div>
                              </div>
                              {Array.isArray(item.reasons) &&
                                item.reasons.length > 0 && (
                                  <div className="mt-1 text-xs">
                                    Reasons: {item.reasons.join(", ")}
                                  </div>
                                )}
                            </li>
                          ))}
                        </ul>
                        <div className="rounded-md border p-2 bg-muted/30 mt-3">
                          <SimilarGraph
                            centerLabel={`ZPID ${lastFetchedZpid || "?"}`}
                            nodes={similarGraphNodes}
                          />
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Enter a zpid to find graph-based similarities.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <MapPin className="w-5 h-5" /> Neighborhood Stats
                    </span>
                    <HelpDialog
                      title="How to Use Neighborhood Stats"
                      content={`This tool provides statistical summaries and property samples for specific neighborhoods.

**What you need:**
• Neighborhood Name: Enter the name (e.g., "Meadowmont")
• Limit: Number of sample properties to display (5-100)

**Information provided:**
• Total property count in the neighborhood
• Average home price
• Average square footage
• Sample list of actual properties
• Interactive force-directed graph visualization

**Tips:**
• The tool tries different capitalizations automatically
• Drag nodes in the graph to explore relationships
• Larger nodes indicate higher-priced properties
• Use for quick neighborhood market overviews`}
                    />
                  </CardTitle>
                  <CardDescription>
                    Summaries by neighborhood with a sample list of properties.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                    <Field label="Neighborhood Name">
                      <Input
                        value={hoodName}
                        onChange={(e) => setHoodName(e.target.value)}
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" &&
                            hoodName.trim() &&
                            !hoodLoading
                          ) {
                            onFetchHood();
                          }
                        }}
                        placeholder="e.g. Meadowmont"
                      />
                    </Field>
                    <Field
                      label={`Limit: ${hoodLimit}`}
                      className="md:self-center md:h-full md:justify-center"
                    >
                      <Slider
                        value={[hoodLimit]}
                        min={5}
                        max={100}
                        step={5}
                        onValueChange={(v) => setHoodLimit(v[0])}
                        className="w-full"
                      />
                    </Field>
                    <Button
                      onClick={onFetchHood}
                      disabled={hoodLoading || !hoodName.trim()}
                    >
                      {hoodLoading ? "Loading..." : "Fetch"}
                    </Button>
                  </div>
                  <Separator />
                  {hoodData ? (
                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="font-medium">Count:</span>{" "}
                        {hoodData.count} •{" "}
                        <span className="font-medium">Avg Price:</span>{" "}
                        {prettyMoney(hoodData.avgPrice)} •{" "}
                        <span className="font-medium">Avg Area:</span>{" "}
                        {hoodData.avgArea
                          ? Math.round(hoodData.avgArea) + " sqft"
                          : "N/A"}
                      </div>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {Array.isArray(hoodData.properties) &&
                          hoodData.properties
                            .slice(0, hoodLimit)
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            .map((p: any, i: number) => (
                              <li
                                key={i}
                                className="rounded border p-3 text-sm"
                              >
                                <div className="font-medium">
                                  {p.streetAddress || "Property"}
                                  {p.city ? `, ${p.city}` : ""}
                                  {p.state ? `, ${p.state}` : ""}{" "}
                                  {p.zipcode || ""}
                                </div>
                                <div className="text-muted-foreground">
                                  {prettyMoney(p.price)} • {p.bedrooms ?? "?"}{" "}
                                  bd • {p.bathrooms ?? "?"} ba
                                </div>
                              </li>
                            ))}
                      </ul>
                      <div className="rounded-md border p-2 bg-muted/30">
                        <NeighborhoodForceGraph
                          name={hoodData.neighborhood || hoodName}
                          properties={hoodData.properties || []}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Enter a neighborhood name to see summary stats.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Mortgage & Calculators */}
            <div className="flex flex-col gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Calculator className="w-5 h-5" /> Mortgage Calculator
                    </span>
                    <HelpDialog
                      title="How to Use Mortgage Calculator"
                      content={`This comprehensive calculator helps you understand the true cost of homeownership.

**Main inputs:**
• Home Price: Total purchase price
• Down Payment: Percentage down (0-50%)
• Interest Rate: Annual percentage rate (APR)
• Term: Loan duration in years
• Property Tax Rate: Annual tax as % of home value
• Insurance: Monthly homeowners insurance
• HOA: Monthly HOA fees if applicable

**Visualizations:**
• **Monthly Breakdown**: Pie chart showing payment components
• **Rate Sensitivity**: How payment changes with interest rates
• **Down Payment Impact**: Effect of down payment on monthly costs

**Additional tools:**
• **Affordability Estimator**: Calculate max home price based on income
• **Quick calculators**: Price per square foot and down payment amounts

**Tips:**
• Use sliders for quick adjustments
• Charts update automatically
• Consider all costs, not just principal & interest`}
                    />
                  </CardTitle>
                  <CardDescription>
                    Interactive monthly payment breakdown with taxes, insurance,
                    and HOA.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Home Price">
                      <Input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(Number(e.target.value))}
                      />
                    </Field>
                    <Field
                      label={`Down Payment: ${downPct}%`}
                      className="md:self-center md:h-full md:justify-center"
                    >
                      <Slider
                        value={[downPct]}
                        min={0}
                        max={50}
                        step={1}
                        onValueChange={(v) => setDownPct(v[0])}
                      />
                    </Field>
                    <Field
                      label={`Interest Rate (APR): ${rate}%`}
                      className="md:self-center md:h-full md:justify-center"
                    >
                      <Slider
                        value={[rate]}
                        min={1}
                        max={12}
                        step={0.125}
                        onValueChange={(v) => setRate(v[0])}
                      />
                    </Field>
                    <Field
                      label={`Term: ${termYears} years`}
                      className="md:self-center md:h-full md:justify-center"
                    >
                      <Slider
                        value={[termYears]}
                        min={10}
                        max={30}
                        step={5}
                        onValueChange={(v) => setTermYears(v[0])}
                      />
                    </Field>
                    <Field
                      label={`Property Tax Rate: ${taxRatePct}%`}
                      className="md:self-center md:h-full md:justify-center"
                    >
                      <Slider
                        value={[taxRatePct]}
                        min={0.2}
                        max={2.0}
                        step={0.05}
                        onValueChange={(v) =>
                          setTaxRatePct(Number(v[0].toFixed(2)))
                        }
                      />
                    </Field>
                    <Field label="Insurance (monthly)">
                      <Input
                        type="number"
                        value={insMonthly}
                        onChange={(e) => setInsMonthly(Number(e.target.value))}
                      />
                    </Field>
                    <Field label="HOA (monthly)">
                      <Input
                        type="number"
                        value={hoaMonthly}
                        onChange={(e) => setHoaMonthly(Number(e.target.value))}
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="h-full">
                      <CardHeader>
                        <CardTitle className="text-base">
                          Monthly Breakdown
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="h-64">
                        <BreakdownChart data={breakdown} />
                      </CardContent>
                    </Card>
                    <Card className="h-full">
                      <CardHeader>
                        <CardTitle className="text-base">Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="text-sm">
                          Loan Amount:{" "}
                          <span className="font-medium">
                            {prettyMoney(loanAmt)}
                          </span>
                        </div>
                        <div className="text-sm">
                          P&I:{" "}
                          <span className="font-medium">
                            {prettyMoney(pAndI)}
                          </span>
                        </div>
                        <div className="text-sm">
                          Taxes:{" "}
                          <span className="font-medium">
                            {prettyMoney(taxesMonthly)}
                          </span>
                        </div>
                        <div className="text-sm">
                          Insurance:{" "}
                          <span className="font-medium">
                            {prettyMoney(insMonthly)}
                          </span>
                        </div>
                        <div className="text-sm">
                          HOA:{" "}
                          <span className="font-medium">
                            {prettyMoney(hoaMonthly)}
                          </span>
                        </div>
                        <Separator />
                        <div className="text-lg">
                          Total Monthly:{" "}
                          <span className="font-semibold">
                            {prettyMoney(totalMonthly)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <Card className="h-full">
                      <CardHeader>
                        <CardTitle className="text-base">
                          Rate Sensitivity
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="h-64">
                        <RateSensitivityChart
                          loanAmt={loanAmt}
                          termYears={termYears}
                        />
                      </CardContent>
                    </Card>
                    <Card className="h-full">
                      <CardHeader>
                        <CardTitle className="text-base">
                          Down Payment Impact
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="h-64">
                        <DownPaymentImpactChart
                          price={price}
                          rate={rate}
                          termYears={termYears}
                        />
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Affordability Estimator
                  </CardTitle>
                  <CardDescription>
                    Estimate a maximum home price from income, target DTI and
                    other debts.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Monthly Income">
                    <Input
                      type="number"
                      value={monthlyIncome}
                      onChange={(e) => setMonthlyIncome(Number(e.target.value))}
                    />
                  </Field>
                  <Field
                    label={`Target DTI: ${targetDTI}%`}
                    className="md:self-center md:h-full md:justify-center"
                  >
                    <Slider
                      value={[targetDTI]}
                      min={25}
                      max={45}
                      step={1}
                      onValueChange={(v) => setTargetDTI(v[0])}
                    />
                  </Field>
                  <Field label="Other Debts (monthly)">
                    <Input
                      type="number"
                      value={otherDebts}
                      onChange={(e) => setOtherDebts(Number(e.target.value))}
                    />
                  </Field>
                  <div className="space-y-1">
                    <div className="text-sm">
                      Max Housing Budget:{" "}
                      <span className="font-medium">
                        {prettyMoney(maxHousingBudget)}
                      </span>
                    </div>
                    <div className="text-sm">
                      Est. Max P&I:{" "}
                      <span className="font-medium">
                        {prettyMoney(estMaxPAndI)}
                      </span>
                    </div>
                    <div className="text-sm">
                      Est. Max Loan:{" "}
                      <span className="font-medium">
                        {prettyMoney(estMaxLoan)}
                      </span>
                    </div>
                    <div className="text-base">
                      Estimated Max Price:{" "}
                      <span className="font-semibold">
                        {prettyMoney(estMaxPrice)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick Tools</CardTitle>
                  <CardDescription>
                    Extra calculators for quick checks.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <QuickPricePerSqft />
                  <QuickDownPayment price={price} downPct={downPct} />
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
        <GetZpidDialog
          open={lookupOpen}
          onOpenChange={setLookupOpen}
          onSelect={(z, target) => {
            if (!z) return;
            // Smart fill behavior:
            // - If in Similar mode (single input), always set/replace that field.
            // - If in Explain mode (two inputs):
            //   * If From is empty, fill From.
            //   * Else if To is empty, fill To.
            //   * Else replace To.
            if (lookupMode === "similar" || target === "similar") {
              setSimilarZpid(z);
            } else {
              const fromEmpty = !fromZpid;
              const toEmpty = !toZpid;
              if (fromEmpty) setFromZpid(z);
              else if (toEmpty) setToZpid(z);
              else setToZpid(z);
            }
            setLookupOpen(false);
          }}
        />
      </div>
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Graph components rendered with d3 force simulations
// ────────────────────────────────────────────────────────────────────────────

function PathGraph({ nodes, rels }: { nodes: GraphNode[]; rels: GraphRel[] }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!nodes?.length) {
      if (ref.current) {
        const empty = ref.current;
        empty.innerHTML = "";
      }
      return;
    }

    let simulation: undefined | { stop: () => void };
    let themeObserver: MutationObserver | null = null;

    (async () => {
      if (!ref.current) return;

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const d3: any = await import("d3");
        const width = Math.max(520, nodes.length * 180);
        const height = 240;
        const margin = 60;

        const describeNode = (n: GraphNode) => {
          if (n.zpid) return `${n.streetAddress || "Property"}`;
          if (n.code) return `ZIP ${n.code}`;
          if (n.name) return `${n.name}`;
          return "Node";
        };

        const typeFor = (n: GraphNode) => {
          if (n.zpid) return "property";
          if (n.code) return "zip";
          if (n.name) return "neighborhood";
          return "other";
        };

        const shortLabel = (n: GraphNode) => {
          if (n.zpid) return "Home";
          if (n.code) return "ZIP";
          if (n.name) return "Hood";
          return "Node";
        };

        const targetX = (idx: number) =>
          nodes.length === 1
            ? width / 2
            : margin +
              (idx * (width - margin * 2)) / Math.max(1, nodes.length - 1);

        const dataNodes = nodes.map((node, idx) => ({
          id: `path-node-${idx}`,
          index: idx,
          raw: node,
          label: describeNode(node),
          short: shortLabel(node),
          type: typeFor(node),
          targetX: targetX(idx),
        }));

        const dataLinks = rels
          .slice(0, Math.max(0, nodes.length - 1))
          .map((rel, idx) => ({
            source: dataNodes[idx].id,
            target: dataNodes[idx + 1].id,
            label: rel?.type || "REL",
          }));

        const svg = d3.select(ref.current);
        svg.selectAll("*").remove();
        svg.attr("viewBox", `0 0 ${width} ${height}`);

        const g = svg.append("g");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const zoomed = (event: any) => {
          g.attr("transform", event.transform);
        };
        svg.call(d3.zoom().scaleExtent([0.5, 3]).on("zoom", zoomed));

        const theme = () => {
          const isDark = document.documentElement.classList.contains("dark");
          return {
            isDark,
            text: isDark ? "#e5e7eb" : "#111827",
            link: isDark ? "#475569" : "#cbd5e1",
          };
        };

        const nodeColor = (type: string) => {
          switch (type) {
            case "property":
              return "#0ea5e9";
            case "zip":
              return "#f97316";
            case "neighborhood":
              return "#22c55e";
            default:
              return "#64748b";
          }
        };

        const link = g
          .append("g")
          .selectAll("line")
          .data(dataLinks)
          .join("line")
          .attr("stroke", theme().link)
          .attr("stroke-width", 1.8);

        const linkLabels = g
          .append("g")
          .selectAll("text")
          .data(dataLinks)
          .join("text")
          .attr("font-size", 10)
          .attr("text-anchor", "middle")
          .attr("fill", theme().text)
          .attr("paint-order", "stroke")
          .attr("stroke", theme().isDark ? "#0f172a" : "#f8fafc")
          .attr("stroke-width", 2)
          .text((d: { label: string }) => d.label);

        const nodeGroup = g
          .append("g")
          .selectAll("g")
          .data(dataNodes)
          .join("g")
          .call(
            d3
              .drag()
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .on("start", (event: any, d: { fx?: number; fy?: number }) => {
                if (!event.active && simulation)
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-ignore
                  simulation.alphaTarget(0.3).restart();
                d.fx = event.x;
                d.fy = event.y;
              })
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .on("drag", (event: any, d: { fx?: number; fy?: number }) => {
                d.fx = event.x;
                d.fy = event.y;
              })
              .on(
                "end",
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (event: any, d: { fx?: number | null; fy?: number | null }) => {
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-ignore
                  if (!event.active && simulation) simulation.alphaTarget(0);
                  d.fx = null;
                  d.fy = null;
                },
              ),
          );

        nodeGroup
          .append("circle")
          .attr("r", 24)
          .attr("fill", (d: { type: string }) => nodeColor(d.type))
          .attr("fill-opacity", 0.92);

        nodeGroup
          .append("text")
          .attr("text-anchor", "middle")
          .attr("dy", "0.35em")
          .attr("fill", "#ffffff")
          .attr("font-size", 11)
          .attr("font-weight", 600)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .text((d: any) => d.short);

        const nodeLabels = nodeGroup
          .append("text")
          .attr("text-anchor", "middle")
          .attr("y", 36)
          .attr("fill", theme().text)
          .attr("font-size", 11)
          .text((d: { label: string }) => d.label.slice(0, 40));

        const applyTheme = () => {
          const { text, link: linkColor, isDark } = theme();
          link.attr("stroke", linkColor);
          linkLabels
            .attr("fill", text)
            .attr("stroke", isDark ? "#0f172a" : "#f8fafc");
          nodeLabels.attr("fill", text);
        };
        applyTheme();

        themeObserver = new MutationObserver(() => applyTheme());
        themeObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["class"],
        });

        simulation = d3
          .forceSimulation(dataNodes)
          .force(
            "link",
            d3
              .forceLink(dataLinks)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .id((d: any) => d.id)
              .distance(140)
              .strength(1),
          )
          .force("charge", d3.forceManyBody().strength(-220))
          .force(
            "collide",
            d3.forceCollide().radius(() => 36),
          )
          .force("y", d3.forceY(height / 2).strength(0.6))
          .force(
            "x",
            d3.forceX((d: { targetX: number }) => d.targetX).strength(0.9),
          )
          .on("tick", () => {
            link
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .attr("x1", (d: any) => d.source.x)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .attr("y1", (d: any) => d.source.y)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .attr("x2", (d: any) => d.target.x)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .attr("y2", (d: any) => d.target.y);

            linkLabels
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .attr("y", (d: any) => (d.source.y + d.target.y) / 2 - 16);

            nodeGroup.attr(
              "transform",
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (d: any) => `translate(${d.x}, ${d.y})`,
            );
          });
      } catch (err) {
        console.error("Failed to render path graph", err);
      }
    })();

    return () => {
      simulation?.stop?.();
      themeObserver?.disconnect();
    };
  }, [nodes, rels]);

  return <svg ref={ref} className="w-full h-36" />;
}

// eslint-disable-next-line react/display-name
const SimilarGraph = React.memo(
  ({
    centerLabel,
    nodes,
  }: {
    centerLabel: string;
    nodes: { id: string; label: string; reasons: string[] }[];
  }) => {
    const ref = useRef<SVGSVGElement>(null);

    useEffect(() => {
      let simulation: undefined | { stop: () => void };
      let themeObserver: MutationObserver | null = null;

      (async () => {
        if (!ref.current) return;
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const d3: any = await import("d3");

          const width = 480;
          const height = 360;
          const svg = d3.select(ref.current);
          svg.selectAll("*").remove();
          svg.attr("viewBox", `0 0 ${width} ${height}`);

          const theme = () => {
            const isDark = document.documentElement.classList.contains("dark");
            return {
              isDark,
              text: isDark ? "#e5e7eb" : "#111827",
              link: isDark ? "#475569" : "#cbd5e1",
              legend: isDark ? "#e5e7eb" : "#111827",
            };
          };

          const colorForReasons = (reasons: string[]) => {
            if (reasons.includes("vector similarity")) return "#8b5cf6";
            if (reasons.includes("same neighborhood")) return "#22c55e";
            if (reasons.includes("same zip code")) return "#f59e0b";
            return "#64748b";
          };

          const dataNodes = [
            {
              id: "center",
              type: "center",
              label: centerLabel || "Target",
              reasons: [] as string[],
            },
            ...nodes.map((n, idx) => ({
              id: n.id || `similar-${idx}`,
              type: "similar",
              label: n.label || "Property",
              reasons: Array.isArray(n.reasons) ? n.reasons : [],
              order: idx,
            })),
          ];

          const dataLinks = nodes.map((n, idx) => ({
            source: "center",
            target: n.id || `similar-${idx}`,
          }));

          const g = svg.append("g");

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const zoomed = (event: any) => {
            g.attr("transform", event.transform);
          };
          svg.call(d3.zoom().scaleExtent([0.6, 3]).on("zoom", zoomed));

          const link = g
            .append("g")
            .selectAll("line")
            .data(dataLinks)
            .join("line")
            .attr("stroke", theme().link)
            .attr("stroke-width", 1.6);

          const nodeGroup = g
            .append("g")
            .selectAll("g")
            .data(dataNodes)
            .join("g")
            .call(
              d3
                .drag()
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .on("start", (event: any, d: { fx?: number; fy?: number }) => {
                  if (!event.active && simulation)
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    simulation.alphaTarget(0.3).restart();
                  d.fx = event.x;
                  d.fy = event.y;
                })
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .on("drag", (event: any, d: { fx?: number; fy?: number }) => {
                  d.fx = event.x;
                  d.fy = event.y;
                })
                .on(
                  "end",
                  (
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    event: any,
                    d: { fx?: number | null; fy?: number | null },
                  ) => {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    if (!event.active && simulation) simulation.alphaTarget(0);
                    d.fx = null;
                    d.fy = null;
                  },
                ),
            );

          nodeGroup
            .append("circle")
            .attr("r", (d: { type: string }) => (d.type === "center" ? 28 : 22))
            .attr("fill", (d: { type: string; reasons: string[] }) =>
              d.type === "center" ? "#0ea5e9" : colorForReasons(d.reasons),
            )
            .attr("fill-opacity", 0.92);

          nodeGroup
            .append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "0.35em")
            .attr("fill", "#ffffff")
            .attr("font-size", 11)
            .attr("font-weight", 600)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .text((d: any) =>
              d.type === "center" ? "Center" : `${(d.order ?? 0) + 1}`,
            );

          const nodeLabels = nodeGroup
            .append("text")
            .attr("text-anchor", "middle")
            .attr("y", (d: { type: string }) => (d.type === "center" ? 42 : 36))
            .attr("fill", theme().text)
            .attr("font-size", 11)
            .text((d: { label: string }) => d.label.slice(0, 40));

          const legendGroup = svg
            .append("g")
            .attr("transform", "translate(16,16)");
          const legendData = [
            { label: "same neighborhood", color: "#22c55e", y: 8 },
            { label: "same zip", color: "#f59e0b", y: 32 },
            { label: "vector similarity", color: "#8b5cf6", y: 56 },
          ];

          legendGroup
            .selectAll("circle")
            .data(legendData)
            .join("circle")
            .attr("cx", 6)
            .attr("cy", (d: { y: number }) => d.y)
            .attr("r", 6)
            .attr("fill", (d: { color: string }) => d.color);

          legendGroup
            .selectAll("text")
            .data(legendData)
            .join("text")
            .attr("x", 18)
            .attr("y", (d: { y: number }) => d.y + 4)
            .attr("font-size", 10)
            .attr("fill", theme().legend)
            .text((d: { label: string }) => d.label);

          const applyTheme = () => {
            const { text, link: linkColor, legend } = theme();
            link.attr("stroke", linkColor);
            nodeLabels.attr("fill", text);
            legendGroup.selectAll("text").attr("fill", legend);
          };

          applyTheme();

          themeObserver = new MutationObserver(() => applyTheme());
          themeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
          });

          const ringRadius = Math.max(80, Math.min(width, height - 140) / 2);
          const centerY = height / 2 - 20;

          simulation = d3
            .forceSimulation(dataNodes)
            .force(
              "link",
              d3
                .forceLink(dataLinks)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .id((d: any) => d.id)
                .distance(140)
                .strength(0.9),
            )
            .force("charge", d3.forceManyBody().strength(-180))
            .force(
              "collide",
              d3
                .forceCollide()
                .radius((d: { type: string }) =>
                  d.type === "center" ? 46 : 32,
                ),
            )
            .force(
              "radial",
              d3
                .forceRadial(
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (d: any) => (d.type === "center" ? 0 : ringRadius),
                  width / 2,
                  centerY,
                )
                .strength(0.9),
            )
            .force("center", d3.forceCenter(width / 2, centerY))
            .on("tick", () => {
              link
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .attr("x1", (d: any) => d.source.x)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .attr("y1", (d: any) => d.source.y)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .attr("x2", (d: any) => d.target.x)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .attr("y2", (d: any) => d.target.y);

              nodeGroup.attr(
                "transform",
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (d: any) => `translate(${d.x}, ${d.y})`,
              );
            });
        } catch (err) {
          console.error("Failed to render similar graph", err);
        }
      })();

      return () => {
        simulation?.stop?.();
        themeObserver?.disconnect();
      };
    }, [centerLabel, nodes]);

    return <svg ref={ref} className="w-full h-80" />;
  },
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function NeighborhoodForceGraph({
  name,
  properties,
}: {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties: any[];
}) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let simulation: any;
    let themeObserver: MutationObserver | null = null;
    (async () => {
      if (!ref.current) return;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const d3: any = await import("d3");

        const width = 560;
        const height = 380;
        const svg = d3.select(ref.current);
        svg.selectAll("*").remove();
        svg.attr("viewBox", `0 0 ${width} ${height}`);

        const hoodNode = {
          id: `hood:${name || "Neighborhood"}`,
          type: "hood",
          label: name || "Neighborhood",
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nodes = [
          hoodNode,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...properties.slice(0, 60).map((p: any) => ({
            id: `z:${p.zpid || p.id}`,
            type: "prop",
            label:
              p.streetAddress ||
              `${p.city || ""} ${p.state || ""}`.trim() ||
              `ZPID ${p.zpid || p.id}`,
            price: Number(p.price) || 0,
          })),
        ];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const links = properties.slice(0, 60).map((p: any) => ({
          source: hoodNode.id,
          target: `z:${p.zpid || p.id}`,
        }));

        const g = svg.append("g");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const zoomed = (event: any) => {
          g.attr("transform", event.transform);
        };
        svg.call(d3.zoom().scaleExtent([0.5, 4]).on("zoom", zoomed));

        const link = g
          .append("g")
          .attr(
            "stroke",
            document.documentElement.classList.contains("dark")
              ? "#475569"
              : "#cbd5e1",
          )
          .selectAll("line")
          .data(links)
          .join("line")
          .attr("stroke-width", 1.2);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const color = (d: any) => (d.type === "hood" ? "#0ea5e9" : "#10b981");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const radius = (d: any) =>
          d.type === "hood"
            ? 18
            : Math.max(4, Math.min(12, Math.sqrt((d.price || 0) / 100000)));

        const node = g
          .append("g")
          .selectAll("circle")
          .data(nodes)
          .join("circle")
          .attr("r", radius)
          .attr("fill", color)
          .attr("fill-opacity", 0.9)
          .call(
            d3
              .drag()
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .on("start", (event: any, d: any) => {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
              })
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .on("drag", (event: any, d: any) => {
                d.fx = event.x;
                d.fy = event.y;
              })
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .on("end", (event: any, d: any) => {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
              }),
          );

        const labels = g
          .append("g")
          .selectAll("text")
          .data(nodes)
          .join("text")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .attr("font-size", (d: any) => (d.type === "hood" ? 12 : 10))
          .attr(
            "fill",
            document.documentElement.classList.contains("dark")
              ? "#e5e7eb"
              : "#111827",
          )
          .attr("text-anchor", "middle")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .text((d: any) =>
            d.type === "hood" ? d.label : d.label?.slice(0, 18) || d.id,
          );

        const applyTheme = () => {
          const isDark = document.documentElement.classList.contains("dark");
          const labelColor = isDark ? "#e5e7eb" : "#111827";
          const linkColor = isDark ? "#475569" : "#cbd5e1";
          labels.attr("fill", labelColor);
          g.selectAll("g > line").attr("stroke", linkColor);
        };
        applyTheme();

        // Watch for theme changes and update colors
        themeObserver = new MutationObserver(() => applyTheme());
        themeObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["class"],
        });

        simulation = d3
          .forceSimulation(nodes)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .force(
            "link",
            d3
              .forceLink(links)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .id((d: any) => d.id)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .distance((l: any) => (l.target.type === "hood" ? 60 : 40)),
          )
          .force("charge", d3.forceManyBody().strength(-80))
          .force("center", d3.forceCenter(width / 2, height / 2))
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .force(
            "collision",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            d3.forceCollide().radius((d: any) => radius(d) + 4),
          )
          .on("tick", () => {
            link
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .attr("x1", (d: any) => d.source.x)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .attr("y1", (d: any) => d.source.y)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .attr("x2", (d: any) => d.target.x)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .attr("y2", (d: any) => d.target.y);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            node.attr("cx", (d: any) => d.x).attr("cy", (d: any) => d.y);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            labels
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .attr("x", (d: any) => d.x)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .attr("y", (d: any) => d.y + (d.type === "hood" ? -24 : 22));
          });
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err) {
        // d3 not installed; silently ignore
        if (ref.current) {
          ref.current.innerHTML = "";
        }
      }
    })();
    return () => {
      try {
        if (simulation) simulation.stop();
      } catch {}
      if (themeObserver) {
        try {
          themeObserver.disconnect();
        } catch {}
      }
    };
  }, [name, JSON.stringify((properties || []).slice(0, 60))]);

  return <svg ref={ref} className="w-full h-80" />;
}

function QuickPricePerSqft() {
  const [price, setPrice] = useState(600000);
  const [area, setArea] = useState(2000);
  const ppsf = useMemo(() => (area ? price / area : 0), [price, area]);
  return (
    <div className="flex flex-col gap-3 rounded border p-4">
      <div className="font-medium">Price per Sqft</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Price">
          <Input
            type="number"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
          />
        </Field>
        <Field label="Square Feet">
          <Input
            type="number"
            value={area}
            onChange={(e) => setArea(Number(e.target.value))}
          />
        </Field>
      </div>
      <div className="text-sm">
        Result:{" "}
        <span className="font-medium">
          {isFinite(ppsf) ? `$${ppsf.toFixed(2)}` : "N/A"}
        </span>{" "}
        / sqft
      </div>
    </div>
  );
}

function QuickDownPayment({
  price,
  downPct,
}: {
  price: number;
  downPct: number;
}) {
  const down = useMemo(() => price * (downPct / 100), [price, downPct]);
  return (
    <div className="flex flex-col gap-3 rounded border p-4">
      <div className="font-medium">Down Payment</div>
      <div className="text-sm">
        Given price {prettyMoney(price)} and {downPct}% down
      </div>
      <div className="text-base">
        Down Payment: <span className="font-semibold">{prettyMoney(down)}</span>
      </div>
    </div>
  );
}

function GetZpidDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect: (zpid: number | null, target?: "from" | "to" | "similar") => void;
}) {
  const [applyTo, setApplyTo] = useState<"from" | "to" | "similar">(
    // default to 'similar' if opened from that mode; otherwise 'from' (caller will override below via effect if needed)
    "from",
  );
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipcode, setZipcode] = useState("");
  const [beds, setBeds] = useState<number | undefined>(undefined);
  const [baths, setBaths] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [results, setResults] = useState<any[]>([]);

  async function onSearch() {
    if (
      !address &&
      !city &&
      !state &&
      !zipcode &&
      beds == null &&
      baths == null
    ) {
      toast.error("Enter at least one filter");
      return;
    }
    try {
      setLoading(true);
      const res = await lookupZpid({
        address,
        city,
        state,
        zipcode,
        beds,
        baths,
        limit: 10,
      });
      setResults(res.matches || []);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      toast.error(e.message || "Lookup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-background text-foreground max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Find ZPID</DialogTitle>
        </DialogHeader>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-3">
            <div className="flex-1">
              <div className="rounded-md border border-border/60 bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground flex items-start gap-2">
                  <Info className="w-4 h-4 mt-0.5" />
                  <div>
                    You can search with any single field or mix a few — no need
                    to fill everything.
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="px-2.5 py-1 rounded-full border border-border bg-background text-[11px] text-foreground/80 hover:bg-accent/50 transition-colors"
                    onClick={() => {
                      setAddress("123 Main St");
                    }}
                  >
                    Try: 123 Main St
                  </button>
                  <button
                    type="button"
                    className="px-2.5 py-1 rounded-full border border-border bg-background text-[11px] text-foreground/80 hover:bg-accent/50 transition-colors"
                    onClick={() => {
                      setCity("Chapel Hill");
                      setState("NC");
                    }}
                  >
                    Try: Chapel Hill, NC
                  </button>
                  <button
                    type="button"
                    className="px-2.5 py-1 rounded-full border border-border bg-background text-[11px] text-foreground/80 hover:bg-accent/50 transition-colors"
                    onClick={() => {
                      setZipcode("27514");
                    }}
                  >
                    Try: 27514
                  </button>
                  <button
                    type="button"
                    className="px-2.5 py-1 rounded-full border border-border bg-background text-[11px] text-foreground/80 hover:bg-accent/50 transition-colors"
                    onClick={() => {
                      setBeds(3);
                      setBaths(2);
                    }}
                  >
                    Try: 3 bd / 2 ba
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Apply to</span>
              <div className="flex overflow-hidden rounded-md border border-border bg-muted/20">
                {(["from", "to", "similar"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setApplyTo(k)}
                    className={`px-3 py-1.5 transition-colors outline-hidden focus-visible:ring-1 ring-border ${applyTo === k ? "bg-accent text-accent-foreground" : "bg-transparent text-muted-foreground hover:bg-muted/40"}`}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Street Address">
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !loading) {
                    onSearch();
                  }
                }}
                placeholder="123 Main St"
              />
            </Field>
            <Field label="City">
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !loading) {
                    onSearch();
                  }
                }}
                placeholder="e.g., Chapel Hill"
              />
            </Field>
            <Field label="State">
              <Input
                value={state}
                onChange={(e) => setState(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !loading) {
                    onSearch();
                  }
                }}
                placeholder="e.g., NC"
              />
            </Field>
            <Field label="ZIP">
              <Input
                value={zipcode}
                onChange={(e) => setZipcode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !loading) {
                    onSearch();
                  }
                }}
                placeholder="27514"
              />
            </Field>
            <Field label="Beds">
              <Input
                type="number"
                placeholder="e.g., 3"
                value={beds ?? ""}
                onChange={(e) =>
                  setBeds(e.target.value ? Number(e.target.value) : undefined)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !loading) {
                    onSearch();
                  }
                }}
              />
            </Field>
            <Field label="Baths">
              <Input
                type="number"
                placeholder="e.g., 2"
                value={baths ?? ""}
                onChange={(e) =>
                  setBaths(e.target.value ? Number(e.target.value) : undefined)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !loading) {
                    onSearch();
                  }
                }}
              />
            </Field>
          </div>
          {/* subtle spacing below the fields; callout above already gives the hint */}
          <div className="flex justify-end mt-3">
            <Button
              onClick={onSearch}
              disabled={loading}
              className="cursor-pointer"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-border border-t-transparent animate-spin" />{" "}
                  Searching…
                </span>
              ) : (
                "Search"
              )}
            </Button>
          </div>
        </div>
        <div className="mt-4 max-h-[45vh] overflow-auto space-y-2">
          {!results.length ? (
            <div className="text-sm text-muted-foreground border border-border rounded-md p-4 bg-muted/20">
              No results yet. Enter details above and click Search.
            </div>
          ) : (
            <ul className="space-y-2">
              {results.map((r, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 hover:bg-accent/40 transition-colors"
                >
                  <div className="text-sm leading-tight">
                    <div className="font-medium">
                      {r.streetAddress || "Property"}
                      {r.city ? `, ${r.city}` : ""}
                      {r.state ? `, ${r.state}` : ""} {r.zipcode || ""}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      ZPID: {r.zpid} • {r.bedrooms ?? "?"} bd •{" "}
                      {r.bathrooms ?? "?"} ba • {r.livingArea ?? "?"} sqft
                      {r.price ? ` • ${prettyMoney(r.price)}` : ""}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => onSelect(Number(r.zpid), applyTo)}
                  >
                    Use
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
