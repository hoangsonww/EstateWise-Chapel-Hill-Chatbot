"use client";

import React, { useEffect, useMemo, useState } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  Gavel,
  GitBranch,
  Lightbulb,
  MapPin,
  MessageCircleMore,
  Radar,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";

import { DarkModeToggle } from "@/components/dark-mode-toggle";

type Stage =
  | "Council Vote"
  | "Public Hearing"
  | "Planning Commission"
  | "Concept Review";

type SignalType =
  | "Zoning & Land Use"
  | "Infrastructure"
  | "Community Incentive"
  | "Institutional Expansion";

type Milestone = {
  label: string;
  date: string; // ISO date
  owner: string;
};

type CivicSignal = {
  id: string;
  title: string;
  type: SignalType;
  stage: Stage;
  decisionDate: string;
  location: string;
  summary: string;
  focusTheme: string;
  heat: "Watch" | "Elevated" | "Act";
  momentum: "Accelerating" | "Holding" | "Slowing";
  sentiment: number; // 0-1
  communitySignals: string;
  opportunities: string[];
  watchouts: string[];
  activationMoves: string[];
  stats: {
    housingUnits: number;
    jobs: number;
    publicInvestment: number; // millions
    carbonReduction: number; // percent
  };
  partners: string[];
  milestones: Milestone[];
};

