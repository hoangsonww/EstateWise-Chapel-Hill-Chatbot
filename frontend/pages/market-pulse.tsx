"use client";

import React, { useMemo, useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  ShieldAlert,
  Users,
  Compass,
  Loader2,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  MapPin,
  ChevronLeft,
  Calculator,
} from "lucide-react";

import { trpc } from "@/lib/trpc";
import type { MarketSnapshot } from "@/server/api/routers/insights";
import { DarkModeToggle } from "@/components/dark-mode-toggle";

function prettyMoney(n?: number | null) {
  if (n == null || Number.isNaN(Number(n))) return "N/A";
  return Number(n).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-sm text-muted-foreground">{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

const ACTION_IMPACT_BADGE: Record<"low" | "medium" | "high", string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  high: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
};

const SUPPORTED_MARKETS = [
  "Atlanta, GA",
  "Austin, TX",
  "Boston, MA",
  "Boise, ID",
  "Baltimore, MD",
  "Chapel Hill, NC",
  "Charlotte, NC",
  "Chicago, IL",
  "Columbus, OH",
  "Cincinnati, OH",
  "Cleveland, OH",
  "Dallas-Fort Worth, TX",
  "Denver, CO",
  "Detroit, MI",
  "Durham, NC",
  "Houston, TX",
  "Kansas City, MO",
  "Las Vegas, NV",
  "Los Angeles, CA",
  "Miami, FL",
  "Minneapolis-St. Paul, MN",
  "Nashville, TN",
  "New York, NY",
  "New Orleans, LA",
  "Orlando, FL",
  "Philadelphia, PA",
  "Phoenix, AZ",
  "Portland, OR",
  "Providence, RI",
  "Raleigh, NC",
  "Richmond, VA",
  "Riverside, CA",
  "Sacramento, CA",
  "Salt Lake City, UT",
  "San Jose, CA",
  "San Antonio, TX",
  "San Diego, CA",
  "San Francisco, CA",
  "Seattle, WA",
  "St. Louis, MO",
  "Tampa, FL",
  "Virginia Beach, VA",
  "Washington, DC",
  "Milwaukee, WI",
  "Indianapolis, IN",
];

type TimelinePoint = MarketSnapshot["timeline"][number];
type HotZipPoint = MarketSnapshot["topZips"][number];
type ActionItem = MarketSnapshot["recommendedActions"][number];

