"use client";

import React, { useEffect, useRef, useState, memo } from "react";
import Head from "next/head";
import Link from "next/link";
import Chart, { ChartConfiguration } from "chart.js/auto";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Sun,
  Moon,
  ChevronLeft,
  BarChart3,
  Calculator,
  MessageCircleMore,
  MapPin,
  GitBranch,
  Users,
  Settings,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

const API_BASE_URL = "https://estatewise-backend.vercel.app";

// ------------------------------------------------------------------
// THEME TOGGLE
// ------------------------------------------------------------------
const DarkModeToggle: React.FC = () => {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("dark-mode");
    if (saved !== null) return saved === "true";
    return document.documentElement.classList.contains("dark");
  });

  useEffect(() => {
    const root = document.documentElement;
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    darkMode ? root.classList.add("dark") : root.classList.remove("dark");
    localStorage.setItem("dark-mode", String(darkMode));
    document
      .querySelector("meta[name='theme-color']")
      ?.setAttribute("content", darkMode ? "#262626" : "#faf9f2");
  }, [darkMode]);

  const toggle = () => {
    setDarkMode((prev) => {
      const next = !prev;
      toast.success(next ? "Dark mode activated" : "Light mode activated");
      return next;
    });
  };

  return (
    <button
      aria-label="Toggle theme"
      onClick={toggle}
      className="inline-flex ml-0 h-8 w-8 items-center justify-center rounded-full p-0 transition-colors cursor-pointer hover:text-primary"
      title="Toggle theme"
    >
      {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
};

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
const PALETTE = [
  "#1f77b4",
  "#ff7f0e",
  "#2ca02c",
  "#d62728",
  "#9467bd",
  "#8c564b",
  "#e377c2",
  "#7f7f7f",
  "#bcbd22",
  "#17becf",
];

const normalizeLabel = (label: string): string =>
  label
    .toLowerCase()
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const fadeUpContainer = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const fadeUpItem = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

// ------------------------------------------------------------------
// ChartBlock: create chart once, only update colors on theme change
// ------------------------------------------------------------------
const ChartBlock: React.FC<{ spec: ChartConfiguration }> = memo(({ spec }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const [isDark, setIsDark] = useState<boolean>(() =>
    document.documentElement.classList.contains("dark"),
  );
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    const mo = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains("dark")),
    );
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => mo.disconnect();
  }, []);

  // lazy load
  useEffect(() => {
    const node = canvasRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || chartRef.current || !canvasRef.current) return;

    const cfg = structuredClone(spec) as ChartConfiguration;

    if (cfg.data?.labels) {
      cfg.data.labels = cfg.data.labels.map((lbl) =>
        normalizeLabel(String(lbl)),
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cfg.data?.datasets?.forEach((ds: any, idx: number) => {
      if (Array.isArray(ds.data)) {
        ds.backgroundColor = ds.data.map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (_: any, i: number) => PALETTE[i % PALETTE.length],
        );
        ds.borderColor = ds.backgroundColor;
      } else {
        const c = PALETTE[idx % PALETTE.length];
        ds.backgroundColor = c;
        ds.borderColor = c;
      }
      ds.borderWidth = ds.borderWidth ?? 1;
    });

    const fontColor = isDark ? "#ffffff" : "#000000";
    Chart.defaults.color = fontColor;
    cfg.options = {
      ...(cfg.options || {}),
      maintainAspectRatio: false,
      plugins: {
        ...(cfg.options?.plugins || {}),
        legend: {
          ...(cfg.options?.plugins?.legend || {}),
          labels: { color: fontColor },
        },
      },
    };
    if (cfg.options.scales) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      Object.entries(cfg.options.scales).forEach(([_, scale]) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const s = scale as any;
        s.ticks = { ...(s.ticks || {}), color: fontColor };
        s.title = { ...(s.title || {}), color: fontColor };
      });
    }

    chartRef.current = new Chart(canvasRef.current, cfg);
  }, [visible, spec, isDark]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const fontColor = isDark ? "#ffffff" : "#000000";
    Chart.defaults.color = fontColor;

    if (chart.options.plugins?.legend?.labels) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (chart.options.plugins.legend.labels as any).color = fontColor;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scales = (chart.options.scales || {}) as Record<string, any>;
    Object.values(scales).forEach((s) => {
      if (s.ticks) s.ticks.color = fontColor;
      if (s.title) s.title.color = fontColor;
    });

    chart.update("none");
  }, [isDark]);

  return <canvas ref={canvasRef} className="h-full w-full mb-4" />;
});

ChartBlock.displayName = "ChartBlock";

const chartTitles: Record<string, string> = {
  homeType: "Home-type distribution",
  bedrooms: "Bedroom count",
  bathrooms: "Bathroom count",
  priceDist: "Price distribution",
  areaDist: "Living-area distribution",
  yearBuiltDist: "Year-built distribution",
  priceArea: "Price vs living area",
  priceYear: "Price vs year built",
  bedsBaths: "Bedrooms vs bathrooms",
  avgPriceType: "Average price by type",
  countByZip: "Listings by zipcode",
  pricePerSqft: "Price per sqft",
  homeStatus: "Home status distribution",
  countByCity: "Listings by city",
  avgAreaType: "Average living area by type",
  ageDist: "Property age distribution",
  avgPricePerSqftType: "Average $/Sqft by type",
  areaYear: "Living area vs year built",
};