const civicSignals: CivicSignal[] = [
  {
    id: "innovation-hub",
    title: "Blue Ridge Innovation Hub Rezoning",
    type: "Zoning & Land Use",
    stage: "Council Vote",
    decisionDate: "2024-07-18",
    location: "Downtown West",
    summary:
      "220,000 sq ft mixed-use rezoning with research labs, 210 residential units, and a public plaza tied to Chapel Hill Transit upgrades.",
    focusTheme: "Innovation district expansion",
    heat: "Act",
    momentum: "Accelerating",
    sentiment: 0.68,
    communitySignals:
      "Local entrepreneurs and UNC innovation office are strongly supportive; two neighborhood associations are neutral after design concessions.",
    opportunities: [
      "Secure advanced option agreements on adjacent parcels anticipating 18% rent premium for lab-ready flex space.",
      "Bundle affordable housing commitments with state R&D grant applications to unlock stacked incentives.",
      "Co-market the plaza activation plan with anchor tenants to build goodwill before the vote.",
    ],
    watchouts: [
      "Historic district advocates want a stepback above the third floor – prepare alternate massing visuals.",
      "Transit agency expects last-mile mobility contributions in the development agreement.",
    ],
    activationMoves: [
      "Schedule investor listening session within 5 days to align capital stack with public benefits narrative.",
      "Draft community update email recapping traffic study mitigations with visuals.",
      "Coordinate letter of support from local biotech coalition before July 12 pre-vote briefing.",
    ],
    stats: {
      housingUnits: 210,
      jobs: 340,
      publicInvestment: 42,
      carbonReduction: 14,
    },
    partners: [
      "UNC Innovate",
      "Downtown Partnership",
      "Chamber of Commerce",
    ],
    milestones: [
      {
        label: "Design review work session",
        date: "2024-07-05",
        owner: "Planning Dept.",
      },
      {
        label: "Mobility agreement briefing",
        date: "2024-07-12",
        owner: "Transit Board",
      },
      {
        label: "Council decision",
        date: "2024-07-18",
        owner: "Town Council",
      },
    ],
  },
  {
    id: "greenway-grid",
    title: "Riverbend Resilience Greenway Grid",
    type: "Infrastructure",
    stage: "Planning Commission",
    decisionDate: "2024-08-08",
    location: "Lower Booker Creek",
    summary:
      "Multi-phase greenway expansion linking three flood-prone neighborhoods with bioswale retrofits and micro-mobility corridors.",
    focusTheme: "Climate resilience",
    heat: "Elevated",
    momentum: "Holding",
    sentiment: 0.61,
    communitySignals:
      "HOA feedback is trending positive after maintenance costs were addressed; climate coalition wants faster timeline on phase 2.",
    opportunities: [
      "Bundle adjacent vacant parcels into a resilience improvement district for layered financing.",
      "Pitch trail-adjacent townhome concept leveraging improved flood insurance scores.",
      "Offer pro-bono visualization of bioswale performance to bolster planning testimony.",
    ],
    watchouts: [
      "Stormwater board flagged need for private easements on parcels 14B and 14C.",
      "Construction sequencing overlaps with UNC move-in; coordinate traffic plans early.",
    ],
    activationMoves: [
      "Deploy community walk audit with residents to capture qualitative benefits for commission packet.",
      "Refresh insurance premium savings model to quantify owner upside.",
      "Engage micro-mobility operator about pilot stations along phase 1 segment.",
    ],
    stats: {
      housingUnits: 48,
      jobs: 120,
      publicInvestment: 18,
      carbonReduction: 22,
    },
    partners: ["Booker Creek Alliance", "UNC Sustainability", "Greenways NC"],
    milestones: [
      {
        label: "Flood modeling release",
        date: "2024-07-09",
        owner: "Stormwater Board",
      },
      {
        label: "Planning commission recommendation",
        date: "2024-07-25",
        owner: "Planning Commission",
      },
      {
        label: "Capital plan alignment",
        date: "2024-08-08",
        owner: "Town Council",
      },
    ],
  },
  {
    id: "talent-catalyst",
    title: "Talent Catalyst Housing Incentive",
    type: "Community Incentive",
    stage: "Public Hearing",
    decisionDate: "2024-07-31",
    location: "Town-wide",
    summary:
      "$12M revolving fund to pair employer housing stipends with missing-middle infill, targeting university and hospital staff retention.",
    focusTheme: "Housing affordability",
    heat: "Elevated",
    momentum: "Accelerating",
    sentiment: 0.72,
    communitySignals:
      "Hospital leadership pushing for swift adoption; a fiscal watchdog group wants clearer ROI metrics.",
    opportunities: [
      "Package employer commitments into shared equity pools to reduce upfront capital needs.",
      "Launch pilot ADU partnership with local builders to showcase timeline certainty.",
      "Align marketing with Chamber workforce study to ground the narrative in job retention.",
    ],
    watchouts: [
      "Need a transparent selection rubric to keep program politics-free.",
      "Finance committee will scrutinize default protections on revolving fund capital.",
    ],
    activationMoves: [
      "Draft one-page ROI explainer using hospital retention scenarios.",
      "Recruit two ADU builders for testimony on construction velocity.",
      "Coordinate employer roundtable summary to submit as public comment packet.",
    ],
    stats: {
      housingUnits: 160,
      jobs: 410,
      publicInvestment: 12,
      carbonReduction: 6,
    },
    partners: [
      "UNC Health",
      "Chapel Hill-Carrboro Chamber",
      "Triangle Workforce Alliance",
    ],
    milestones: [
      {
        label: "Program design clinic",
        date: "2024-07-11",
        owner: "Housing Advisory Board",
      },
      {
        label: "Public hearing",
        date: "2024-07-31",
        owner: "Town Council",
      },
      {
        label: "Fund launch announcement",
        date: "2024-08-15",
        owner: "Economic Development",
      },
    ],
  },
  {
    id: "campus-research",
    title: "Carolina Biofabrication Expansion",
    type: "Institutional Expansion",
    stage: "Concept Review",
    decisionDate: "2024-09-04",
    location: "Mason Farm Innovation Corridor",
    summary:
      "UNC-affiliated biofabrication campus expansion adding wet labs, clean rooms, and talent accelerator space.",
    focusTheme: "Institutional growth",
    heat: "Watch",
    momentum: "Holding",
    sentiment: 0.58,
    communitySignals:
      "Residents nearby want assurances on traffic calming; research partners lobbying for faster approvals.",
    opportunities: [
      "Position flex industrial land near I-40 for suppliers needing proximity to new labs.",
      "Explore naming rights partnership to fund streetscape and shuttle enhancements.",
      "Seed innovation district storytelling with student talent pipeline metrics.",
    ],
    watchouts: [
      "Utility upgrades may require cost-sharing; monitor Duke Energy coordination.",
      "Neighborhood wants night-time delivery limits baked into conditions.",
    ],
    activationMoves: [
      "Commission micro-simulation of traffic calming concepts to preempt concerns.",
      "Identify workforce training grants that match the accelerator component.",
      "Host corridor walking tour for council members prior to concept review.",
    ],
    stats: {
      housingUnits: 0,
      jobs: 520,
      publicInvestment: 28,
      carbonReduction: 11,
    },
    partners: ["UNC Research", "BioLabs NC", "Innovation Carolina"],
    milestones: [
      {
        label: "Utility coordination workshop",
        date: "2024-07-22",
        owner: "Facilities & Utilities",
      },
      {
        label: "Neighborhood design charrette",
        date: "2024-08-06",
        owner: "UNC Planning",
      },
      {
        label: "Concept review",
        date: "2024-09-04",
        owner: "Town Council",
      },
    ],
  },
];

