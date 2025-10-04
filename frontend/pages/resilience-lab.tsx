"use client";

import React, { useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import {
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  Bot,
  CalendarRange,
  Compass,
  HeartPulse,
  MapPin,
  ShieldCheck,
  Sparkles,
  Sun,
  Waves,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type ScenarioId = "flood" | "heat" | "grid";

type Scenario = {
  id: ScenarioId;
  name: string;
  icon: LucideIcon;
  signal: string;
  summary: string;
  baseRisk: number;
  systems: { label: string; weight: number; focus: string }[];
  actions: { label: string; window: string; detail: string }[];
};

type InvestmentOption = {
  id: string;
  label: string;
  description: string;
  weight: number;
  default?: boolean;
};

type SupplyLine = {
  id: string;
  label: string;
  base: number;
  multiplier: number;
  narrative: string;
};

const hazardScenarios: Scenario[] = [
  {
    id: "flood",
    name: "Flash Flood + Storm Surge",
    icon: Waves,
    signal:
      "Coastal low pressure stacking with saturated soils along the Morgan & Bolin Creek corridor.",
    summary:
      "Hydrologists expect 8 inches of rain in 24 hours with 1400 households, key substations, and UNC research labs in the footprint.",
    baseRisk: 0.74,
    systems: [
      {
        label: "Distributed energy sites",
        weight: 0.32,
        focus: "Battery yards near Homestead Rd are within the 100-year flood fringe.",
      },
      {
        label: "Wellness and care network",
        weight: 0.27,
        focus: "Two dialysis centers sit in projected inundation zones and require relocation planning.",
      },
      {
        label: "Mobility + evacuation",
        weight: 0.21,
        focus: "Three collector roads funnel evacuees through a single low-water crossing.",
      },
    ],
    actions: [
      {
        label: "Stage high-water microgrids",
        window: "0-2 hrs",
        detail:
          "Island the Northside microgrid and pre-charge storage for critical cooling shelters.",
      },
      {
        label: "Activate creek monitors",
        window: "2-6 hrs",
        detail:
          "Push automated alerts to partner apps when water gauges exceed 11 feet.",
      },
      {
        label: "Deploy wellness shuttles",
        window: "6-12 hrs",
        detail:
          "Coordinate Chapel Hill Transit and volunteer drivers to relocate at-risk patients.",
      },
    ],
  },
  {
    id: "heat",
    name: "Triple-Digit Heat Dome",
    icon: Sun,
    signal:
      "Persistent subtropical ridge projected for 5 days with heat index above 108°F and nighttime lows above 80°F.",
    summary:
      "Peak demand threatens grid stability while 9,300 residents lack efficient cooling. Outdoor workers and seniors most exposed.",
    baseRisk: 0.68,
    systems: [
      {
        label: "Cooling demand spikes",
        weight: 0.29,
        focus: "Peak load forecast exceeds summer baseline by 38 MW without demand response.",
      },
      {
        label: "Health services surge",
        weight: 0.31,
        focus: "Emergency departments expect 2.1x rise in heat-related admissions.",
      },
      {
        label: "Workforce continuity",
        weight: 0.18,
        focus: "Outdoor construction and university maintenance crews need adaptive schedules.",
      },
    ],
    actions: [
      {
        label: "Launch neighborhood cooling map",
        window: "0-4 hrs",
        detail:
          "Push in-app alerts that guide residents to shaded corridors, splash pads, and late-night libraries.",
      },
      {
        label: "Dial demand response",
        window: "4-10 hrs",
        detail:
          "Coordinate UNC energy services and Duke Energy to stagger chiller loads and pre-cool smart homes.",
      },
      {
        label: "Check-in automation",
        window: "Daily",
        detail:
          "Volunteer call trees and SMS automations prioritize seniors flagged by health partners.",
      },
    ],
  },
  {
    id: "grid",
    name: "Grid Cyber Intrusion",
    icon: Zap,
    signal:
      "Regional utility detects anomalous traffic on distribution management systems after campus-wide phishing campaign.",
    summary:
      "Potential cascading outages for 60K meters; mobility, water, and data services face synchronized disruption risks.",
    baseRisk: 0.81,
    systems: [
      {
        label: "Energy islanding cadence",
        weight: 0.34,
        focus: "Microgrid controllers need manual override readiness if SCADA segmentation fails.",
      },
      {
        label: "Digital service continuity",
        weight: 0.25,
        focus: "City dispatch, hospitals, and public Wi-Fi share vulnerable fiber routes.",
      },
      {
        label: "Logistics + supply",
        weight: 0.19,
        focus: "Critical fuel depots rely on single-point authentication servers.",
      },
    ],
    actions: [
      {
        label: "Segment priority feeders",
        window: "0-1 hr",
        detail:
          "Physically isolate community microgrids and confirm manual switching teams are staged.",
      },
      {
        label: "Spin up civic data mesh",
        window: "1-4 hrs",
        detail:
          "Shift emergency communications to redundant mesh network maintained by volunteer technologists.",
      },
      {
        label: "Coordinate fuel parity",
        window: "4-12 hrs",
        detail:
          "Align municipal fleet, hospital, and grocery partners on shared distribution from safeguarded depots.",
      },
    ],
  },
];

const resilienceInvestments: InvestmentOption[] = [
  {
    id: "microgrid",
    label: "Community microgrid + storage",
    description: "Solar + battery backbone serving clinics, makerspaces, and 220 homes.",
    weight: 0.28,
    default: true,
  },
  {
    id: "cooling",
    label: "Adaptive cooling corridors",
    description: "Pop-up misting, reflective coatings, and late-night library hours across 6 hubs.",
    weight: 0.2,
  },
  {
    id: "mobility",
    label: "Flexible mobility fleet",
    description: "EV shuttles + cargo bikes with volunteer operators and telematics.",
    weight: 0.18,
  },
  {
    id: "data",
    label: "Civic data mesh",
    description: "LoRa + CBRS backbone linking sensors, clinics, and shelters if commercial networks fail.",
    weight: 0.24,
    default: true,
  },
  {
    id: "mutual-aid",
    label: "Mutual aid logistics fund",
    description: "Shared procurement for food, meds, cooling kits with neighborhood pods.",
    weight: 0.16,
  },
];

const supplyLines: SupplyLine[] = [
  {
    id: "care",
    label: "Care & Wellness",
    base: 48,
    multiplier: 1.08,
    narrative: "Clinics, pop-up medics, behavioral health, and wellness checks.",
  },
  {
    id: "mobility",
    label: "Mobility & Access",
    base: 42,
    multiplier: 1.15,
    narrative: "Transit corridors, greenways, and accessible evacuation staging.",
  },
  {
    id: "food",
    label: "Food & Essentials",
    base: 44,
    multiplier: 1.12,
    narrative: "Groceries, cold-chain partners, and culturally-responsive pantry networks.",
  },
];

const communityPartners = [
  {
    name: "Carrboro Mutual Aid Cooperative",
    focus: "Wellness calls, medicine runs, Spanish-language communications",
    contact: "Text (919) 555-0188",
  },
  {
    name: "UNC Resilience Lab",
    focus: "Data science volunteers, mesh network stewards",
    contact: "resilience@unc.edu",
  },
  {
    name: "Triangle Climate Crew",
    focus: "Cooling corridor staffing, mobile hydration",
    contact: "triangleclimatecrew.org",
  },
  {
    name: "Orange County Food Collective",
    focus: "Shared cold storage, culturally-anchored meal kits",
    contact: "hello@ocfoodcollective.org",
  },
];

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function describeScore(score: number) {
  if (score >= 80) return { label: "Adaptive", detail: "Systems flex under pressure with room to spare." };
  if (score >= 60) return { label: "Guarded", detail: "Stability holds if community partners stay engaged." };
  if (score >= 40) return { label: "Vulnerable", detail: "Expect rotating disruptions without rapid coordination." };
  return { label: "Critical", detail: "Immediate mutual aid activation required for basic continuity." };
}

export default function ResilienceLabPage() {
  const [activeScenario, setActiveScenario] = useState<ScenarioId>("flood");
  const [impactLevel, setImpactLevel] = useState<number[]>([68]);
  const [responseWindow, setResponseWindow] = useState<number[]>([4]);
  const [investmentsState, setInvestmentsState] = useState<Record<string, boolean>>(() =>
    resilienceInvestments.reduce<Record<string, boolean>>((acc, option) => {
      acc[option.id] = option.default ?? false;
      return acc;
    }, {}),
  );

  const scenario = useMemo(
    () => hazardScenarios.find((item) => item.id === activeScenario) ?? hazardScenarios[0],
    [activeScenario],
  );
  const severity = impactLevel[0];
  const windowDays = responseWindow[0];

  const readinessBoost = useMemo(() => {
    return resilienceInvestments.reduce((sum, option) => {
      return investmentsState[option.id] ? sum + option.weight : sum;
    }, 0);
  }, [investmentsState]);

  const uptimeScore = useMemo(() => {
    const hazardDrag = severity * scenario.baseRisk * 0.42;
    const timePenalty = windowDays * 1.8;
    const mitigationLift = readinessBoost * 48;
    return clampScore(92 - hazardDrag - timePenalty + mitigationLift);
  }, [severity, scenario.baseRisk, windowDays, readinessBoost]);

  const uptimeDescriptor = useMemo(() => describeScore(uptimeScore), [uptimeScore]);

  const cascadeImpacts = useMemo(() => {
    return scenario.systems.map((system) => {
      const hazardStress = severity * system.weight * scenario.baseRisk * 0.95;
      const delayStress = windowDays * system.weight * 4.2;
      const mitigation = readinessBoost * 60;
      const stress = clampScore(hazardStress / 1.3 + delayStress - mitigation);
      const status =
        stress >= 75 ? "Severe" : stress >= 55 ? "Guarded" : stress >= 35 ? "Manageable" : "Minimal";
      return { ...system, stress, status };
    });
  }, [scenario.systems, severity, scenario.baseRisk, windowDays, readinessBoost]);

  const supplyReadiness = useMemo(() => {
    return supplyLines.map((line) => {
      const hazardLoad = severity * line.multiplier * scenario.baseRisk;
      const delayDrag = windowDays * 2.1;
      const mitigation = readinessBoost * 50;
      const stress = clampScore(line.base + hazardLoad / 1.6 + delayDrag - mitigation);
      const status = stress >= 70 ? "Fragile" : stress >= 50 ? "Watch" : "Stable";
      return { ...line, stress, status };
    });
  }, [severity, scenario.baseRisk, windowDays, readinessBoost]);

  const horizonHours = useMemo(() => {
    const base = 36 + readinessBoost * 60;
    const drag = severity * 0.28 + windowDays * 4.5;
    return Math.max(8, Math.round(base - drag));
  }, [readinessBoost, severity, windowDays]);

  const unlockedInvestments = useMemo(() => {
    return resilienceInvestments.filter((option) => investmentsState[option.id]);
  }, [investmentsState]);

  return (
    <>
      <Head>
        <title>Community Resilience Lab | EstateWise</title>
        <meta
          name="description"
          content="Interactive scenario planning to stress-test Chapel Hill neighborhoods and coordinate resilience partners."
        />
      </Head>
      <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted text-foreground">
        <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-14 md:px-8 lg:px-10">
          <header className="space-y-6 rounded-3xl bg-primary/10 p-8 shadow-lg ring-1 ring-primary/30 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                  Community Resilience Lab
                </p>
                <h1 className="mt-2 text-3xl font-bold md:text-4xl">
                  Stress-test Chapel Hill neighborhoods before the next disruption
                </h1>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/chat">
                  <Button variant="secondary" className="gap-2 rounded-full px-6">
                    <Bot className="h-4 w-4" />
                    Ask the Assistant
                  </Button>
                </Link>
                <Link href="/map">
                  <Button variant="outline" className="gap-2 rounded-full px-6">
                    <MapPin className="h-4 w-4" />
                    Open Map Intelligence
                  </Button>
                </Link>
              </div>
            </div>
            <p className="max-w-3xl text-base text-muted-foreground md:text-lg">
              Blend municipal data, mutual aid capacity, and hyperlocal infrastructure knowledge. Simulate cascading hazards, gauge
              how long critical systems stay online, and surface who to activate within minutes.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-1 shadow">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Scenario aware
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-1 shadow">
                <Sparkles className="h-4 w-4 text-primary" />
                Mutual aid centric
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-1 shadow">
                <Compass className="h-4 w-4 text-primary" />
                Works with EstateWise maps
              </div>
            </div>
          </header>

          <section className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-col gap-3">
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <BarChart3 className="h-5 w-5" /> Scenario Studio
                </CardTitle>
                <CardDescription>
                  Choose a threat profile, tune severity, and preview the cascading systems most likely to wobble.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-3 sm:grid-cols-3">
                  {hazardScenarios.map((option) => {
                    const Icon = option.icon;
                    const isActive = option.id === scenario.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setActiveScenario(option.id)}
                        className={cn(
                          "flex h-full flex-col gap-3 rounded-2xl border bg-background/70 p-4 text-left shadow-sm transition-all",
                          "hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          isActive ? "border-primary bg-primary/10 shadow-md" : "border-border",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
                            <Icon className="h-5 w-5 text-primary" />
                          </span>
                          <p className="font-semibold">{option.name}</p>
                        </div>
                        <p className="text-sm text-muted-foreground">{option.signal}</p>
                      </button>
                    );
                  })}
                </div>

                <Card className="border-dashed border-primary/40 bg-secondary/30">
                  <CardContent className="space-y-5 p-5">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Current model</p>
                      <h2 className="text-xl font-semibold">{scenario.name}</h2>
                      <p className="mt-2 text-sm text-muted-foreground">{scenario.summary}</p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-3">
                        <Label className="flex items-center justify-between text-sm font-medium">
                          Impact intensity
                          <span className="text-xs font-normal text-muted-foreground">{severity}%</span>
                        </Label>
                        <Slider
                          value={impactLevel}
                          onValueChange={setImpactLevel}
                          min={25}
                          max={100}
                          step={1}
                          className="w-full"
                          aria-label="Impact intensity"
                        />
                        <p className="text-xs text-muted-foreground">
                          Represents compound stressors like duration, geographic footprint, and concurrent hazards.
                        </p>
                      </div>
                      <div className="space-y-3">
                        <Label className="flex items-center justify-between text-sm font-medium">
                          Response coordination window
                          <span className="text-xs font-normal text-muted-foreground">{windowDays} day{windowDays === 1 ? "" : "s"}</span>
                        </Label>
                        <Slider
                          value={responseWindow}
                          onValueChange={setResponseWindow}
                          min={1}
                          max={10}
                          step={1}
                          className="w-full"
                          aria-label="Response coordination window"
                        />
                        <p className="text-xs text-muted-foreground">
                          How long before mutual aid partners and city departments are fully synchronized.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-4 md:grid-cols-3">
                  {cascadeImpacts.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-border bg-background/70 p-4 shadow-sm"
                    >
                      <p className="text-sm font-semibold">{item.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.focus}</p>
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                          <span>Status</span>
                          <span>{item.status}</span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-2 rounded-full bg-primary transition-all",
                              item.stress >= 75
                                ? "bg-destructive"
                                : item.stress >= 55
                                  ? "bg-primary"
                                  : "bg-emerald-500 dark:bg-emerald-400",
                            )}
                            style={{ width: `${item.stress}%` }}
                          />
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">Stress: {item.stress}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/30 shadow-lg">
              <CardHeader className="space-y-2">
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <ShieldCheck className="h-5 w-5 text-primary" /> Stability Scorecard
                </CardTitle>
                <CardDescription>
                  Aggregated continuity outlook blending infrastructure, people systems, and readiness moves.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-2xl bg-primary text-primary-foreground p-6 shadow-xl">
                  <p className="text-sm uppercase tracking-wide">Community uptime projection</p>
                  <p className="mt-1 text-4xl font-bold">{uptimeScore}%</p>
                  <p className="mt-2 text-sm font-medium">{uptimeDescriptor.label}</p>
                  <p className="mt-2 text-sm opacity-90">{uptimeDescriptor.detail}</p>
                  <div className="mt-4 flex items-center gap-2 text-xs font-medium">
                    <HeartPulse className="h-4 w-4" />
                    Stability horizon ≈ {horizonHours} hrs before cascading failures
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold">Ready assets online</p>
                  </div>
                  <ul className="space-y-3 text-sm">
                    {unlockedInvestments.length === 0 ? (
                      <li className="text-muted-foreground">
                        Toggle investments below to reveal mitigation lift and partner assignments.
                      </li>
                    ) : (
                      unlockedInvestments.map((option) => (
                        <li key={option.id} className="flex flex-col gap-1">
                          <span className="font-medium">{option.label}</span>
                          <span className="text-xs text-muted-foreground">{option.description}</span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <p className="text-sm font-semibold">Supply line watch</p>
                  </div>
                  <div className="space-y-4">
                    {supplyReadiness.map((line) => {
                      const focusLabel =
                        line.id === "care"
                          ? "Clinics & responders"
                          : line.id === "mobility"
                            ? "Transit & evacuation"
                            : "Pantry & cold chain";
                      const barColor =
                        line.status === "Fragile"
                          ? "bg-destructive"
                          : line.status === "Watch"
                            ? "bg-amber-500"
                            : "bg-emerald-500 dark:bg-emerald-400";
                      return (
                        <div key={line.id} className="rounded-xl border border-border/60 p-4">
                          <div className="flex items-center justify-between text-sm font-medium">
                            <span>{line.label}</span>
                            <span className="text-xs text-muted-foreground">{line.status}</span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{line.narrative}</p>
                          <div className="mt-3 h-2 rounded-full bg-muted">
                            <div className={cn("h-2 rounded-full transition-all", barColor)} style={{ width: `${line.stress}%` }} />
                          </div>
                          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                            <span>{focusLabel}</span>
                            <span>{line.stress}% stress</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="space-y-2">
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <CalendarRange className="h-5 w-5 text-primary" /> Response timeline
                </CardTitle>
                <CardDescription>
                  Orchestrate quick wins and deeper resilience maneuvers in the order that buys the most uptime.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {scenario.actions.map((action) => (
                  <div
                    key={action.label}
                    className="rounded-2xl border border-border bg-background/80 p-5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">{action.label}</p>
                        <p className="text-xs text-muted-foreground">{action.detail}</p>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        {action.window}
                      </span>
                    </div>
                  </div>
                ))}
                <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-5 text-sm text-muted-foreground">
                  Stability horizon under current settings is approximately {horizonHours} hours. Tighten your coordination window or
                  enable additional investments to push past the 48-hour community uptime target.
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/30">
              <CardHeader className="space-y-2">
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Sparkles className="h-5 w-5 text-primary" /> Resilience levers
                </CardTitle>
                <CardDescription>
                  Toggle infrastructure and social capacity boosts to see how community uptime changes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {resilienceInvestments.map((option) => (
                  <div
                    key={option.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-border/60 p-4"
                  >
                    <div>
                      <p className="text-sm font-semibold">{option.label}</p>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                    <Switch
                      checked={investmentsState[option.id]}
                      onCheckedChange={(checked) =>
                        setInvestmentsState((prev) => ({
                          ...prev,
                          [option.id]: checked,
                        }))
                      }
                      aria-label={`Toggle ${option.label}`}
                    />
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  Keep an eye on the stability scorecard to see the cumulative lift from your activated levers.
                </p>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2 border-primary/20">
              <CardHeader className="space-y-2">
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Compass className="h-5 w-5 text-primary" /> Mutual aid map
                </CardTitle>
                <CardDescription>
                  Trusted partners to activate based on the stress profile you just modeled.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {communityPartners.map((partner) => (
                  <div key={partner.name} className="rounded-2xl border border-border/60 bg-background/60 p-5 shadow-sm">
                    <p className="text-sm font-semibold">{partner.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{partner.focus}</p>
                    <p className="mt-3 text-xs font-medium text-primary">{partner.contact}</p>
                  </div>
                ))}
                <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-5 text-sm text-muted-foreground">
                  Looking for more partners? Tag organizations inside the EstateWise chat or upload datasets through the insights
                  workspace to see them mapped here.
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/30">
              <CardHeader className="space-y-2">
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Sparkles className="h-5 w-5 text-primary" /> Next best moves
                </CardTitle>
                <CardDescription>
                  Quick suggestions to extend stability based on your modeled scenario.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="rounded-xl border border-border/60 bg-background/60 p-4">
                  <p className="font-semibold">Share the playbook</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Export this scenario to the insights workspace and pin it to neighborhood pages so residents understand the plan.
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/60 p-4">
                  <p className="font-semibold">Overlay with map intelligence</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Jump to the map to view assets, cooling hubs, and evacuation routes impacted under this scenario.
                  </p>
                  <Link href="/map" className="mt-2 inline-flex items-center text-xs font-medium text-primary">
                    Open the map intelligence layer →
                  </Link>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/60 p-4">
                  <p className="font-semibold">Brief the assistant</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Let the chatbot know about current hazards so it can route residents to the right resources instantly.
                  </p>
                  <Link href="/chat" className="mt-2 inline-flex items-center text-xs font-medium text-primary">
                    Start the briefing →
                  </Link>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </>
  );
}
