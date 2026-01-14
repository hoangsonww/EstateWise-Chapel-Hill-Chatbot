"use client";

import React, { useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { DarkModeToggle } from "@/components/dark-mode-toggle";
import {
  AlertTriangle,
  BarChart3,
  Calculator,
  GitBranch,
  LineChart,
  MapPin,
  MessageCircleMore,
  ShieldAlert,
  TrendingUp,
  Users,
  Wallet,
  Settings,
} from "lucide-react";
import { motion } from "framer-motion";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const currencyFormatterPrecise = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function formatMoney(value: number, precise = false) {
  if (!Number.isFinite(value)) return "N/A";
  return (precise ? currencyFormatterPrecise : currencyFormatter).format(value);
}

function formatPercent(value: number, digits = 1) {
  if (!Number.isFinite(value)) return "N/A";
  return `${value.toFixed(digits)}%`;
}

function formatRatio(value: number, digits = 2) {
  if (!Number.isFinite(value)) return "N/A";
  return value.toFixed(digits);
}

function calcMonthlyPayment(
  principal: number,
  annualRate: number,
  termYears: number,
) {
  const months = termYears * 12;
  if (!months) return 0;
  const monthlyRate = annualRate / 100 / 12;
  if (!monthlyRate) return principal / months;
  const pow = Math.pow(1 + monthlyRate, months);
  return (principal * (monthlyRate * pow)) / (pow - 1);
}

function calcRemainingBalance(
  principal: number,
  annualRate: number,
  termYears: number,
  monthsPaid: number,
) {
  const months = termYears * 12;
  if (!months) return 0;
  const monthlyRate = annualRate / 100 / 12;
  if (!monthlyRate) {
    const principalPaid = (principal / months) * monthsPaid;
    return Math.max(principal - principalPaid, 0);
  }
  const pow = Math.pow(1 + monthlyRate, months);
  const powPaid = Math.pow(1 + monthlyRate, monthsPaid);
  return (principal * (pow - powPaid)) / (pow - 1);
}

type Inputs = {
  purchasePrice: number;
  downPaymentPct: number;
  interestRate: number;
  termYears: number;
  closingCostPct: number;
  loanPointsPct: number;
  rehabBudget: number;
  financeRehab: boolean;
  rentMonthly: number;
  otherIncomeMonthly: number;
  vacancyPct: number;
  propertyTaxRate: number;
  insuranceMonthly: number;
  hoaMonthly: number;
  utilitiesMonthly: number;
  maintenancePct: number;
  managementPct: number;
  capexPct: number;
  otherExpenseMonthly: number;
  mortgageInsuranceMonthly: number;
  appreciationRate: number;
  rentGrowthRate: number;
  expenseGrowthRate: number;
  dscrTarget: number;
};

type NumericInputKey = Exclude<keyof Inputs, "financeRehab">;

type Scenario = {
  name: string;
  tagline: string;
  values: Partial<Inputs>;
};

const DEFAULT_INPUTS: Inputs = {
  purchasePrice: 485000,
  downPaymentPct: 20,
  interestRate: 6.4,
  termYears: 30,
  closingCostPct: 2.5,
  loanPointsPct: 0.75,
  rehabBudget: 15000,
  financeRehab: false,
  rentMonthly: 3200,
  otherIncomeMonthly: 150,
  vacancyPct: 6,
  propertyTaxRate: 0.95,
  insuranceMonthly: 135,
  hoaMonthly: 90,
  utilitiesMonthly: 0,
  maintenancePct: 5,
  managementPct: 8,
  capexPct: 5,
  otherExpenseMonthly: 60,
  mortgageInsuranceMonthly: 0,
  appreciationRate: 3,
  rentGrowthRate: 2.5,
  expenseGrowthRate: 2.2,
  dscrTarget: 1.2,
};

const SCENARIOS: Scenario[] = [
  {
    name: "Starter Rental",
    tagline: "Balanced leverage with steady demand.",
    values: {
      purchasePrice: 320000,
      downPaymentPct: 20,
      interestRate: 6.1,
      rentMonthly: 2350,
      otherIncomeMonthly: 75,
      vacancyPct: 6,
      propertyTaxRate: 0.85,
      insuranceMonthly: 120,
      hoaMonthly: 0,
      rehabBudget: 8000,
      managementPct: 8,
    },
  },
  {
    name: "Value Add Duplex",
    tagline: "Light rehab with upside on rents.",
    values: {
      purchasePrice: 420000,
      downPaymentPct: 25,
      interestRate: 6.6,
      rentMonthly: 3600,
      otherIncomeMonthly: 200,
      vacancyPct: 7,
      rehabBudget: 45000,
      financeRehab: true,
      maintenancePct: 6,
      capexPct: 6,
    },
  },
  {
    name: "Urban Condo",
    tagline: "Higher HOA, premium location.",
    values: {
      purchasePrice: 560000,
      downPaymentPct: 20,
      interestRate: 6.3,
      rentMonthly: 3400,
      otherIncomeMonthly: 0,
      vacancyPct: 5,
      propertyTaxRate: 1.2,
      insuranceMonthly: 150,
      hoaMonthly: 380,
      rehabBudget: 5000,
      managementPct: 6,
      capexPct: 4,
    },
  },
];

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

function Metric({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "positive" | "neutral" | "negative";
}) {
  const valueClass =
    tone === "positive"
      ? "text-emerald-600 dark:text-emerald-300"
      : tone === "negative"
        ? "text-rose-600 dark:text-rose-300"
        : "text-foreground";

  return (
    <div className="rounded-xl border border-border/60 bg-background/80 p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={`text-2xl font-semibold ${valueClass}`}>{value}</p>
      {detail ? (
        <p className="text-xs text-muted-foreground">{detail}</p>
      ) : null}
    </div>
  );
}

export default function AnalyzerPage() {
  const [inputs, setInputs] = useState<Inputs>(DEFAULT_INPUTS);
  const [activeScenario, setActiveScenario] = useState<string>("Base Case");

  const updateInput = <K extends keyof Inputs>(key: K, value: Inputs[K]) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const handleNumberChange =
    (key: NumericInputKey) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(event.target.value);
      updateInput(key, Number.isFinite(value) ? value : 0);
    };

  const handleSliderChange = (key: NumericInputKey) => (value: number[]) => {
    updateInput(key, value[0] ?? 0);
  };

  const applyScenario = (scenario: Scenario) => {
    setInputs((prev) => ({ ...prev, ...scenario.values }));
    setActiveScenario(scenario.name);
  };

  const resetDefaults = () => {
    setInputs(DEFAULT_INPUTS);
    setActiveScenario("Base Case");
  };

  const metrics = useMemo(() => {
    const price = Math.max(inputs.purchasePrice, 0);
    const downPayment = price * (inputs.downPaymentPct / 100);
    const loanBase = Math.max(price - downPayment, 0);
    const rehabFinanced = inputs.financeRehab ? inputs.rehabBudget : 0;
    const loanAmount = loanBase + rehabFinanced;
    const monthlyPI = calcMonthlyPayment(
      loanAmount,
      inputs.interestRate,
      inputs.termYears,
    );
    const closingCosts = price * (inputs.closingCostPct / 100);
    const pointsCost = loanAmount * (inputs.loanPointsPct / 100);
    const cashNeeded =
      downPayment +
      closingCosts +
      pointsCost +
      (inputs.financeRehab ? 0 : inputs.rehabBudget);

    const propertyTaxMonthly = (price * (inputs.propertyTaxRate / 100)) / 12;
    const grossIncome = inputs.rentMonthly + inputs.otherIncomeMonthly;
    const vacancyLoss = grossIncome * (inputs.vacancyPct / 100);
    const effectiveIncome = grossIncome - vacancyLoss;
    const maintenance = inputs.rentMonthly * (inputs.maintenancePct / 100);
    const management = grossIncome * (inputs.managementPct / 100);
    const capex = inputs.rentMonthly * (inputs.capexPct / 100);

    const operatingExpenses =
      propertyTaxMonthly +
      inputs.insuranceMonthly +
      inputs.hoaMonthly +
      inputs.utilitiesMonthly +
      maintenance +
      management +
      capex +
      inputs.otherExpenseMonthly;

    const debtService = monthlyPI + inputs.mortgageInsuranceMonthly;
    const noiMonthly = effectiveIncome - operatingExpenses;
    const cashFlowMonthly = noiMonthly - debtService;

    const capRate = price > 0 ? (noiMonthly * 12) / price : 0;
    const cashOnCash = cashNeeded > 0 ? (cashFlowMonthly * 12) / cashNeeded : 0;
    const dscr = debtService > 0 ? noiMonthly / debtService : 0;
    const breakEven =
      grossIncome > 0 ? (operatingExpenses + debtService) / grossIncome : 0;
    const rentToPrice = price > 0 ? (inputs.rentMonthly * 12) / price : 0;
    const grm = inputs.rentMonthly > 0 ? price / (inputs.rentMonthly * 12) : 0;
    const ltv = price > 0 ? loanAmount / price : 0;
    const totalInterest = monthlyPI * inputs.termYears * 12 - loanAmount;
    const operatingExpenseRatio =
      effectiveIncome > 0 ? operatingExpenses / effectiveIncome : 0;
    const debtYield = loanAmount > 0 ? (noiMonthly * 12) / loanAmount : 0;

    const annualDebtService = debtService * 12;
    const annualIncome = grossIncome * 12;
    const annualExpenses = operatingExpenses * 12;
    const annualNoi = noiMonthly * 12;
    const annualCashFlow = cashFlowMonthly * 12;
    const paybackYears =
      annualCashFlow > 0 ? cashNeeded / annualCashFlow : null;

    const score = Math.min(
      100,
      Math.max(
        0,
        (capRate / 0.08) * 25 +
          (cashOnCash / 0.12) * 25 +
          Math.min(Math.max((dscr - 1) / 0.5, 0), 1) * 25 +
          (cashFlowMonthly >= 0 ? 15 : 0) +
          (inputs.downPaymentPct >= 20 ? 10 : 5),
      ),
    );

    const scoreLabel =
      score >= 80
        ? "Premium"
        : score >= 65
          ? "Strong"
          : score >= 50
            ? "Watchlist"
            : "At Risk";
    const scoreTone =
      score >= 80
        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
        : score >= 65
          ? "bg-sky-500/15 text-sky-700 dark:text-sky-300"
          : score >= 50
            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
            : "bg-rose-500/15 text-rose-700 dark:text-rose-300";

    const riskFlags = [];
    if (cashFlowMonthly < 0) {
      riskFlags.push("Negative monthly cash flow at current rent.");
    }
    if (dscr > 0 && dscr < inputs.dscrTarget) {
      riskFlags.push(`DSCR below target of ${inputs.dscrTarget.toFixed(2)}.`);
    }
    if (capRate > 0 && capRate < 0.05) {
      riskFlags.push("Cap rate below 5% based on current NOI.");
    }
    if (inputs.vacancyPct < 4) {
      riskFlags.push("Vacancy allowance under 4% may be optimistic.");
    }
    if (inputs.downPaymentPct < 15) {
      riskFlags.push("Low down payment increases leverage risk.");
    }
    if (operatingExpenseRatio > 0.5) {
      riskFlags.push("Operating expense ratio above 50%.");
    }
    if (debtYield > 0 && debtYield < 0.08) {
      riskFlags.push("Debt yield below 8% on current NOI.");
    }

    const strengths = [];
    if (cashFlowMonthly > 250) {
      strengths.push("Healthy monthly cash flow buffer.");
    }
    if (capRate >= 0.06) {
      strengths.push("Cap rate at or above 6%.");
    }
    if (cashOnCash >= 0.1) {
      strengths.push("Cash on cash returns above 10%.");
    }
    if (dscr >= inputs.dscrTarget) {
      strengths.push("DSCR meets lender requirements.");
    }
    if (rentToPrice >= 0.01) {
      strengths.push("Rent to price ratio is near the 1% rule.");
    }
    if (operatingExpenseRatio > 0 && operatingExpenseRatio <= 0.45) {
      strengths.push("Operating expense ratio under 45%.");
    }
    if (debtYield >= 0.09) {
      strengths.push("Debt yield above 9%.");
    }

    const recommendations = [];
    if (cashFlowMonthly < 0) {
      recommendations.push(
        "Negotiate price or reduce rehab scope to restore cash flow.",
      );
    }
    if (dscr < inputs.dscrTarget) {
      recommendations.push("Increase income or reduce expenses to raise DSCR.");
    }
    if (capRate < 0.05) {
      recommendations.push("Validate comps or trim expenses to lift NOI.");
    }
    if (operatingExpenseRatio > 0.5) {
      recommendations.push(
        "Trim operating expenses to improve the expense ratio.",
      );
    }
    if (debtYield > 0 && debtYield < 0.08) {
      recommendations.push(
        "Lower purchase price or lift NOI to raise debt yield.",
      );
    }
    if (recommendations.length === 0) {
      recommendations.push(
        "Metrics are balanced. Validate comps and lock financing.",
      );
    }

    const projectionYears = [1, 3, 5];
    const projection = projectionYears.map((year) => {
      const income =
        annualIncome * Math.pow(1 + inputs.rentGrowthRate / 100, year);
      const expenses =
        annualExpenses * Math.pow(1 + inputs.expenseGrowthRate / 100, year);
      const noi = income - expenses;
      const cashFlow = noi - annualDebtService;
      const value = price * Math.pow(1 + inputs.appreciationRate / 100, year);
      const balance = calcRemainingBalance(
        loanAmount,
        inputs.interestRate,
        inputs.termYears,
        year * 12,
      );
      const equity = value - balance;
      return {
        year,
        income,
        expenses,
        noi,
        cashFlow,
        value,
        balance,
        equity,
      };
    });

    const sensitivityRentSteps = [-0.05, 0, 0.05];
    const sensitivityVacancySteps = [-2, 0, 2];
    const calcCashFlow = (rent: number, vacancy: number) => {
      const gross = rent + inputs.otherIncomeMonthly;
      const vacancyLoss = gross * (vacancy / 100);
      const effective = gross - vacancyLoss;
      const maintenance = rent * (inputs.maintenancePct / 100);
      const management = gross * (inputs.managementPct / 100);
      const capex = rent * (inputs.capexPct / 100);
      const expenses =
        propertyTaxMonthly +
        inputs.insuranceMonthly +
        inputs.hoaMonthly +
        inputs.utilitiesMonthly +
        maintenance +
        management +
        capex +
        inputs.otherExpenseMonthly;
      const noi = effective - expenses;
      return noi - debtService;
    };
    const sensitivity = sensitivityVacancySteps.map((vacancyDelta) => {
      const vacancyValue = Math.max(inputs.vacancyPct + vacancyDelta, 0);
      return {
        vacancyDelta,
        values: sensitivityRentSteps.map((rentDelta) => {
          const rentValue = inputs.rentMonthly * (1 + rentDelta);
          return calcCashFlow(rentValue, vacancyValue);
        }),
      };
    });

    const breakdownItems = [
      { label: "Debt service", value: debtService, color: "bg-primary/80" },
      { label: "Taxes", value: propertyTaxMonthly, color: "bg-amber-500/70" },
      {
        label: "Insurance",
        value: inputs.insuranceMonthly,
        color: "bg-sky-500/70",
      },
      { label: "HOA", value: inputs.hoaMonthly, color: "bg-indigo-500/70" },
      {
        label: "Utilities",
        value: inputs.utilitiesMonthly,
        color: "bg-teal-500/70",
      },
      {
        label: "Maintenance",
        value: maintenance,
        color: "bg-emerald-500/70",
      },
      {
        label: "Management",
        value: management,
        color: "bg-violet-500/70",
      },
      { label: "Capex", value: capex, color: "bg-orange-500/70" },
      {
        label: "Other",
        value: inputs.otherExpenseMonthly,
        color: "bg-slate-500/70",
      },
    ].filter((item) => item.value > 0.5);

    return {
      price,
      downPayment,
      loanAmount,
      monthlyPI,
      closingCosts,
      pointsCost,
      cashNeeded,
      propertyTaxMonthly,
      grossIncome,
      vacancyLoss,
      effectiveIncome,
      operatingExpenses,
      debtService,
      noiMonthly,
      cashFlowMonthly,
      capRate,
      cashOnCash,
      dscr,
      breakEven,
      rentToPrice,
      grm,
      ltv,
      totalInterest,
      operatingExpenseRatio,
      debtYield,
      annualNoi,
      annualCashFlow,
      annualIncome,
      annualExpenses,
      annualDebtService,
      paybackYears,
      score,
      scoreLabel,
      scoreTone,
      riskFlags,
      strengths,
      recommendations,
      projection,
      sensitivity,
      breakdownItems,
    };
  }, [inputs]);

  const outflowTotal = metrics.breakdownItems.reduce(
    (sum, item) => sum + item.value,
    0,
  );

  const navLinks = [
    { href: "/chat", label: "Chat", Icon: MessageCircleMore },
    { href: "/insights", label: "Insights", Icon: GitBranch },
    { href: "/charts", label: "Charts", Icon: BarChart3 },
    { href: "/map", label: "Map", Icon: MapPin },
    { href: "/forums", label: "Forums", Icon: Users },
  ];
  const [navMenuOpen, setNavMenuOpen] = useState(false);

  return (
    <>
      <Head>
        <title>Deal Analyzer | EstateWise</title>
        <meta
          name="description"
          content="Underwrite deals with pro-level cash flow, debt coverage, and scenario modeling."
        />
      </Head>

      <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
        <div className="deal-analyzer-bg" />
        <div
          className="deal-grid absolute inset-0 opacity-40"
          style={{ zIndex: -1 }}
        />

        <header className="sticky top-0 z-30 w-full backdrop-blur-lg bg-background/90 border-b border-border">
          <div className="max-w-7xl mx-auto h-16 px-4 sm:px-6 flex items-center gap-3 w-full">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Calculator className="w-6 h-6 text-primary shrink-0" />
              <span className="font-extrabold tracking-tight text-lg truncate">
                Deal Analyzer
              </span>
            </div>
            <nav className="ml-auto flex items-center gap-3">
              <div className="hidden md:flex items-center gap-4">
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
              <div className="md:hidden relative">
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

        <motion.main
          className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8"
          variants={fadeUpContainer}
          initial="hidden"
          animate="show"
        >
          <motion.section
            className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] items-stretch"
            variants={fadeUpContainer}
          >
            <motion.div className="space-y-4" variants={fadeUpItem}>
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                <Calculator className="h-4 w-4" /> Deal Analyzer
              </span>
              <h1 className="text-3xl md:text-4xl font-bold leading-tight">
                Underwrite like a pro with instant cash flow modeling.
              </h1>
              <p className="text-muted-foreground max-w-2xl">
                Stress test rent, expenses, and debt coverage with a
                professional underwriting model. Adjust assumptions and see the
                impact on returns, risk, and equity growth.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border/60 bg-background/80 p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Cash flow / mo
                  </p>
                  <p className="text-xl font-semibold">
                    {formatMoney(metrics.cashFlowMonthly, true)}
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/80 p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Cap rate
                  </p>
                  <p className="text-xl font-semibold">
                    {formatPercent(metrics.capRate * 100, 2)}
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/80 p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Cash needed
                  </p>
                  <p className="text-xl font-semibold">
                    {formatMoney(metrics.cashNeeded)}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div variants={fadeUpItem}>
              <Card className="overflow-hidden border-primary/20 shadow-sm">
                <CardHeader className="space-y-2">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <LineChart className="h-5 w-5 text-primary" /> Scenario
                    presets
                  </CardTitle>
                  <CardDescription>
                    Apply a preset to move fast, then fine tune inputs below.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3">
                    {SCENARIOS.map((scenario) => (
                      <button
                        key={scenario.name}
                        onClick={() => applyScenario(scenario)}
                        className={`rounded-xl border px-4 py-3 text-left transition-all ${
                          activeScenario === scenario.name
                            ? "border-primary/60 bg-primary/10 shadow-sm"
                            : "border-border/60 bg-background/80 hover:border-primary/40 hover:bg-primary/5"
                        }`}
                      >
                        <p className="text-sm font-semibold">{scenario.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {scenario.tagline}
                        </p>
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                    <span>Active preset: {activeScenario}</span>
                    <Button variant="ghost" size="sm" onClick={resetDefaults}>
                      Reset
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.section>

          <motion.section
            className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"
            variants={fadeUpContainer}
          >
            <motion.div className="space-y-6" variants={fadeUpContainer}>
              <motion.div variants={fadeUpItem}>
                <Card>
                  <CardHeader>
                    <CardTitle>Property and financing</CardTitle>
                    <CardDescription>
                      Acquisition price, leverage, and loan structure.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Purchase price">
                        <Input
                          type="number"
                          min={0}
                          step={1000}
                          value={inputs.purchasePrice}
                          onChange={handleNumberChange("purchasePrice")}
                        />
                      </Field>
                      <Field label="Loan term (years)">
                        <Input
                          type="number"
                          min={5}
                          step={1}
                          value={inputs.termYears}
                          onChange={handleNumberChange("termYears")}
                        />
                      </Field>
                      <Field
                        label="Down payment (%)"
                        hint={`Cash: ${formatMoney(metrics.downPayment)}`}
                      >
                        <div className="grid gap-2">
                          <Input
                            type="number"
                            min={0}
                            max={50}
                            step={0.5}
                            value={inputs.downPaymentPct}
                            onChange={handleNumberChange("downPaymentPct")}
                          />
                          <Slider
                            value={[inputs.downPaymentPct]}
                            min={0}
                            max={40}
                            step={0.5}
                            onValueChange={handleSliderChange("downPaymentPct")}
                          />
                        </div>
                      </Field>
                      <Field label="Interest rate (APR %)">
                        <div className="grid gap-2">
                          <Input
                            type="number"
                            min={0}
                            step={0.05}
                            value={inputs.interestRate}
                            onChange={handleNumberChange("interestRate")}
                          />
                          <Slider
                            value={[inputs.interestRate]}
                            min={0}
                            max={12}
                            step={0.05}
                            onValueChange={handleSliderChange("interestRate")}
                          />
                        </div>
                      </Field>
                      <Field label="Closing costs (%)">
                        <Input
                          type="number"
                          min={0}
                          step={0.1}
                          value={inputs.closingCostPct}
                          onChange={handleNumberChange("closingCostPct")}
                        />
                      </Field>
                      <Field label="Loan points (%)">
                        <Input
                          type="number"
                          min={0}
                          step={0.1}
                          value={inputs.loanPointsPct}
                          onChange={handleNumberChange("loanPointsPct")}
                        />
                      </Field>
                      <Field label="Rehab budget">
                        <Input
                          type="number"
                          min={0}
                          step={1000}
                          value={inputs.rehabBudget}
                          onChange={handleNumberChange("rehabBudget")}
                        />
                      </Field>
                      <Field label="Mortgage insurance (monthly)">
                        <Input
                          type="number"
                          min={0}
                          step={10}
                          value={inputs.mortgageInsuranceMonthly}
                          onChange={handleNumberChange(
                            "mortgageInsuranceMonthly",
                          )}
                        />
                      </Field>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">
                          Finance rehab in loan
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Adds rehab budget to the loan balance.
                        </p>
                      </div>
                      <Switch
                        checked={inputs.financeRehab}
                        onCheckedChange={(checked) =>
                          updateInput("financeRehab", checked)
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={fadeUpItem}>
                <Card>
                  <CardHeader>
                    <CardTitle>Income assumptions</CardTitle>
                    <CardDescription>
                      Rental income, vacancy, and growth outlook.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Monthly rent">
                        <Input
                          type="number"
                          min={0}
                          step={50}
                          value={inputs.rentMonthly}
                          onChange={handleNumberChange("rentMonthly")}
                        />
                      </Field>
                      <Field label="Other monthly income">
                        <Input
                          type="number"
                          min={0}
                          step={10}
                          value={inputs.otherIncomeMonthly}
                          onChange={handleNumberChange("otherIncomeMonthly")}
                        />
                      </Field>
                      <Field label="Vacancy (%)">
                        <div className="grid gap-2">
                          <Input
                            type="number"
                            min={0}
                            max={20}
                            step={0.5}
                            value={inputs.vacancyPct}
                            onChange={handleNumberChange("vacancyPct")}
                          />
                          <Slider
                            value={[inputs.vacancyPct]}
                            min={0}
                            max={20}
                            step={0.5}
                            onValueChange={handleSliderChange("vacancyPct")}
                          />
                        </div>
                      </Field>
                      <Field label="Annual rent growth (%)">
                        <Input
                          type="number"
                          min={0}
                          step={0.1}
                          value={inputs.rentGrowthRate}
                          onChange={handleNumberChange("rentGrowthRate")}
                        />
                      </Field>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={fadeUpItem}>
                <Card>
                  <CardHeader>
                    <CardTitle>Operating expenses</CardTitle>
                    <CardDescription>
                      Taxes, insurance, reserves, and management fees.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Property tax rate (%)">
                        <Input
                          type="number"
                          min={0}
                          step={0.05}
                          value={inputs.propertyTaxRate}
                          onChange={handleNumberChange("propertyTaxRate")}
                        />
                      </Field>
                      <Field label="Insurance (monthly)">
                        <Input
                          type="number"
                          min={0}
                          step={10}
                          value={inputs.insuranceMonthly}
                          onChange={handleNumberChange("insuranceMonthly")}
                        />
                      </Field>
                      <Field label="HOA (monthly)">
                        <Input
                          type="number"
                          min={0}
                          step={10}
                          value={inputs.hoaMonthly}
                          onChange={handleNumberChange("hoaMonthly")}
                        />
                      </Field>
                      <Field label="Utilities (monthly)">
                        <Input
                          type="number"
                          min={0}
                          step={10}
                          value={inputs.utilitiesMonthly}
                          onChange={handleNumberChange("utilitiesMonthly")}
                        />
                      </Field>
                      <Field label="Maintenance (% of rent)">
                        <Input
                          type="number"
                          min={0}
                          step={0.5}
                          value={inputs.maintenancePct}
                          onChange={handleNumberChange("maintenancePct")}
                        />
                      </Field>
                      <Field label="Management (% of income)">
                        <Input
                          type="number"
                          min={0}
                          step={0.5}
                          value={inputs.managementPct}
                          onChange={handleNumberChange("managementPct")}
                        />
                      </Field>
                      <Field label="Capital reserves (% of rent)">
                        <Input
                          type="number"
                          min={0}
                          step={0.5}
                          value={inputs.capexPct}
                          onChange={handleNumberChange("capexPct")}
                        />
                      </Field>
                      <Field label="Other expenses (monthly)">
                        <Input
                          type="number"
                          min={0}
                          step={10}
                          value={inputs.otherExpenseMonthly}
                          onChange={handleNumberChange("otherExpenseMonthly")}
                        />
                      </Field>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={fadeUpItem}>
                <Card>
                  <CardHeader>
                    <CardTitle>Growth and targets</CardTitle>
                    <CardDescription>
                      Tune your long term assumptions and lender targets.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <Field label="Appreciation (%)">
                      <Input
                        type="number"
                        min={0}
                        step={0.1}
                        value={inputs.appreciationRate}
                        onChange={handleNumberChange("appreciationRate")}
                      />
                    </Field>
                    <Field label="Expense growth (%)">
                      <Input
                        type="number"
                        min={0}
                        step={0.1}
                        value={inputs.expenseGrowthRate}
                        onChange={handleNumberChange("expenseGrowthRate")}
                      />
                    </Field>
                    <Field label="DSCR target">
                      <Input
                        type="number"
                        min={1}
                        step={0.05}
                        value={inputs.dscrTarget}
                        onChange={handleNumberChange("dscrTarget")}
                      />
                    </Field>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>

            <motion.div className="space-y-6" variants={fadeUpContainer}>
              <motion.div variants={fadeUpItem}>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-primary" /> Deal
                        score
                      </CardTitle>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${metrics.scoreTone}`}
                      >
                        {metrics.scoreLabel}
                      </span>
                    </div>
                    <CardDescription>
                      Composite score across cash flow, leverage, and coverage.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-baseline gap-3">
                      <p className="text-4xl font-bold">
                        {Math.round(metrics.score)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        score out of 100
                      </p>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${Math.round(metrics.score)}%` }}
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Metric
                        label="Monthly cash flow"
                        value={formatMoney(metrics.cashFlowMonthly, true)}
                        detail={`Annual: ${formatMoney(metrics.annualCashFlow)}`}
                        tone={
                          metrics.cashFlowMonthly >= 0 ? "positive" : "negative"
                        }
                      />
                      <Metric
                        label="Cap rate"
                        value={formatPercent(metrics.capRate * 100, 2)}
                        detail={`NOI: ${formatMoney(metrics.annualNoi)}`}
                        tone={metrics.capRate >= 0.06 ? "positive" : "neutral"}
                      />
                      <Metric
                        label="Cash on cash"
                        value={formatPercent(metrics.cashOnCash * 100, 2)}
                        detail={`Cash needed: ${formatMoney(metrics.cashNeeded)}`}
                        tone={
                          metrics.cashOnCash >= 0.1 ? "positive" : "neutral"
                        }
                      />
                      <Metric
                        label="DSCR"
                        value={formatRatio(metrics.dscr)}
                        detail={`Target: ${inputs.dscrTarget.toFixed(2)}`}
                        tone={
                          metrics.dscr >= inputs.dscrTarget
                            ? "positive"
                            : "negative"
                        }
                      />
                    </div>
                    <Separator />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Metric
                        label="Loan amount"
                        value={formatMoney(metrics.loanAmount)}
                        detail={`LTV: ${formatPercent(metrics.ltv * 100, 1)}`}
                      />
                      <Metric
                        label="Payment (P&I)"
                        value={formatMoney(metrics.monthlyPI, true)}
                        detail={`Total interest: ${formatMoney(metrics.totalInterest)}`}
                      />
                    </div>
                    <Separator />
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Metric
                        label="Rent to price"
                        value={formatPercent(metrics.rentToPrice * 100, 2)}
                        detail="Annual rent / price"
                      />
                      <Metric
                        label="GRM"
                        value={
                          Number.isFinite(metrics.grm)
                            ? formatRatio(metrics.grm, 1)
                            : "N/A"
                        }
                        detail="Price / gross rent"
                      />
                      <Metric
                        label="Payback"
                        value={
                          metrics.paybackYears
                            ? `${metrics.paybackYears.toFixed(1)} yrs`
                            : "N/A"
                        }
                        detail="Cash needed / cash flow"
                        tone={
                          metrics.paybackYears && metrics.paybackYears <= 10
                            ? "positive"
                            : "neutral"
                        }
                      />
                    </div>
                    <Separator />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Metric
                        label="OpEx ratio"
                        value={formatPercent(
                          metrics.operatingExpenseRatio * 100,
                          1,
                        )}
                        detail="OpEx / effective income"
                        tone={
                          metrics.operatingExpenseRatio > 0 &&
                          metrics.operatingExpenseRatio <= 0.45
                            ? "positive"
                            : "neutral"
                        }
                      />
                      <Metric
                        label="Debt yield"
                        value={formatPercent(metrics.debtYield * 100, 2)}
                        detail="NOI / loan amount"
                        tone={
                          metrics.debtYield >= 0.08 ? "positive" : "neutral"
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={fadeUpItem}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-primary" /> Monthly
                      breakdown
                    </CardTitle>
                    <CardDescription>
                      Expense composition and operating performance.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-lg border border-border/60 bg-background/80 p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Effective income
                        </p>
                        <p className="text-lg font-semibold">
                          {formatMoney(metrics.effectiveIncome, true)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-background/80 p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          NOI
                        </p>
                        <p className="text-lg font-semibold">
                          {formatMoney(metrics.noiMonthly, true)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-background/80 p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Debt service
                        </p>
                        <p className="text-lg font-semibold">
                          {formatMoney(metrics.debtService, true)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-background/80 p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Break even
                        </p>
                        <p className="text-lg font-semibold">
                          {formatPercent(metrics.breakEven * 100, 1)}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="h-3 rounded-full bg-muted overflow-hidden flex">
                        {metrics.breakdownItems.map((item) => (
                          <div
                            key={item.label}
                            className={item.color}
                            style={{
                              width: `${Math.max(
                                (item.value / Math.max(outflowTotal, 1)) * 100,
                                2,
                              )}%`,
                            }}
                          />
                        ))}
                      </div>
                      <div className="grid gap-2 text-sm">
                        {metrics.breakdownItems.map((item) => (
                          <div
                            key={item.label}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`h-2 w-2 rounded-full ${item.color}`}
                              />
                              <span>{item.label}</span>
                            </div>
                            <span className="font-medium">
                              {formatMoney(item.value, true)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={fadeUpItem}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <LineChart className="h-5 w-5 text-primary" /> Sensitivity
                    </CardTitle>
                    <CardDescription>
                      Monthly cash flow under rent and vacancy shifts.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div />
                      {["-5% rent", "Base rent", "+5% rent"].map((label) => (
                        <div
                          key={label}
                          className="text-center font-semibold text-muted-foreground"
                        >
                          {label}
                        </div>
                      ))}
                      {metrics.sensitivity.map((row) => (
                        <React.Fragment key={row.vacancyDelta}>
                          <div className="rounded-lg border border-border/60 bg-muted/30 px-2 py-2 text-center font-semibold text-muted-foreground">
                            {row.vacancyDelta >= 0 ? "+" : ""}
                            {row.vacancyDelta}% vac
                          </div>
                          {row.values.map((value, idx) => {
                            const tone =
                              value >= 250
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                : value >= 0
                                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                  : "bg-rose-500/15 text-rose-700 dark:text-rose-300";
                            return (
                              <div
                                key={`${row.vacancyDelta}-${idx}`}
                                className={`rounded-lg px-2 py-2 text-center font-semibold ${tone}`}
                              >
                                {formatMoney(value, true)}
                              </div>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={fadeUpItem}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" /> Projection
                    </CardTitle>
                    <CardDescription>
                      Estimated equity and cash flow over time.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-3">
                    {metrics.projection.map((point) => (
                      <div
                        key={point.year}
                        className="rounded-xl border border-border/60 bg-background/80 p-4"
                      >
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Year {point.year}
                        </p>
                        <p className="text-lg font-semibold">
                          {formatMoney(point.value)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Property value
                        </p>
                        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                          <div className="flex items-center justify-between">
                            <span>Equity</span>
                            <span className="font-semibold text-foreground">
                              {formatMoney(point.equity)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Annual cash flow</span>
                            <span className="font-semibold text-foreground">
                              {formatMoney(point.cashFlow)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={fadeUpItem}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-primary" /> Risk
                      and action plan
                    </CardTitle>
                    <CardDescription>
                      Strengths, red flags, and the next best moves.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-border/60 bg-background/80 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                        Strengths
                      </div>
                      <ul className="mt-2 space-y-2 text-sm text-muted-foreground list-disc list-inside">
                        {metrics.strengths.length ? (
                          metrics.strengths.map((item) => (
                            <li key={item}>{item}</li>
                          ))
                        ) : (
                          <li>No clear strengths yet. Tighten assumptions.</li>
                        )}
                      </ul>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/80 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Watchlist
                      </div>
                      <ul className="mt-2 space-y-2 text-sm text-muted-foreground list-disc list-inside">
                        {metrics.riskFlags.length ? (
                          metrics.riskFlags.map((item) => (
                            <li key={item}>{item}</li>
                          ))
                        ) : (
                          <li>No material risks flagged at this time.</li>
                        )}
                      </ul>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-primary/5 p-4 sm:col-span-2">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <ShieldAlert className="h-4 w-4 text-primary" />
                        Recommended moves
                      </div>
                      <ul className="mt-2 space-y-2 text-sm text-muted-foreground list-disc list-inside">
                        {metrics.recommendations.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </motion.section>
          <motion.div
            className="mt-10 pt-6 border-t border-border/60 text-xs text-muted-foreground text-center"
            variants={fadeUpItem}
          >
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
          </motion.div>
        </motion.main>
        <style jsx>{`
          .deal-analyzer-bg {
            position: absolute;
            inset: 0;
            z-index: -2;
            background:
              radial-gradient(
                900px 500px at 85% -10%,
                rgba(255, 191, 113, 0.35),
                transparent 60%
              ),
              radial-gradient(
                800px 520px at 10% 10%,
                rgba(99, 144, 255, 0.25),
                transparent 55%
              ),
              linear-gradient(180deg, rgba(255, 255, 255, 0.6), transparent 45%);
          }

          :global(.dark) .deal-analyzer-bg {
            background:
              radial-gradient(
                900px 500px at 85% -10%,
                rgba(198, 116, 58, 0.35),
                transparent 60%
              ),
              radial-gradient(
                800px 520px at 10% 10%,
                rgba(67, 107, 214, 0.25),
                transparent 55%
              ),
              linear-gradient(180deg, rgba(16, 16, 16, 0.65), transparent 50%);
          }

          .deal-grid {
            background-image:
              linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px);
            background-size: 28px 28px;
            mask-image: radial-gradient(
              circle at top,
              black 25%,
              transparent 70%
            );
          }

          :global(.dark) .deal-grid {
            background-image:
              linear-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px),
              linear-gradient(
                90deg,
                rgba(255, 255, 255, 0.06) 1px,
                transparent 1px
              );
          }
        `}</style>
      </div>
    </>
  );
}