const scenarioProfiles = {
  infillDeveloper: {
    label: "Infill Developer",
    description:
      "Prioritize entitlements, land options, and neighborhood goodwill to keep vertical delivery on schedule.",
    moves: [
      "Lock contingent land contracts within 10 days for parcels touching the innovation hub vote.",
      "Bundle flood-resilient townhome prototypes into the Riverbend commission packet.",
      "Stage community-ready renderings highlighting ground-floor activation benefits.",
    ],
    signalFocus: ["innovation-hub", "greenway-grid"],
  },
  assetManager: {
    label: "Portfolio Asset Manager",
    description:
      "Stabilize NOI by anticipating regulatory shifts and aligning capital improvements with incentives.",
    moves: [
      "Reforecast rent growth adjacent to the innovation corridor with conservative absorption assumptions.",
      "Create capital plan addendum leveraging resilience district credits from Riverbend.",
      "Schedule policy briefing for leasing teams on the Talent Catalyst stipend rules.",
    ],
    signalFocus: ["talent-catalyst", "greenway-grid"],
  },
  civicPartner: {
    label: "Civic & Institutional Partner",
    description:
      "Coordinate stakeholders, narrative, and accountability to accelerate inclusive growth.",
    moves: [
      "Draft joint op-ed outlining workforce housing commitments ahead of the stipend vote.",
      "Align campus shuttle redesign with greenway micro-mobility pilots.",
      "Launch rapid feedback survey capturing resident sentiment post-charrette.",
    ],
    signalFocus: ["talent-catalyst", "campus-research"],
  },
};

type ScenarioKey = keyof typeof scenarioProfiles;

const heatStyles: Record<CivicSignal["heat"], string> = {
  Watch: "bg-muted text-muted-foreground border-border",
  Elevated: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/20",
  Act: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

function daysUntil(date: string) {
  const now = new Date();
  const target = new Date(date);
  const diff = target.getTime() - now.getTime();
  return Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)), 0);
}

function percentToLabel(value: number) {
  if (value >= 0.75) return "High support";
  if (value >= 0.5) return "Moderate momentum";
  if (value >= 0.3) return "Divided";
  return "Headwinds";
}