export default function MarketPulsePage() {
  const [query, setQuery] = useState("Austin, TX");
  const [submittedQuery, setSubmittedQuery] = useState("Austin, TX");
  const [mounted, setMounted] = useState(false);
  const [marketsOpen, setMarketsOpen] = useState(false);
  const [marketFilter, setMarketFilter] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!marketsOpen) {
      setMarketFilter("");
    }
  }, [marketsOpen]);

  const marketSnapshotQuery = trpc.insights.marketSnapshot.useQuery(
    { query: submittedQuery },
    {
      placeholderData: (previous) => previous,
      refetchOnWindowFocus: false,
    },
  );

  const snapshot = marketSnapshotQuery.data;

  const filteredMarkets = useMemo(() => {
    const term = marketFilter.trim().toLowerCase();
    if (!term) return SUPPORTED_MARKETS;
    return SUPPORTED_MARKETS.filter((market) =>
      market.toLowerCase().includes(term),
    );
  }, [marketFilter]);

  const scoreItems = useMemo(() => {
    if (!snapshot) return [];
    const { scorecard } = snapshot;

    const describe = (
      key: "buyingWindow" | "rentalDemand" | "competition" | "risk",
      value: number,
    ) => {
      if (key === "buyingWindow") {
        if (value >= 70) return "Lean inventory with motivated sellers.";
        if (value >= 50) return "Balanced leverage between buyers and sellers.";
        return "Expect longer negotiations to uncover concessions.";
      }
      if (key === "rentalDemand") {
        if (value >= 75)
          return "Absorption is strong - favorable for landlords.";
        if (value >= 55)
          return "Stable renter pool with steady leasing velocity.";
        return "Monitor leasing time; demand is softening.";
      }
      if (key === "competition") {
        if (value >= 70) return "Act quickly - multiple offers likely.";
        if (value >= 50) return "Competition is manageable with solid terms.";
        return "Use slower bidding tempo to negotiate repairs or credits.";
      }
      if (value >= 60)
        return "Elevated risk profile - build extra contingencies.";
      if (value >= 40) return "Watch insurance, taxes, and financing friction.";
      return "Risk pressure is mild - standard reserves should suffice.";
    };

    return [
      {
        key: "buyingWindow" as const,
        label: "Buyer leverage",
        value: scorecard.buyingWindow,
        icon: Compass,
        accentClass: "bg-emerald-500/10 text-emerald-500",
        barClass: "bg-emerald-500",
        description: describe("buyingWindow", scorecard.buyingWindow),
      },
      {
        key: "rentalDemand" as const,
        label: "Rental demand",
        value: scorecard.rentalDemand,
        icon: TrendingUp,
        accentClass: "bg-sky-500/10 text-sky-500",
        barClass: "bg-sky-500",
        description: describe("rentalDemand", scorecard.rentalDemand),
      },
      {
        key: "competition" as const,
        label: "Buyer competition",
        value: scorecard.competition,
        icon: Users,
        accentClass: "bg-indigo-500/10 text-indigo-500",
        barClass: "bg-indigo-500",
        description: describe("competition", scorecard.competition),
      },
      {
        key: "risk" as const,
        label: "Risk pressure",
        value: scorecard.risk,
        icon: ShieldAlert,
        accentClass: "bg-rose-500/10 text-rose-500",
        barClass: "bg-rose-500",
        description: describe("risk", scorecard.risk),
      },
    ];
  }, [snapshot]);

  const maxDemandIndex = useMemo(() => {
    if (!snapshot || snapshot.timeline.length === 0) return 100;
    const indices = snapshot.timeline.map(
      ({ demandIndex }: TimelinePoint) => demandIndex,
    );
    return Math.max(...indices);
  }, [snapshot]);

  const absorptionSummary = useMemo(() => {
    if (!snapshot || snapshot.absorptionTrend.length === 0) return "";
    const last = snapshot.absorptionTrend[snapshot.absorptionTrend.length - 1];
    if (!last) return "";
    if (last.delta > 1) {
      return `Absorption improving (+${last.delta.toFixed(1)} pts vs prior month).`;
    }
    if (last.delta < -1) {
      return `Absorption softening (${Math.abs(last.delta).toFixed(1)} pts slower than prior month).`;
    }
    return "Absorption stable compared with last month.";
  }, [snapshot]);

  const trimmedQuery = query.trim();
  const normalizedSubmitted = submittedQuery.trim().toLowerCase();
  const activeLabel = snapshot?.marketLabel ?? "";
  const datasetMatchesSearch = snapshot
    ? activeLabel.toLowerCase() === normalizedSubmitted
    : true;
  const showingFallbackDataset = Boolean(snapshot && !datasetMatchesSearch);
  const showingBaseline = snapshot?.datasetId === "national-baseline";

  const handleScan = () => {
    if (trimmedQuery.length <= 1) {
      toast.error("Enter at least two characters to scan a market.");
      return;
    }
    setSubmittedQuery(trimmedQuery);
  };

  return (
    <>
      <Head>
        <title>Market Pulse Scanner | EstateWise</title>
        <meta
          name="description"
          content="Scan curated real-estate demand, risk, and opportunity signals via tRPC."
        />
      </Head>
      <div className="min-h-screen bg-background text-foreground">
        <Dialog open={marketsOpen} onOpenChange={setMarketsOpen}>
          <DialogContent className="max-w-3xl dark:[&_[data-slot=dialog-close]]:text-white">
            <DialogHeader>
              <DialogTitle className="text-foreground dark:text-white">
                Supported markets
              </DialogTitle>
              <DialogDescription>
                Scan by city + state. We match the closest curated dataset.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Input
                  value={marketFilter}
                  onChange={(event) => setMarketFilter(event.target.value)}
                  placeholder="Filter by city or state"
                  className="sm:max-w-xs text-foreground dark:text-white"
                />
                <div className="text-xs text-muted-foreground">
                  {filteredMarkets.length} markets available
                </div>
              </div>
              <div className="max-h-[50vh] overflow-auto pr-1">
                {filteredMarkets.length === 0 ? (
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
                    No matches yet. Try a broader search like "Texas" or "NC".
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredMarkets.map((market) => (
                      <button
                        key={market}
                        type="button"
                        onClick={() => {
                          setQuery(market);
                          setSubmittedQuery(market);
                          setMarketsOpen(false);
                        }}
                        className="inline-flex items-center justify-center rounded-full border border-border/60 bg-muted/40 px-3 py-1.5 text-sm text-foreground shadow-sm transition-colors hover:bg-muted/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
                      >
                        {market}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
                Tip: You can also search by county or metro nickname (e.g.
                "Philly", "Twin Cities", "DFW").
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <header className="border-b border-border bg-background/90 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:h-16 sm:px-6">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-6 w-6 text-primary" />
              <div className="sm:hidden">
                <h1 className="text-lg font-semibold">Market Pulse Scanner</h1>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold">Market Pulse Scanner</h1>
                <p className="text-xs text-muted-foreground">
                  Powered by tRPC & gRPC for instant metro insights.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    asChild
                    className="sm:hidden"
                  >
                    <Link href="/insights" aria-label="Back to Insights">
                      <ChevronLeft className="h-5 w-5" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Back to Insights</TooltipContent>
              </Tooltip>
              <Button variant="ghost" asChild className="hidden sm:flex">
                <Link
                  href="/insights"
                  className="flex items-center gap-1 text-sm"
                >
                  <ChevronLeft className="h-5 w-5" /> Back to Insights
                </Link>
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    asChild
                    className="h-7 w-7"
                  >
                    <Link href="/analyzer" aria-label="Deal Analyzer">
                      <Calculator className="size-5" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Deal Analyzer</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <DarkModeToggle />
                  </span>
                </TooltipTrigger>
                <TooltipContent>Toggle theme</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
          <Card className="transition-opacity duration-1000 ease-out">
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <TrendingUp className="h-5 w-5 text-primary" /> Run a metro
                  scan
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMarketsOpen(true)}
                >
                  View {SUPPORTED_MARKETS.length} supported cities
                </Button>
              </div>
              <CardDescription>
                Search by metro or market label. We surface the closest curated
                dataset when an exact match is unavailable.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <Field
                label="Metro or market"
                hint="Examples: Austin, TX • Charlotte, NC • Phoenix, AZ"
              >
                <Input
                  value={query}
                  placeholder="e.g. Chapel Hill, NC"
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleScan();
                  }}
                />
              </Field>
              <div className="flex items-center gap-2 sm:mt-6">
                <Button
                  onClick={handleScan}
                  disabled={marketSnapshotQuery.isFetching}
                >
                  {marketSnapshotQuery.isFetching ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Run scan
                </Button>
              </div>
            </CardContent>
          </Card>

          {marketSnapshotQuery.error ? (
            <Card className="border-destructive/40 bg-destructive/10">
              <CardContent className="py-4 text-sm text-destructive">
                {marketSnapshotQuery.error.message}
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-4">
              <Card className="transition-opacity duration-1000 ease-out">
                <CardHeader>
                  <CardDescription className="text-xs uppercase tracking-wide">
                    {snapshot ? "Active market" : "Awaiting scan"}
                  </CardDescription>
                  <CardTitle className="text-xl font-semibold">
                    {snapshot?.marketLabel ?? "Start by running a scan"}
                  </CardTitle>
                  {snapshot?.datasetVersion ? (
                    <p className="text-xs text-muted-foreground">
                      Dataset {snapshot.datasetVersion}
                    </p>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <p>
                    {snapshot?.summary ??
                      "Use the scanner to benchmark demand, competition, and risk before diving into deeper analysis."}
                  </p>
                  {snapshot ? (
                    <dl className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <dt className="text-xs uppercase tracking-wide">
                          Median list price
                        </dt>
                        <dd className="text-base font-semibold text-foreground">
                          {prettyMoney(snapshot.metrics.medianListPrice)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide">
                          YoY price change
                        </dt>
                        <dd className="text-base font-semibold text-foreground">
                          {snapshot.metrics.yoyPriceChange.toFixed(1)}%
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide">
                          Months of inventory
                        </dt>
                        <dd className="text-base font-semibold text-foreground">
                          {snapshot.metrics.inventoryMonths.toFixed(1)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide">
                          Rent yield
                        </dt>
                        <dd className="text-base font-semibold text-foreground">
                          {snapshot.metrics.rentYield.toFixed(1)}%
                        </dd>
                      </div>
                    </dl>
                  ) : null}
                </CardContent>
              </Card>

              {snapshot ? (
                <>
                  {showingFallbackDataset || showingBaseline ? (
                    <Card className="border-dashed border-primary/40 bg-primary/5">
                      <CardContent className="space-y-2 py-4 text-sm">
                        <p className="font-medium text-foreground">
                          Limited coverage notice
                        </p>
                        {!datasetMatchesSearch ? (
                          <p className="text-muted-foreground">
                            We do not yet have a direct dataset for{" "}
                            <span className="font-semibold">
                              {submittedQuery}
                            </span>
                            . Showing the closest curated metro: {activeLabel}.
                          </p>
                        ) : null}
                        {showingBaseline ? (
                          <p className="text-muted-foreground">
                            You are viewing the national composite benchmark
                            until a market-specific data set is curated.
                          </p>
                        ) : null}
                      </CardContent>
                    </Card>
                  ) : null}

                  <Card className="transition-opacity duration-1000 ease-out">
                    <CardHeader>
                      <CardTitle className="text-lg">Scorecard</CardTitle>
                      <CardDescription>
                        Gauges combine supply, demand, rent economics, and risk
                        pressure.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3 sm:grid-cols-2">
                      {scoreItems.map((item, index) => (
                        <div
                          key={item.key}
                          className="rounded-lg border border-border/60 bg-background p-4 shadow-sm transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-0.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-2 text-sm font-medium">
                              <span
                                className={`flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 ${item.accentClass}`}
                              >
                                <item.icon className="h-4 w-4" />
                              </span>
                              <span className="break-words">{item.label}</span>
                            </span>
                            <span className="text-sm font-semibold flex-shrink-0">
                              {item.value}
                            </span>
                          </div>
                          <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${item.barClass} transition-all duration-[1500ms] ease-out`}
                              style={{
                                width: mounted
                                  ? `${Math.max(8, item.value)}%`
                                  : "0%",
                                transitionDelay: `${200 + index * 100}ms`,
                              }}
                            />
                          </div>
                          <p className="mt-2 text-xs sm:text-sm text-muted-foreground line-clamp-3">
                            {item.description}
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="transition-opacity duration-1000 ease-out">
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Demand trajectory
                      </CardTitle>
                      {absorptionSummary ? (
                        <CardDescription>{absorptionSummary}</CardDescription>
                      ) : null}
                    </CardHeader>
                    <CardContent className="overflow-hidden">
                      <div className="flex items-end gap-[1px]">
                        {snapshot.timeline.map(
                          (point: TimelinePoint, index: number) => {
                            const barHeight = Math.max(
                              12,
                              Math.round(
                                (point.demandIndex / maxDemandIndex) * 100,
                              ),
                            );
                            return (
                              <div
                                key={point.month}
                                className="flex-1 min-w-0 text-muted-foreground"
                              >
                                <div className="flex flex-col items-center">
                                  <span className="text-[10px] sm:text-xs font-semibold text-foreground">
                                    {point.demandIndex}
                                  </span>
                                  <div className="relative h-16 sm:h-24 w-full overflow-hidden rounded-sm bg-primary/10">
                                    <div
                                      className="absolute bottom-0 left-0 right-0 bg-primary transition-all duration-[2000ms] ease-out"
                                      style={{
                                        height: mounted
                                          ? `${barHeight}%`
                                          : "0%",
                                        transitionDelay: `${300 + index * 80}ms`,
                                        transformOrigin: "bottom",
                                      }}
                                    />
                                  </div>
                                  <span className="text-[9px] sm:text-[11px] mt-0.5 text-center font-medium">
                                    {point.month}
                                  </span>
                                  <span className="text-[9px] sm:text-[10px] text-center">
                                    Abs: {point.absorptionRate}%
                                  </span>
                                </div>
                              </div>
                            );
                          },
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card className="border-dashed border-primary/40 bg-primary/5">
                  <CardContent className="py-6 text-sm text-muted-foreground">
                    Run your first scan to unlock scorecards, demand trajectory,
                    and ZIP-level callouts.
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-4">
              {snapshot ? (
                <>
                  <Card className="transition-opacity duration-1000 ease-out">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                        <TrendingUp className="h-4 w-4 text-primary" />{" "}
                        Opportunity radar
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        {snapshot.opportunities.map(
                          (item: string, index: number) => (
                            <li key={index} className="flex gap-3">
                              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                              <span className="break-words">{item}</span>
                            </li>
                          ),
                        )}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="transition-opacity duration-1000 ease-out">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />{" "}
                        Risk watchlist
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        {snapshot.risks.map((item: string, index: number) => (
                          <li key={index} className="flex gap-3">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                            <span className="break-words">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="transition-opacity duration-1000 ease-out">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                        <ShieldAlert className="h-4 w-4 text-emerald-500" />{" "}
                        Next best actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3 text-sm text-muted-foreground">
                        {snapshot.recommendedActions.map(
                          (action: ActionItem, index: number) => {
                            const impactKey =
                              action.impact as keyof typeof ACTION_IMPACT_BADGE;
                            return (
                              <li
                                key={index}
                                className="space-y-1 rounded-md border border-dashed border-border p-3"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs uppercase tracking-wide">
                                  <span className="font-semibold text-foreground break-words">
                                    {action.label}
                                  </span>
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold inline-block ${ACTION_IMPACT_BADGE[impactKey]}`}
                                  >
                                    {action.impact} impact
                                  </span>
                                </div>
                                <p className="break-words">
                                  {action.description}
                                </p>
                              </li>
                            );
                          },
                        )}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="transition-opacity duration-1000 ease-out">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                        <Users className="h-4 w-4 text-primary" /> Hot ZIP
                        pockets
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        {snapshot.topZips.map(
                          // eslint-disable-next-line @typescript-eslint/no-unused-vars
                          (zip: HotZipPoint, index: number) => (
                            <li
                              key={zip.name}
                              className="rounded-md border border-border/60 p-3 shadow-sm"
                            >
                              <div className="flex items-center justify-between gap-2 text-sm text-foreground">
                                <span className="font-medium break-words">
                                  {zip.name}
                                </span>
                                <span className="flex-shrink-0">
                                  {zip.yoy > 0 ? "+" : ""}
                                  {zip.yoy.toFixed(1)}% YoY
                                </span>
                              </div>
                              <div className="mt-1 flex flex-col sm:flex-row sm:gap-3 text-sm">
                                <span>{prettyMoney(zip.medianPrice)}</span>
                                <span>
                                  Rent yield {zip.rentYield.toFixed(1)}%
                                </span>
                              </div>
                            </li>
                          ),
                        )}
                      </ul>
                    </CardContent>
                  </Card>
                </>
              ) : null}
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-border/60 text-xs text-muted-foreground text-center">
            By using EstateWise, you agree to our{" "}
            <Link
              href="/terms"
              className="font-medium text-foreground/80 hover:text-primary transition-colors"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="font-medium text-foreground/80 hover:text-primary transition-colors"
            >
              Privacy Policy
            </Link>
            .
          </div>
        </main>
      </div>
    </>
  );
}