const chartSubtitles: Record<string, string> = {
  homeType: "Breakdown of number of listings per home type",
  bedrooms: "Distribution of bedroom counts across listings",
  bathrooms: "Distribution of bathroom counts across listings",
  priceDist: "Histogram showing how listing prices are distributed",
  areaDist: "Shows distribution of living area sizes in sqft",
  yearBuiltDist: "Count of listings by their construction year",
  priceArea: "Relationship between living area and price",
  priceYear: "Trend of price over construction year",
  bedsBaths: "Scatter of bedroom vs bathroom counts",
  avgPriceType: "Average listing price per home type",
  countByZip: "Number of listings in each zipcode",
  pricePerSqft: "Distribution of price per square foot",
  homeStatus: "Breakdown of listing statuses",
  countByCity: "Number of listings per city",
  avgAreaType: "Average living area size per home type",
  ageDist: "Histogram showing distribution of property ages",
  avgPricePerSqftType: "Average price per square foot by home type",
  areaYear: "Scatter of living area vs year built",
};

// ------------------------------------------------------------------
// Main Page
// ------------------------------------------------------------------
export default function ChartsPage() {
  const [charts, setCharts] = useState<Record<
    string,
    ChartConfiguration
  > | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/properties?q=Chapel%20Hill&topK=1500`)
      .then((r) => r.json())
      .then((d) => setCharts(d.charts))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const navLinks = [
    { href: "/chat", label: "Chat", Icon: MessageCircleMore },
    { href: "/insights", label: "Insights", Icon: GitBranch },
    { href: "/analyzer", label: "Deal Analyzer", Icon: Calculator },
    { href: "/map", label: "Map", Icon: MapPin },
    { href: "/forums", label: "Forums", Icon: Users },
  ];
  const [navMenuOpen, setNavMenuOpen] = useState(false);

  return (
    <>
      <Head>
        <title>Charts | EstateWise</title>
        <meta
          name="description"
          content="Interactive visualizations of Chapel Hill real-estate data"
        />
      </Head>

      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <style jsx global>{`
          html {
            scroll-behavior: smooth;
          }

          html,
          body {
            overscroll-behavior: none;
          }
        `}</style>
        <header className="sticky top-0 z-30 w-full backdrop-blur-lg bg-background/90 border-b border-border">
          <div className="max-w-7xl mx-auto h-16 px-4 sm:px-6 flex items-center gap-3 w-full">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <BarChart3 className="w-6 h-6 text-primary shrink-0" />
              <span className="font-extrabold tracking-tight text-lg truncate">
                Insights Dashboard
              </span>
            </div>
            <nav className="ml-auto flex items-center gap-3">
              <div className="hidden min-[1065px]:flex items-center gap-4">
                {navLinks.map(({ href, label, Icon }) => (
                  <Tooltip key={href}>
                    <TooltipTrigger asChild>
                      <Link
                        href={href}
                        className="inline-flex h-8 w-8 items-center justify-center hover:text-primary transition-colors"
                        aria-label={label}
                      >
                        <Icon className="w-5 h-5" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>{label}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
              <div className="min-[1065px]:hidden relative">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="inline-flex h-8 w-8 items-center justify-center hover:text-primary transition-colors cursor-pointer"
                      aria-label="Open navigation menu"
                      onClick={() => setNavMenuOpen((prev) => !prev)}
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Menu</TooltipContent>
                </Tooltip>
                {navMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-card rounded shadow-lg py-2 z-50">
                    {navLinks.map(({ href, label, Icon }) => (
                      <Link href={href} key={href}>
                        <div
                          className="px-4 py-2 hover:bg-muted cursor-pointer select-none flex items-center gap-2"
                          onClick={() => setNavMenuOpen(false)}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{label}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
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

        <motion.section
          className="mx-auto max-w-4xl px-6 py-10 text-center space-y-3"
          variants={fadeUpItem}
          initial="hidden"
          animate="show"
        >
          <h1 className="text-3xl md:text-4xl font-bold leading-tight">
            Chapel Hill Real-Estate Visualized 📊
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Eighteen crisp charts that uncover general price patterns, bedroom
            trends, and neighborhood popularity, giving you the data-driven edge
            in your home search.
          </p>
        </motion.section>

        <motion.main
          className="flex-1 px-6 pb-8"
          variants={fadeUpContainer}
          initial="hidden"
          animate="show"
        >
          {loading ? (
            <motion.div
              className="flex items-center justify-center h-60"
              variants={fadeUpItem}
            >
              <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            </motion.div>
          ) : charts ? (
            <div className="max-w-7xl mx-auto grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(charts).map(([key, spec], index) => (
                <Card
                  key={key}
                  className="bg-card border border-border rounded-2xl chart-reveal"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <CardHeader className="pb-2 flex-col items-start gap-1">
                    <div className="flex-row flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      <CardTitle className="text-md font-bold">
                        {chartTitles[key]}
                      </CardTitle>
                    </div>
                    <CardDescription className="text-sm text-muted-foreground">
                      {chartSubtitles[key]}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-72">
                    <ChartBlock spec={spec} />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <motion.p
              className="text-center text-red-500"
              variants={fadeUpItem}
            >
              Couldn’t load chart data — please try again later.
            </motion.p>
          )}
          <motion.div
            className="w-full flex justify-center mt-8"
            variants={fadeUpItem}
          >
            <Button
              asChild
              variant="default"
              title="Back to Chat"
              aria-label="Back to Chat"
            >
              <Link href="/chat" className="flex items-center gap-2">
                <ChevronLeft className="w-4 h-4" />
                Back to Chat
              </Link>
            </Button>
          </motion.div>
        </motion.main>
        <style jsx>{`
          .chart-reveal {
            opacity: 0;
            transform: translateY(12px);
            animation: chart-fade-up 480ms ease-out forwards;
          }

          @keyframes chart-fade-up {
            from {
              opacity: 0;
              transform: translateY(12px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    </>
  );
}