export default function PolicyRadarPage() {
  const [typeFilter, setTypeFilter] = useState<SignalType | "all">("all");
  const [stageFilter, setStageFilter] = useState<Stage | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedId, setSelectedId] = useState<string>(
    civicSignals[0]?.id ?? "",
  );
  const [scenario, setScenario] = useState<ScenarioKey>("infillDeveloper");

  const typeOptions = useMemo(
    () => ["all", ...new Set(civicSignals.map((signal) => signal.type))],
    [],
  );

  const stageOptions = useMemo(
    () => ["all", ...new Set(civicSignals.map((signal) => signal.stage))],
    [],
  );

  const filteredSignals = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return civicSignals.filter((signal) => {
      const matchesType = typeFilter === "all" || signal.type === typeFilter;
      const matchesStage = stageFilter === "all" || signal.stage === stageFilter;
      const haystack = [
        signal.title,
        signal.location,
        signal.summary,
        signal.focusTheme,
      ]
        .join(" ")
        .toLowerCase();
      const matchesSearch = query.length === 0 || haystack.includes(query);
      return matchesType && matchesStage && matchesSearch;
    });
  }, [searchTerm, stageFilter, typeFilter]);

  useEffect(() => {
    if (filteredSignals.length === 0) return;
    const stillVisible = filteredSignals.some((signal) => signal.id === selectedId);
    if (!stillVisible) {
      setSelectedId(filteredSignals[0]?.id ?? selectedId);
    }
  }, [filteredSignals, selectedId]);

  const selectedSignal = useMemo(() => {
    return (
      civicSignals.find((signal) => signal.id === selectedId) ??
      filteredSignals[0] ??
      civicSignals[0] ??
      null
    );
  }, [filteredSignals, selectedId]);

  const aggregated = useMemo(() => {
    return civicSignals.reduce(
      (acc, signal) => {
        acc.housing += signal.stats.housingUnits;
        acc.jobs += signal.stats.jobs;
        acc.investment += signal.stats.publicInvestment;
        acc.carbon += signal.stats.carbonReduction;
        acc.hotSignals += signal.heat === "Act" ? 1 : 0;
        const days = daysUntil(signal.decisionDate);
        if (days < acc.nextDecisionDays) {
          acc.nextDecisionDays = days;
          acc.nextDecisionLabel = signal.title;
        }
        return acc;
      },
      {
        housing: 0,
        jobs: 0,
        investment: 0,
        carbon: 0,
        hotSignals: 0,
        nextDecisionDays: Infinity,
        nextDecisionLabel: "",
      },
    );
  }, []);

  const calendarEvents = useMemo(() => {
    return civicSignals
      .flatMap((signal) =>
        signal.milestones.map((milestone) => ({
          signalId: signal.id,
          signalTitle: signal.title,
          ...milestone,
        })),
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, []);

  const scenarioDetail = scenarioProfiles[scenario];

  return (
    <>
      <Head>
        <title>Policy Radar | EstateWise</title>
        <meta
          name="description"
          content="Track civic decisions, incentives, and institutional moves that change Chapel Hill real estate math before they happen."
        />
      </Head>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <header className="sticky top-0 z-30 w-full backdrop-blur-lg bg-background/90 border-b border-border">
          <div className="max-w-7xl mx-auto h-16 px-6 flex items-center gap-4 overflow-x-auto whitespace-nowrap">
            <div className="flex items-center gap-2">
              <Radar className="w-6 h-6 text-primary" />
              <span className="font-extrabold tracking-tight text-lg">
                Policy Radar
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
                    href="/insights"
                    className="hover:text-primary"
                    aria-label="Insights"
                  >
                    <GitBranch className="w-5 h-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Insights</TooltipContent>
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

        <main className="flex-1">
          <section className="max-w-6xl mx-auto px-6 py-10 space-y-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-4 max-w-3xl">
                <span className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                  <Sparkles className="h-3.5 w-3.5" /> New strategic surface
                </span>
                <h1 className="text-3xl md:text-4xl font-bold leading-tight">
                  Chapel Hill civic intelligence at deal speed
                </h1>
                <p className="text-muted-foreground text-base md:text-lg">
                  Policy Radar stitches together hearings, incentives, and institutional moves so you can choreograph acquisitions, reposition assets, and show up to meetings with the sharpest brief in the room.
                </p>
                <div className="flex flex-wrap gap-3 text-sm">
                  <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-2">
                    <span className="font-semibold">{aggregated.housing.toLocaleString()}</span> homes in play
                  </div>
                  <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-2">
                    <span className="font-semibold">{aggregated.jobs.toLocaleString()}</span> jobs influenced
                  </div>
                  <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-2">
                    <span className="font-semibold">${aggregated.investment.toLocaleString()}M</span> public capital tracked
                  </div>
                  <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-2">
                    Next decision in <span className="font-semibold">{aggregated.nextDecisionDays === Infinity ? "--" : `${aggregated.nextDecisionDays} days`}</span>
                  </div>
                </div>
              </div>
              <Card className="w-full max-w-sm bg-gradient-to-br from-emerald-500/15 via-primary/10 to-transparent border-emerald-500/30">
                <CardHeader>
                  <CardTitle className="text-lg">Quick posture check</CardTitle>
                  <CardDescription>
                    Who needs the most attention right now?
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ShieldCheck className="w-4 h-4" /> Hot signals ready
                    </div>
                    <span className="text-2xl font-semibold">{aggregated.hotSignals}</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="text-muted-foreground">Nearest decision</p>
                    <p className="font-semibold leading-snug">
                      {aggregated.nextDecisionLabel || "Innovation committee"}
                    </p>
                    {aggregated.nextDecisionDays !== Infinity ? (
                      <p className="text-xs text-muted-foreground">
                        {aggregated.nextDecisionDays} day lead time remaining
                      </p>
                    ) : null}
                  </div>
                  <Button asChild className="w-full group" variant="outline">
                    <Link href="#signal-deck">
                      Review briefing deck
                      <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card id="signal-deck" className="border-primary/25">
              <CardHeader className="gap-4 md:flex md:items-center md:justify-between">
                <div className="space-y-1">
                  <CardTitle>Signal command deck</CardTitle>
                  <CardDescription>
                    Filter live civic files and drill into the plays you need before each meeting.
                  </CardDescription>
                </div>
                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <div className="w-full md:w-60">
                    <Label htmlFor="signal-search" className="text-xs uppercase tracking-wide text-muted-foreground">
                      Search
                    </Label>
                    <Input
                      id="signal-search"
                      placeholder="Search by title, location, or theme"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-6 lg:grid-cols-[320px_1fr]">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                      Focus type
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {typeOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setTypeFilter(option as SignalType | "all")}
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                            typeFilter === option
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:border-primary/40"
                          }`}
                        >
                          {option === "all" ? "All types" : option}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                      Decision stage
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {stageOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setStageFilter(option as Stage | "all")}
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                            stageFilter === option
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:border-primary/40"
                          }`}
                        >
                          {option === "all" ? "All stages" : option}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                      Civic signals
                    </Label>
                    <div className="space-y-2">
                      {filteredSignals.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No signals match this filter set yet. Try widening your scope.
                        </p>
                      ) : (
                        filteredSignals.map((signal) => {
                          const active = signal.id === selectedId;
                          return (
                            <button
                              key={signal.id}
                              type="button"
                              onClick={() => setSelectedId(signal.id)}
                              className={`w-full rounded-xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                                active
                                  ? "border-primary bg-primary/10"
                                  : "border-border hover:border-primary/40"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="text-sm font-semibold leading-tight">
                                  {signal.title}
                                </div>
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${heatStyles[signal.heat]}`}
                                >
                                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                  {signal.heat}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground leading-snug">
                                {signal.focusTheme}
                              </p>
                              <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                                <span className="inline-flex items-center gap-1">
                                  <CalendarDays className="h-3.5 w-3.5" /> {formatDate(signal.decisionDate)}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5" /> {signal.location}
                                </span>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  {selectedSignal ? (
                    <>
                      <div className="grid gap-4 md:grid-cols-2">
                        <Card className="border-primary/20">
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                              <Radar className="w-4 h-4 text-primary" />
                              {selectedSignal.title}
                            </CardTitle>
                            <CardDescription>{selectedSignal.summary}</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4 text-sm">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                  Decision window
                                </p>
                                <p className="text-lg font-semibold leading-tight">
                                  {formatDate(selectedSignal.decisionDate)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {daysUntil(selectedSignal.decisionDate)} days out
                                </p>
                              </div>
                              <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                  Momentum
                                </p>
                                <p className="text-lg font-semibold leading-tight">
                                  {selectedSignal.momentum}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {percentToLabel(selectedSignal.sentiment)}
                                </p>
                              </div>
                            </div>
                            <div className="rounded-lg border border-border px-3 py-2">
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                Coalition pulse
                              </p>
                              <p className="text-sm leading-snug">
                                {selectedSignal.communitySignals}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="rounded-lg border border-border px-3 py-2">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                  Housing unlocked
                                </p>
                                <p className="text-xl font-semibold">
                                  {selectedSignal.stats.housingUnits.toLocaleString()}
                                </p>
                              </div>
                              <div className="rounded-lg border border-border px-3 py-2">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                  Jobs influenced
                                </p>
                                <p className="text-xl font-semibold">
                                  {selectedSignal.stats.jobs.toLocaleString()}
                                </p>
                              </div>
                              <div className="rounded-lg border border-border px-3 py-2">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                  Public capital
                                </p>
                                <p className="text-xl font-semibold">
                                  ${selectedSignal.stats.publicInvestment.toLocaleString()}M
                                </p>
                              </div>
                              <div className="rounded-lg border border-border px-3 py-2">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                  Carbon impact
                                </p>
                                <p className="text-xl font-semibold">
                                  {selectedSignal.stats.carbonReduction}%
                                </p>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                Core partners
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {selectedSignal.partners.map((partner) => (
                                  <span
                                    key={partner}
                                    className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-[11px]"
                                  >
                                    <Check className="w-3 h-3 text-primary" />
                                    {partner}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <div className="space-y-4">
                          <Card className="border-emerald-500/30 bg-emerald-500/5">
                            <CardHeader>
                              <CardTitle className="text-base flex items-center gap-2">
                                <Lightbulb className="w-4 h-4 text-emerald-500" />
                                Offensive plays
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ul className="list-disc space-y-2 pl-5 text-sm text-foreground/90">
                                {selectedSignal.opportunities.map((item) => (
                                  <li key={item}>{item}</li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                          <Card className="border-amber-500/30 bg-amber-500/5">
                            <CardHeader>
                              <CardTitle className="text-base flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                                Watchouts
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ul className="list-disc space-y-2 pl-5 text-sm text-foreground/90">
                                {selectedSignal.watchouts.map((item) => (
                                  <li key={item}>{item}</li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                          <Card className="border-primary/20">
                            <CardHeader>
                              <CardTitle className="text-base flex items-center gap-2">
                                <Target className="w-4 h-4 text-primary" />
                                Activation sprint
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ol className="list-decimal space-y-2 pl-5 text-sm text-foreground/90">
                                {selectedSignal.activationMoves.map((item) => (
                                  <li key={item}>{item}</li>
                                ))}
                              </ol>
                            </CardContent>
                          </Card>
                        </div>
                      </div>

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-base">
                            <Gavel className="w-4 h-4" />
                            Decision runway
                          </CardTitle>
                          <CardDescription>
                            Map the hearings and work sessions leading up to the decision.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {selectedSignal.milestones.map((milestone) => (
                            <div
                              key={`${selectedSignal.id}-${milestone.date}`}
                              className="flex flex-col gap-2 rounded-lg border border-border px-4 py-3 md:flex-row md:items-center md:justify-between"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                                  {formatDate(milestone.date)}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold leading-tight">
                                    {milestone.label}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {milestone.owner}
                                  </p>
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {daysUntil(milestone.date)} days to prep
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
                      Select a civic signal to load the deep brief.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-primary/25">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="w-4 h-4" />
                    Opportunity radar
                  </CardTitle>
                  <CardDescription>
                    Summarize upside unlocked if you execute against the current file stack.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Housing pipeline
                      </p>
                      <p className="text-2xl font-semibold">
                        {aggregated.housing.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        units across tracked files
                      </p>
                    </div>
                    <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Jobs influence
                      </p>
                      <p className="text-2xl font-semibold">
                        {aggregated.jobs.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        roles supported or created
                      </p>
                    </div>
                    <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Public capital
                      </p>
                      <p className="text-2xl font-semibold">
                        ${aggregated.investment.toLocaleString()}M
                      </p>
                      <p className="text-xs text-muted-foreground">
                        planned investments at stake
                      </p>
                    </div>
                    <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Emissions impact
                      </p>
                      <p className="text-2xl font-semibold">
                        {aggregated.carbon}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        cumulative reduction potential
                      </p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border px-4 py-3 text-sm">
                    <p className="font-semibold">Narrative to deploy</p>
                    <p className="text-muted-foreground">
                      Pair innovation economy growth with resilience investments and employer-backed housing solutions. The combined docket moves ${aggregated.investment.toLocaleString()}M and cements Chapel Hill as the region with the fastest civic-to-market conversion cycle.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/25">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Lightbulb className="w-4 h-4" />
                    Scenario playbooks
                  </CardTitle>
                  <CardDescription>
                    Switch personas to instantly tailor next steps.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <RadioGroup
                    value={scenario}
                    onValueChange={(value) => setScenario(value as ScenarioKey)}
                    className="md:grid md:grid-cols-3 md:gap-4"
                  >
                    {(Object.keys(scenarioProfiles) as ScenarioKey[]).map((key) => (
                      <label
                        key={key}
                        className={`flex cursor-pointer flex-col gap-2 rounded-lg border px-3 py-3 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                          scenario === key
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/30"
                        }`}
                      >
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <RadioGroupItem value={key} className="mt-0" />
                          {scenarioProfiles[key].label}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {scenarioProfiles[key].description}
                        </p>
                      </label>
                    ))}
                  </RadioGroup>
                  <div className="rounded-lg border border-border bg-background px-4 py-4 text-sm">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Priority signals
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {scenarioDetail.signalFocus.map((id) => {
                        const signal = civicSignals.find((item) => item.id === id);
                        if (!signal) return null;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setSelectedId(id)}
                            className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition hover:bg-primary/20"
                          >
                            <Radar className="w-3.5 h-3.5" />
                            {signal.title}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-4 space-y-2">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Next three moves
                      </p>
                      <ol className="list-decimal space-y-2 pl-5">
                        {scenarioDetail.moves.map((move) => (
                          <li key={move}>{move}</li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-primary/25">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarDays className="w-4 h-4" />
                  Engagement calendar
                </CardTitle>
                <CardDescription>
                  Stitch together hearings, charrettes, and coordination windows.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {calendarEvents.map((event) => (
                  <div
                    key={`${event.signalId}-${event.date}-${event.label}`}
                    className="grid gap-3 rounded-lg border border-border px-4 py-3 md:grid-cols-[120px_1fr_140px] md:items-center"
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                        {formatDate(event.date)}
                      </div>
                      {event.label}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {event.signalTitle}
                    </div>
                    <div className="text-xs text-muted-foreground md:text-right">
                      {event.owner}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    </>
  );
}
