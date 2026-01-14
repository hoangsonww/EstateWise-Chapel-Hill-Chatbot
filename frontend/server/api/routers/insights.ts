import { inferRouterOutputs } from "@trpc/server";
import { z } from "zod";

import { publicProcedure, router } from "../trpc";

type MarketSeriesPoint = {
  month: string;
  demandIndex: number;
  absorptionRate: number;
};

type MarketDataset = {
  id: string;
  name: string;
  queries: string[];
  summary: string;
  datasetVersion: string;
  metrics: {
    medianListPrice: number;
    yoyPriceChange: number;
    inventoryMonths: number;
    rentYield: number;
    affordabilityIndex: number;
    jobGrowth: number;
  };
  timeline: MarketSeriesPoint[];
  topZips: Array<{
    name: string;
    medianPrice: number;
    rentYield: number;
    yoy: number;
  }>;
  opportunities: string[];
  risks: string[];
  actions: Array<{
    label: string;
    description: string;
    impact: "low" | "medium" | "high";
  }>;
};

const MARKET_DATASETS: MarketDataset[] = [
  {
    id: "austin-tx",
    name: "Austin, TX",
    queries: ["austin", "austin tx", "texas", "travis county", "pflugerville"],
    summary:
      "Tech hiring has stabilized and inventory remains tight, creating a window for buyers who can move quickly on competitively priced inventory below $650k.",
    datasetVersion: "2024-Q4",
    metrics: {
      medianListPrice: 612000,
      yoyPriceChange: 2.4,
      inventoryMonths: 2.7,
      rentYield: 4.2,
      affordabilityIndex: 96,
      jobGrowth: 4.1,
    },
    timeline: [
      { month: "May", demandIndex: 58, absorptionRate: 29 },
      { month: "Jun", demandIndex: 61, absorptionRate: 32 },
      { month: "Jul", demandIndex: 65, absorptionRate: 33 },
      { month: "Aug", demandIndex: 68, absorptionRate: 35 },
      { month: "Sep", demandIndex: 71, absorptionRate: 36 },
      { month: "Oct", demandIndex: 69, absorptionRate: 34 },
    ],
    topZips: [
      {
        name: "78745 – South Austin",
        medianPrice: 548000,
        rentYield: 4.6,
        yoy: 3.1,
      },
      {
        name: "78660 – Pflugerville",
        medianPrice: 489000,
        rentYield: 4.9,
        yoy: 4.4,
      },
      {
        name: "78702 – East Austin",
        medianPrice: 659000,
        rentYield: 4.1,
        yoy: 1.8,
      },
    ],
    opportunities: [
      "Builder incentives covering rate buydowns average 1.2% of loan value.",
      "Sub-650k listings receive 40% fewer competing offers than 2023 levels.",
      "Corporate relocations continue to underpin rental absorption in Class B units.",
    ],
    risks: [
      "Luxury segment ($1.2M+) still correcting with higher days-on-market.",
      "Property tax reassessments likely to lift carrying costs mid-2025.",
      "New Class A multifamily supply pressuring top-tier rental growth downtown.",
    ],
    actions: [
      {
        label: "Target energy-efficient rehabs",
        description:
          "Homes built 1995-2008 in South Austin qualify for Austin Energy rebates; upgrading HVAC/insulation boosts rentability and resale value.",
        impact: "high",
      },
      {
        label: "Lock builder rate buydowns",
        description:
          "Pair a 2-1 buydown with lender credits to keep first-year P&I below $3,400 on a $580k purchase.",
        impact: "medium",
      },
      {
        label: "Position for 2025 refinance",
        description:
          "Maintain clean payment history and monitor mid-2025 rate cycle to refinance once spreads compress by 75 bps.",
        impact: "medium",
      },
    ],
  },
  {
    id: "charlotte-nc",
    name: "Charlotte, NC",
    queries: ["charlotte", "nc", "north carolina", "mecklenburg county"],
    summary:
      "In-migration from the Northeast keeps entry-level inventory extremely tight; rental yields remain healthy with strong bank and fintech hiring.",
    datasetVersion: "2024-Q4",
    metrics: {
      medianListPrice: 432000,
      yoyPriceChange: 4.7,
      inventoryMonths: 1.9,
      rentYield: 5.5,
      affordabilityIndex: 109,
      jobGrowth: 3.6,
    },
    timeline: [
      { month: "May", demandIndex: 63, absorptionRate: 34 },
      { month: "Jun", demandIndex: 66, absorptionRate: 36 },
      { month: "Jul", demandIndex: 69, absorptionRate: 38 },
      { month: "Aug", demandIndex: 73, absorptionRate: 40 },
      { month: "Sep", demandIndex: 75, absorptionRate: 39 },
      { month: "Oct", demandIndex: 74, absorptionRate: 37 },
    ],
    topZips: [
      {
        name: "28277 – Ballantyne",
        medianPrice: 512000,
        rentYield: 5.2,
        yoy: 5.1,
      },
      {
        name: "28213 – University City",
        medianPrice: 355000,
        rentYield: 5.9,
        yoy: 6.3,
      },
      {
        name: "28173 – Weddington",
        medianPrice: 618000,
        rentYield: 5.0,
        yoy: 4.6,
      },
    ],
    opportunities: [
      "Townhome inventory under $400k clears in fewer than 18 days on average.",
      "Major employers (Bank of America, Honeywell) expanding headcount Q1 2025.",
      "Risk-adjusted rent growth forecasts 5.1% in 2025 across Class B assets.",
    ],
    risks: [
      "Property insurance premiums up 11% YoY across Mecklenburg County.",
      "Impact of recent floodplain remapping increases due-diligence overhead.",
      "Competition from build-to-rent operators in outer-ring suburbs.",
    ],
    actions: [
      {
        label: "Prioritize pre-inspected listings",
        description:
          "Use pre-inspection reports to accelerate closings and avoid protracted repair credits in fast-moving submarkets.",
        impact: "high",
      },
      {
        label: "Layer rent escalators into leases",
        description:
          "Structure 3% year-two escalators to capture projected rent growth while keeping renewal friction low.",
        impact: "medium",
      },
      {
        label: "Evaluate insurance bundling",
        description:
          "Bundle property policies with umbrella coverage to offset double-digit premium increases.",
        impact: "low",
      },
    ],
  },
  {
    id: "phoenix-az",
    name: "Phoenix, AZ",
    queries: ["phoenix", "az", "arizona", "maricopa"],
    summary:
      "Cooling migration and ample new supply create negotiating leverage, but investors still find strong rent-to-price spreads in workforce housing.",
    datasetVersion: "2024-Q4",
    metrics: {
      medianListPrice: 438000,
      yoyPriceChange: 0.9,
      inventoryMonths: 3.4,
      rentYield: 5.1,
      affordabilityIndex: 101,
      jobGrowth: 2.8,
    },
    timeline: [
      { month: "May", demandIndex: 49, absorptionRate: 24 },
      { month: "Jun", demandIndex: 51, absorptionRate: 25 },
      { month: "Jul", demandIndex: 54, absorptionRate: 27 },
      { month: "Aug", demandIndex: 58, absorptionRate: 28 },
      { month: "Sep", demandIndex: 60, absorptionRate: 28 },
      { month: "Oct", demandIndex: 59, absorptionRate: 27 },
    ],
    topZips: [
      {
        name: "85032 – Paradise Valley Village",
        medianPrice: 412000,
        rentYield: 5.4,
        yoy: 2.4,
      },
      {
        name: "85308 – Glendale",
        medianPrice: 396000,
        rentYield: 5.6,
        yoy: 1.9,
      },
      {
        name: "85225 – Chandler",
        medianPrice: 448000,
        rentYield: 5.0,
        yoy: 1.3,
      },
    ],
    opportunities: [
      "Seller concessions averaging $9,800 on resales provide room for rate buydowns.",
      "Short-term rental saturation is easing, boosting long-term rental absorption.",
      "Manufacturing projects (TSMC) sustain blue-collar wage growth.",
    ],
    risks: [
      "Water policy changes may affect permitting timelines in 2025.",
      "Heat mitigation retrofits add $6-8k to renovation budgets on older stock.",
      "Insurance carriers scrutinize roof age; plan for replacement credits.",
    ],
    actions: [
      {
        label: "Negotiate seller-paid rate buydowns",
        description:
          "Combine concessions with temporary buydowns to keep first-year cap rates attractive without over-leveraging.",
        impact: "high",
      },
      {
        label: "Budget for heat resilience upgrades",
        description:
          "Allocate $7k for radiant barriers and smart thermostats to improve tenant retention during peak summer months.",
        impact: "medium",
      },
      {
        label: "Screen water policy developments",
        description:
          "Track ADWR announcements to avoid submarkets facing future well restrictions.",
        impact: "low",
      },
    ],
  },
  {
    id: "chapel-hill-nc",
    name: "Chapel Hill, NC",
    queries: [
      "chapel hill",
      "chapel hill nc",
      "orange county nc",
      "durham-chapel hill",
    ],
    summary:
      "University-town demand from UNC and Research Triangle employers keeps vacancy tight; mid-tier homes see resilient absorption despite higher carrying costs.",
    datasetVersion: "2024-Q4",
    metrics: {
      medianListPrice: 648000,
      yoyPriceChange: 3.2,
      inventoryMonths: 2.4,
      rentYield: 4.1,
      affordabilityIndex: 102,
      jobGrowth: 2.9,
    },
    timeline: [
      { month: "May", demandIndex: 62, absorptionRate: 31 },
      { month: "Jun", demandIndex: 64, absorptionRate: 32 },
      { month: "Jul", demandIndex: 67, absorptionRate: 33 },
      { month: "Aug", demandIndex: 69, absorptionRate: 34 },
      { month: "Sep", demandIndex: 70, absorptionRate: 34 },
      { month: "Oct", demandIndex: 68, absorptionRate: 33 },
    ],
    topZips: [
      {
        name: "27516 – Southern Village",
        medianPrice: 675000,
        rentYield: 4.2,
        yoy: 3.5,
      },
      {
        name: "27514 – East Franklin",
        medianPrice: 628000,
        rentYield: 4.0,
        yoy: 2.7,
      },
      {
        name: "27707 – Chapel Hill/Durham",
        medianPrice: 592000,
        rentYield: 4.4,
        yoy: 3.9,
      },
    ],
    opportunities: [
      "Faculty relocation cycle creates predictable Q2-Q3 leasing surges.",
      "Solar and energy retrofit incentives from Duke Energy reduce operating costs.",
      "Build-to-rent operators focusing on Pittsboro leave in-town supply tight.",
    ],
    risks: [
      "County tax reassessments slated for 2025 could raise escrow payments.",
      "Limited contractor availability extends renovation timelines.",
      "HOA approvals in historic districts can delay exterior upgrades.",
    ],
    actions: [
      {
        label: "Target walk-to-campus inventory",
        description:
          "Two- to four-bedroom homes within bike range of UNC rent rapidly; budget for premium leasing packages to capture graduate student demand.",
        impact: "high",
      },
      {
        label: "Leverage energy retrofit rebates",
        description:
          "Apply Duke Energy rebates to offset HVAC upgrades and market eco-friendly positioning in listings.",
        impact: "medium",
      },
      {
        label: "Balance short-term rentals with regulations",
        description:
          "Review Chapel Hill STR cap rules and consider medium-term rentals for visiting faculty to maintain occupancy.",
        impact: "low",
      },
    ],
  },
  {
    id: "raleigh-nc",
    name: "Raleigh, NC",
    queries: ["raleigh", "wake county", "triangle", "raleigh nc"],
    summary:
      "State government stability and tech hiring sustain demand; multiple build-to-rent communities add competition in outer-ring suburbs.",
    datasetVersion: "2024-Q4",
    metrics: {
      medianListPrice: 489000,
      yoyPriceChange: 4.1,
      inventoryMonths: 2.1,
      rentYield: 5.0,
      affordabilityIndex: 108,
      jobGrowth: 3.4,
    },
    timeline: [
      { month: "May", demandIndex: 65, absorptionRate: 35 },
      { month: "Jun", demandIndex: 67, absorptionRate: 36 },
      { month: "Jul", demandIndex: 70, absorptionRate: 37 },
      { month: "Aug", demandIndex: 72, absorptionRate: 38 },
      { month: "Sep", demandIndex: 73, absorptionRate: 38 },
      { month: "Oct", demandIndex: 71, absorptionRate: 37 },
    ],
    topZips: [
      {
        name: "27603 – Southwest Raleigh",
        medianPrice: 452000,
        rentYield: 5.2,
        yoy: 4.4,
      },
      {
        name: "27616 – Northeast Raleigh",
        medianPrice: 399000,
        rentYield: 5.5,
        yoy: 5.1,
      },
      {
        name: "27587 – Wake Forest",
        medianPrice: 515000,
        rentYield: 4.9,
        yoy: 3.8,
      },
    ],
    opportunities: [
      "Wake Tech expansion increases demand for mid-priced rentals.",
      "State relocations release buy-side concessions above $600k.",
      "Value-add townhomes in Garner show strong rent growth with cosmetic upgrades.",
    ],
    risks: [
      "Insurance premiums up 9% YoY across Wake County.",
      "Construction backlogs for tri-plex builds stretch loan carry costs.",
      "DOT roadworks near I-540 impacting lease-up timing in Holly Springs.",
    ],
    actions: [
      {
        label: "Bid on pre-inspected resales",
        description:
          "Many listings include pre-inspections; use them to accelerate closings and win in competitive bids.",
        impact: "high",
      },
      {
        label: "Hedge insurance costs early",
        description:
          "Bundle property and liability policies and lock rates before renewal increases hit mid-2025.",
        impact: "medium",
      },
      {
        label: "Offer institutional-grade amenities",
        description:
          "Wi-Fi packages and smart locks help differentiate build-to-rent inventory in outer suburbs.",
        impact: "low",
      },
    ],
  },
  {
    id: "durham-nc",
    name: "Durham, NC",
    queries: ["durham", "bull city", "durham nc", "research triangle"],
    summary:
      "Life sciences hiring and Duke Health expansions support rent growth; downtown condo conversions add supply but suburban SFR remains tight.",
    datasetVersion: "2024-Q4",
    metrics: {
      medianListPrice: 428000,
      yoyPriceChange: 5.0,
      inventoryMonths: 2.0,
      rentYield: 5.3,
      affordabilityIndex: 111,
      jobGrowth: 3.7,
    },
    timeline: [
      { month: "May", demandIndex: 66, absorptionRate: 36 },
      { month: "Jun", demandIndex: 68, absorptionRate: 37 },
      { month: "Jul", demandIndex: 71, absorptionRate: 38 },
      { month: "Aug", demandIndex: 74, absorptionRate: 39 },
      { month: "Sep", demandIndex: 75, absorptionRate: 39 },
      { month: "Oct", demandIndex: 73, absorptionRate: 38 },
    ],
    topZips: [
      {
        name: "27713 – Southpoint",
        medianPrice: 452000,
        rentYield: 5.4,
        yoy: 5.2,
      },
      {
        name: "27704 – Northeast Durham",
        medianPrice: 335000,
        rentYield: 5.8,
        yoy: 6.1,
      },
      {
        name: "27705 – Duke Forest",
        medianPrice: 512000,
        rentYield: 5.0,
        yoy: 4.5,
      },
    ],
    opportunities: [
      "Biotech expansions demand short to medium-term furnished rentals.",
      "Downtown adaptive reuse projects offer condo-to-rental arbitrage opportunities.",
      "City incentives for affordable units can offset permit fees in select tracts.",
    ],
    risks: [
      "Property taxes adjusted for bond issuances may lift escrow needs.",
      "Historic district approvals add lead time for exterior work.",
      "Competition from institutional SFR players in RTP submarkets.",
    ],
    actions: [
      {
        label: "Align leases with Duke academic calendar",
        description:
          "Structure August move-ins to match graduate programs, reducing vacancy risk.",
        impact: "high",
      },
      {
        label: "Offer lab-worker focused amenities",
        description:
          "Air filtration upgrades and office nooks attract life-science tenants.",
        impact: "medium",
      },
      {
        label: "Monitor condo conversions downtown",
        description:
          "Track new supply to adjust rent projections for adjacent assets.",
        impact: "low",
      },
    ],
  },
  {
    id: "atlanta-ga",
    name: "Atlanta, GA",
    queries: ["atlanta", "atl", "fulton county", "atlanta ga"],
    summary:
      "Corporate relocations and film industry growth power rental absorption; suburban inventory normalizes but in-town SFR remains supply constrained.",
    datasetVersion: "2024-Q4",
    metrics: {
      medianListPrice: 435000,
      yoyPriceChange: 2.9,
      inventoryMonths: 2.8,
      rentYield: 5.2,
      affordabilityIndex: 104,
      jobGrowth: 3.1,
    },
    timeline: [
      { month: "May", demandIndex: 60, absorptionRate: 30 },
      { month: "Jun", demandIndex: 62, absorptionRate: 31 },
      { month: "Jul", demandIndex: 65, absorptionRate: 32 },
      { month: "Aug", demandIndex: 67, absorptionRate: 32 },
      { month: "Sep", demandIndex: 68, absorptionRate: 31 },
      { month: "Oct", demandIndex: 66, absorptionRate: 30 },
    ],
    topZips: [
      {
        name: "30318 – West Midtown",
        medianPrice: 458000,
        rentYield: 5.3,
        yoy: 3.3,
      },
      {
        name: "30044 – Lawrenceville",
        medianPrice: 362000,
        rentYield: 5.7,
        yoy: 4.1,
      },
      {
        name: "30349 – South Fulton",
        medianPrice: 305000,
        rentYield: 5.9,
        yoy: 4.6,
      },
    ],
    opportunities: [
      "Film studio expansions in Fayette County drive corporate leasing demand.",
      "iBuyers unloading inventory create below-market deals in select ZIPs.",
      "Transit-oriented developments near MARTA lines draw premium rents.",
    ],
    risks: [
      "Insurance costs rising in storm-prone exurbs.",
      "Short-term rental regulations tightening inside Atlanta city limits.",
      "Labor shortages raising renovation bids by 12-15%.",
    ],
    actions: [
      {
        label: "Bundle insurance early",
        description:
          "Lock in multi-property policies to tame double-digit premium increases across the metro.",
        impact: "high",
      },
      {
        label: "Invest in transit-adjacent rehabs",
        description:
          "Target value-add assets within 0.5 miles of MARTA stations where rent premiums average $180/mo.",
        impact: "medium",
      },
      {
        label: "Screen STR ordinances before acquisition",
        description:
          "Confirm zoning when underwriting short-term rental plays to avoid compliance expenditures.",
        impact: "low",
      },
    ],
  },
  {
    id: "denver-co",
    name: "Denver, CO",
    queries: ["denver", "denver metro", "denver co", "mile high"],
    summary:
      "In-migration moderates but hybrid tech and energy employers maintain demand; condo inventory up while detached homes remain competitive.",
    datasetVersion: "2024-Q4",
    metrics: {
      medianListPrice: 612000,
      yoyPriceChange: 1.5,
      inventoryMonths: 3.0,
      rentYield: 4.8,
      affordabilityIndex: 99,
      jobGrowth: 2.6,
    },
    timeline: [
      { month: "May", demandIndex: 57, absorptionRate: 28 },
      { month: "Jun", demandIndex: 59, absorptionRate: 29 },
      { month: "Jul", demandIndex: 62, absorptionRate: 30 },
      { month: "Aug", demandIndex: 64, absorptionRate: 30 },
      { month: "Sep", demandIndex: 65, absorptionRate: 29 },
      { month: "Oct", demandIndex: 63, absorptionRate: 28 },
    ],
    topZips: [
      {
        name: "80211 – Highlands",
        medianPrice: 689000,
        rentYield: 4.5,
        yoy: 2.1,
      },
      {
        name: "80209 – Wash Park",
        medianPrice: 712000,
        rentYield: 4.3,
        yoy: 1.8,
      },
      { name: "80013 – Aurora", medianPrice: 455000, rentYield: 5.1, yoy: 3.2 },
    ],
    opportunities: [
      "Accessory dwelling unit (ADU) reforms enable cash-flow boosts in central neighborhoods.",
      "Corporate relocations in aerospace broaden renter pool in South Denver.",
      "Mountain-west migration keeps build-to-rent demand strong in suburbs like Parker.",
    ],
    risks: [
      "Snowpack variability pressures water policy and long-term permits.",
      "Insurance carriers scrutinize wildfire exposure near the foothills.",
      "Rising HOA dues in resort-style communities impact net operating income.",
    ],
    actions: [
      {
        label: "Add ADUs where zoning allows",
        description:
          "Leverage Denver’s relaxed ADU rules to create secondary income streams on larger lots.",
        impact: "high",
      },
      {
        label: "Budget for mitigation upgrades",
        description:
          "Invest in fire-resistant materials and insurance riders for assets near the Front Range.",
        impact: "medium",
      },
      {
        label: "Monitor HOA budgets annually",
        description:
          "Review HOA reserves and upcoming assessments to protect cash flow projections.",
        impact: "low",
      },
    ],
  },
  {
    id: "seattle-wa",
    name: "Seattle, WA",
    queries: ["seattle", "king county", "seattle wa", "puget sound"],
    summary:
      "Tech hiring is cautious but stabilizing; detached home supply remains tight inside the city while Eastside multifamily adds competition.",
    datasetVersion: "2024-Q4",
    metrics: {
      medianListPrice: 769000,
      yoyPriceChange: 1.9,
      inventoryMonths: 2.6,
      rentYield: 4.0,
      affordabilityIndex: 92,
      jobGrowth: 2.3,
    },
    timeline: [
      { month: "May", demandIndex: 56, absorptionRate: 27 },
      { month: "Jun", demandIndex: 58, absorptionRate: 28 },
      { month: "Jul", demandIndex: 60, absorptionRate: 29 },
      { month: "Aug", demandIndex: 62, absorptionRate: 29 },
      { month: "Sep", demandIndex: 63, absorptionRate: 28 },
      { month: "Oct", demandIndex: 61, absorptionRate: 27 },
    ],
    topZips: [
      {
        name: "98103 – Fremont/Wallingford",
        medianPrice: 785000,
        rentYield: 4.1,
        yoy: 2.3,
      },
      {
        name: "98052 – Redmond",
        medianPrice: 812000,
        rentYield: 4.2,
        yoy: 2.8,
      },
      {
        name: "98115 – North Seattle",
        medianPrice: 748000,
        rentYield: 4.0,
        yoy: 1.7,
      },
    ],
    opportunities: [
      "Light rail expansion spurs premium rents near Roosevelt and Bellevue corridors.",
      "Amazon’s return-to-office policies lift demand for in-city rentals.",
      "Accessory dwelling units popular in Ballard add extra income per lot.",
    ],
    risks: [
      "Property taxes trending higher following levies for schools and transit.",
      "Rent control discussions in Olympia could affect future increases.",
      "Permitting timelines remain long for major remodels.",
    ],
    actions: [
      {
        label: "Target light-rail adjacent assets",
        description:
          "Capitalize on new Lynnwood Link stations where rent premiums exceed $250/mo.",
        impact: "high",
      },
      {
        label: "Layer corporate housing offerings",
        description:
          "Offer furnished leases to capture tech relocation budgets.",
        impact: "medium",
      },
      {
        label: "Plan for permit lead times",
        description:
          "Submit remodel plans early given Seattle’s extended review cycles.",
        impact: "low",
      },
    ],
  },
  {
    id: "miami-fl",
    name: "Miami, FL",
    queries: ["miami", "miami-dade", "south florida", "miami fl"],
    summary:
      "Net in-migration and foreign capital support luxury demand, while climate premiums raise operating costs; suburban SFR stays competitive.",
    datasetVersion: "2024-Q4",
    metrics: {
      medianListPrice: 598000,
      yoyPriceChange: 3.4,
      inventoryMonths: 3.2,
      rentYield: 5.6,
      affordabilityIndex: 86,
      jobGrowth: 3.1,
    },
    timeline: [
      { month: "May", demandIndex: 63, absorptionRate: 31 },
      { month: "Jun", demandIndex: 65, absorptionRate: 32 },
      { month: "Jul", demandIndex: 68, absorptionRate: 33 },
      { month: "Aug", demandIndex: 70, absorptionRate: 33 },
      { month: "Sep", demandIndex: 71, absorptionRate: 32 },
      { month: "Oct", demandIndex: 69, absorptionRate: 31 },
    ],
    topZips: [
      {
        name: "33186 – Kendall",
        medianPrice: 485000,
        rentYield: 5.8,
        yoy: 4.2,
      },
      {
        name: "33160 – Sunny Isles",
        medianPrice: 715000,
        rentYield: 5.5,
        yoy: 3.6,
      },
      {
        name: "33025 – Miramar",
        medianPrice: 402000,
        rentYield: 6.0,
        yoy: 4.8,
      },
    ],
    opportunities: [
      "Corporate relocations from finance/tech maintain downtown luxury demand.",
      "Insurance discounts available for properties with new roofs and impact glass.",
      "Cash deals prevalent; negotiate closing credits on longer DOM listings.",
    ],
    risks: [
      "Windstorm insurance premiums continue to climb sharply.",
      "Sea level resilience retrofits add capital expenditure requirements.",
      "Short-term rental regulations tightening in Miami Beach.",
    ],
    actions: [
      {
        label: "Prioritize resilient upgrades",
        description:
          "Budget for impact windows and elevation audits to secure insurance savings and tenant confidence.",
        impact: "high",
      },
      {
        label: "Diversify lease structures",
        description:
          "Blend annual and seasonal leases to capture high winter rates while maintaining stability.",
        impact: "medium",
      },
      {
        label: "Perform insurance shopping annually",
        description:
          "Use brokers to test surplus lines carriers and lock rates before hurricane season.",
        impact: "low",
      },
    ],
  },
  {
    id: "san-francisco-ca",
    name: "San Francisco, CA",
    queries: ["san francisco", "sf", "bay area", "san francisco ca", "sfo"],
    summary:
      "Tech layoffs stabilized by late 2024; buyers seek concessions, yet core SF still commands premiums. East Bay remains more affordable with strong rent growth.",
    datasetVersion: "2024-Q4",
    metrics: {
      medianListPrice: 995000,
      yoyPriceChange: -1.1,
      inventoryMonths: 3.6,
      rentYield: 3.9,
      affordabilityIndex: 78,
      jobGrowth: 1.9,
    },
    timeline: [
      { month: "May", demandIndex: 50, absorptionRate: 24 },
      { month: "Jun", demandIndex: 52, absorptionRate: 25 },
      { month: "Jul", demandIndex: 54, absorptionRate: 26 },
      { month: "Aug", demandIndex: 56, absorptionRate: 26 },
      { month: "Sep", demandIndex: 57, absorptionRate: 25 },
      { month: "Oct", demandIndex: 55, absorptionRate: 24 },
    ],
    topZips: [
      {
        name: "94110 – Mission",
        medianPrice: 1125000,
        rentYield: 3.8,
        yoy: 0.6,
      },
      {
        name: "94607 – Oakland/Jack London",
        medianPrice: 748000,
        rentYield: 4.4,
        yoy: 2.8,
      },
      {
        name: "94080 – South San Francisco",
        medianPrice: 915000,
        rentYield: 4.1,
        yoy: 1.9,
      },
    ],
    opportunities: [
      "Seller concessions and rate buydowns common above $1.2M as DOM lengthens.",
      "Biotech expansion in South SF and Mission Bay continues to support rental demand.",
      "Propelled relocations to East Bay create rent arbitrage opportunities in Richmond/El Cerrito.",
    ],
    risks: [
      "Vacancy taxes and rent control remain key underwriting considerations.",
      "Insurance costs increasing for older buildings needing seismic upgrades.",
      "Office-to-residential conversions may add supply in SOMA corridors over time.",
    ],
    actions: [
      {
        label: "Negotiate closing credits in high DOM segments",
        description:
          "Focus on listings exceeding 45 days to capture larger credits for rate buydowns or repairs.",
        impact: "high",
      },
      {
        label: "Plan seismic retrofits",
        description:
          "Budget for soft-story upgrades to meet local ordinances and unlock insurance reductions.",
        impact: "medium",
      },
      {
        label: "Evaluate East Bay transit hotspots",
        description:
          "Assets near BART stations continue to outperform on rent growth and occupancy.",
        impact: "low",
      },
    ],
  },
  {
    id: "chicago-il",
    name: "Chicago, IL",
    queries: ["chicago", "chi-town", "cook county", "chicago il"],
    summary:
      "Pent-up demand and limited SFR supply keep entry-level homes competitive; downtown rent growth stabilizes as office backfill progresses.",
    datasetVersion: "2024-Q4",
    metrics: {
      medianListPrice: 369000,
      yoyPriceChange: 2.6,
      inventoryMonths: 2.9,
      rentYield: 5.7,
      affordabilityIndex: 112,
      jobGrowth: 2.4,
    },
    timeline: [
      { month: "May", demandIndex: 58, absorptionRate: 29 },
      { month: "Jun", demandIndex: 60, absorptionRate: 30 },
      { month: "Jul", demandIndex: 63, absorptionRate: 31 },
      { month: "Aug", demandIndex: 65, absorptionRate: 31 },
      { month: "Sep", demandIndex: 66, absorptionRate: 30 },
      { month: "Oct", demandIndex: 64, absorptionRate: 29 },
    ],
    topZips: [
      {
        name: "60647 – Logan Square",
        medianPrice: 512000,
        rentYield: 5.4,
        yoy: 3.5,
      },
      {
        name: "60618 – North Center",
        medianPrice: 535000,
        rentYield: 5.2,
        yoy: 2.9,
      },
      {
        name: "60609 – Bridgeport",
        medianPrice: 315000,
        rentYield: 6.1,
        yoy: 4.7,
      },
    ],
    opportunities: [
      "Limited SFR supply on South Side supports value-add strategies with solid cap rates.",
      "MetroSouth and O’Hare expansions support rental demand near transit corridors.",
      "Class B/C downtown buildings ripe for repositioning to modern amenities.",
    ],
    risks: [
      "Property tax assessments fluctuate, requiring careful escrow budgeting.",
      "Insurance rates spiking due to severe weather in Chicagoland.",
      "Crime perception impacts certain submarkets; security investments may be necessary.",
    ],
    actions: [
      {
        label: "Lock multi-year leases with escalators",
        description:
          "Aim for 3% annual escalators on stabilized Class A/B units to keep pace with expense growth.",
        impact: "high",
      },
      {
        label: "Audit property tax appeals",
        description:
          "Use local consultants to appeal assessments and protect NOI.",
        impact: "medium",
      },
      {
        label: "Enhance security features",
        description:
          "Add smart access and surveillance to boost tenant retention in transitional areas.",
        impact: "low",
      },
    ],
  },
  {
    id: "dallas-fort-worth-tx",
    name: "Dallas-Fort Worth, TX",
    queries: [
      "dallas",
      "dallas tx",
      "fort worth",
      "dallas-fort worth",
      "dallas county",
      "tarrant county",
      "collin county",
    ],
    summary:
      "Job growth across tech, logistics, and finance keeps demand steady while new builds in northern suburbs add selective leverage for buyers.",
    datasetVersion: "2024-Q4",
    metrics: {
      medianListPrice: 465000,
      yoyPriceChange: 3.2,
      inventoryMonths: 2.6,
      rentYield: 5.3,
      affordabilityIndex: 107,
      jobGrowth: 3.3,
    },
    timeline: [
      { month: "May", demandIndex: 60, absorptionRate: 31 },
      { month: "Jun", demandIndex: 62, absorptionRate: 32 },
      { month: "Jul", demandIndex: 65, absorptionRate: 34 },
      { month: "Aug", demandIndex: 67, absorptionRate: 35 },
      { month: "Sep", demandIndex: 68, absorptionRate: 34 },
      { month: "Oct", demandIndex: 66, absorptionRate: 33 },
    ],
    topZips: [
      {
        name: "75230 - North Dallas",
        medianPrice: 695000,
        rentYield: 4.6,
        yoy: 2.5,
      },
      {
        name: "75070 - McKinney",
        medianPrice: 485000,
        rentYield: 5.1,
        yoy: 3.9,
      },
      {
        name: "76116 - West Fort Worth",
        medianPrice: 345000,
        rentYield: 5.8,
        yoy: 4.4,
      },
    ],
    opportunities: [
      "Builder incentives remain common on townhomes in Frisco and Prosper.",
      "Logistics hiring near DFW airport supports steady Class B rent growth.",
      "Value-add bungalows in Irving trade below metro median with solid demand.",
    ],
    risks: [
      "Property tax assessments remain volatile in fast-growing suburbs.",
      "Insurance premiums rising from hail exposure in northern corridors.",
      "New-build supply in outer rings could soften resale pricing.",
    ],
    actions: [
      {
        label: "Target transit-adjacent infill",
        description:
          "Focus on walkable submarkets near DART stations where rent premiums average $110/mo.",
        impact: "high",
      },
      {
        label: "Negotiate builder rate buydowns",
        description:
          "Stack builder credits with lender incentives to keep first-year P&I below $3,200 on sub-$500k homes.",
        impact: "medium",
      },
      {
        label: "Stress-test tax growth",
        description:
          "Model 8-10% annual tax increases in fast-appreciating school districts.",
        impact: "low",
      },
    ],
  },
  {
    id: "houston-tx",
    name: "Houston, TX",
    queries: [
      "houston",
      "houston tx",
      "harris county",
      "the woodlands",
      "katy",
      "sugar land",
    ],
    summary:
      "Energy hiring and port activity support demand; inventory is balanced, creating room to negotiate on mid-tier homes.",
    datasetVersion: "2024-Q4",
    metrics: {
      medianListPrice: 389000,
      yoyPriceChange: 2.1,
      inventoryMonths: 3.1,
      rentYield: 5.8,
      affordabilityIndex: 113,
      jobGrowth: 2.9,
    },
    timeline: [
      { month: "May", demandIndex: 55, absorptionRate: 28 },
      { month: "Jun", demandIndex: 57, absorptionRate: 29 },
      { month: "Jul", demandIndex: 59, absorptionRate: 30 },
      { month: "Aug", demandIndex: 61, absorptionRate: 30 },
      { month: "Sep", demandIndex: 62, absorptionRate: 29 },
      { month: "Oct", demandIndex: 60, absorptionRate: 28 },
    ],
    topZips: [
      {
        name: "77077 - Energy Corridor",
        medianPrice: 435000,
        rentYield: 5.5,
        yoy: 2.6,
      },
      {
        name: "77494 - Katy",
        medianPrice: 410000,
        rentYield: 5.6,
        yoy: 3.1,
      },
      {
        name: "77380 - The Woodlands",
        medianPrice: 520000,
        rentYield: 5.0,
        yoy: 2.2,
      },
    ],
    opportunities: [
      "Seller concessions average $7,200 on resales above $400k.",
      "Port of Houston expansions keep rental absorption healthy in southeast submarkets.",
      "Single-story inventory under $350k remains undersupplied.",
    ],
    risks: [
      "Flood insurance costs remain elevated in select bayou corridors.",
      "Older roofs trigger underwriting friction with insurance carriers.",
      "HOA fee increases in master-planned communities pressure NOI.",
    ],
    actions: [
      {
        label: "Validate flood exposure early",
        description:
          "Run elevation certificates and FEMA layers before making offers in bayou-adjacent tracts.",
        impact: "high",
      },
      {
        label: "Budget for roof replacements",
        description:
          "Allocate $9k-$12k for 15+ year roofs to secure competitive insurance quotes.",
        impact: "medium",
      },
      {
        label: "Prioritize commuter corridors",
        description:
          "Target assets near I-10 and Beltway 8 with stable employer access.",
        impact: "low",
      },
    ],
  },
  {
    id: "nashville-tn",
    name: "Nashville, TN",
    queries: [
      "nashville",
      "nashville tn",
      "music city",
      "davidson county",
      "wilson county",
    ],
    summary:
      "Healthcare and music industry hiring keep demand resilient; core neighborhoods stay competitive while suburbs offer stronger yields.",
    datasetVersion: "2024-Q4",
    metrics: {
      medianListPrice: 479000,
      yoyPriceChange: 3.8,
      inventoryMonths: 2.5,
      rentYield: 5.0,
      affordabilityIndex: 100,
      jobGrowth: 3.0,
    },
    timeline: [
      { month: "May", demandIndex: 61, absorptionRate: 32 },
      { month: "Jun", demandIndex: 63, absorptionRate: 33 },
      { month: "Jul", demandIndex: 66, absorptionRate: 34 },
      { month: "Aug", demandIndex: 69, absorptionRate: 35 },
      { month: "Sep", demandIndex: 70, absorptionRate: 34 },
      { month: "Oct", demandIndex: 68, absorptionRate: 33 },
    ],
    topZips: [
      {
        name: "37211 - South Nashville",
        medianPrice: 425000,
        rentYield: 5.2,
        yoy: 4.1,
      },
      {
        name: "37138 - Mount Juliet",
        medianPrice: 460000,
        rentYield: 5.1,
        yoy: 3.6,
      },
      {
        name: "37209 - The Nations",
        medianPrice: 585000,
        rentYield: 4.6,
        yoy: 3.0,
      },
    ],
    opportunities: [
      "Mid-term rentals for touring crews and healthcare staff remain undersupplied.",
      "Builder credits on new townhomes lower entry pricing in the southeast corridor.",
      "Rent growth in Antioch outpaces metro average by 1.4 pts.",
    ],
    risks: [
      "Short-term rental permitting rules continue to tighten downtown.",
      "Insurance premiums climb in storm-exposed neighborhoods.",
      "Traffic congestion can slow lease-up in outer suburbs.",
    ],
    actions: [
      {
        label: "Model STR compliance early",
        description:
          "Verify permit eligibility and owner-occupancy rules before underwriting STR-heavy neighborhoods.",
        impact: "high",
      },
      {
        label: "Target transit-adjacent inventory",
        description:
          "Prioritize assets near WeGo corridors to support tenant retention.",
        impact: "medium",
      },
      {
        label: "Negotiate builder credits",
        description:
          "Stack closing credits to offset higher insurance premiums in the first year.",
        impact: "low",
      },
    ],
  },
  {
    id: "tampa-fl",
    name: "Tampa, FL",
    queries: [
      "tampa",
      "tampa fl",
      "tampa bay",
      "hillsborough",
      "st petersburg",
      "st pete",
    ],
    summary:
      "Population growth supports rentals, but new supply in downtown submarkets adds competition; coastal insurance costs remain a key underwrite.",
    datasetVersion: "2024-Q4",
    metrics: {
      medianListPrice: 459000,
      yoyPriceChange: 3.0,
      inventoryMonths: 3.0,
      rentYield: 5.4,
      affordabilityIndex: 94,
      jobGrowth: 2.7,
    },
    timeline: [
      { month: "May", demandIndex: 59, absorptionRate: 30 },
      { month: "Jun", demandIndex: 61, absorptionRate: 31 },
      { month: "Jul", demandIndex: 64, absorptionRate: 32 },
      { month: "Aug", demandIndex: 66, absorptionRate: 32 },
      { month: "Sep", demandIndex: 67, absorptionRate: 31 },
      { month: "Oct", demandIndex: 65, absorptionRate: 30 },
    ],
    topZips: [
      {
        name: "33647 - New Tampa",
        medianPrice: 402000,
        rentYield: 5.6,
        yoy: 3.5,
      },
      {
        name: "33618 - Carrollwood",
        medianPrice: 455000,
        rentYield: 5.3,
        yoy: 3.2,
      },
      {
        name: "33702 - St Petersburg",
        medianPrice: 485000,
        rentYield: 5.1,
        yoy: 2.9,
      },
    ],
    opportunities: [
      "Employer relocations keep demand strong for 3-bedroom rentals under $2,600.",
      "Seasonal rental demand improves winter occupancy in waterfront areas.",
      "Insurance discounts available for impact-rated roof upgrades.",
    ],
    risks: [
      "Wind insurance premiums rising sharply across coastal ZIPs.",
      "Condo assessments increase as associations fund reserves.",
      "Flood zone remapping may affect underwriting timelines.",
    ],
    actions: [
      {
        label: "Prioritize wind-mitigation upgrades",
        description:
          "Budget for shutters and roof straps to lower insurance and attract risk-averse tenants.",
        impact: "high",
      },
      {
        label: "Stress-test insurance renewals",
        description:
          "Model 15-20% annual insurance increases to protect cash flow.",
        impact: "medium",
      },
      {
        label: "Target inland submarkets",
        description:
          "Inland ZIPs offer similar rent growth with lower storm exposure.",
        impact: "low",
      },
    ],
  },
  {
    id: "orlando-fl",
    name: "Orlando, FL",
    queries: [
      "orlando",
      "orlando fl",
      "orange county fl",
      "kissimmee",
      "lake nona",
      "winter park",
    ],
    summary:
      "Tourism recovery and logistics hiring support occupancy; investors find value in suburban SFR and mid-tier townhomes.",
    datasetVersion: "2024-Q4",
    metrics: {
      medianListPrice: 412000,
      yoyPriceChange: 3.4,
      inventoryMonths: 2.8,
      rentYield: 5.5,
      affordabilityIndex: 96,
      jobGrowth: 3.0,
    },
    timeline: [
      { month: "May", demandIndex: 60, absorptionRate: 31 },
      { month: "Jun", demandIndex: 62, absorptionRate: 32 },
      { month: "Jul", demandIndex: 65, absorptionRate: 33 },
      { month: "Aug", demandIndex: 67, absorptionRate: 33 },
      { month: "Sep", demandIndex: 68, absorptionRate: 32 },
      { month: "Oct", demandIndex: 66, absorptionRate: 31 },
    ],
    topZips: [
      {
        name: "32828 - Waterford Lakes",
        medianPrice: 385000,
        rentYield: 5.7,
        yoy: 3.8,
      },
      {
        name: "34747 - Celebration/Kissimmee",
        medianPrice: 430000,
        rentYield: 5.4,
        yoy: 3.2,
      },
      {
        name: "32827 - Lake Nona",
        medianPrice: 515000,
        rentYield: 5.0,
        yoy: 2.7,
      },
    ],
    opportunities: [
      "Mid-term demand near hospitals and resorts remains undersupplied.",
      "Builder incentives on new inventory reduce carry costs in Horizon West.",
      "Rent growth in east Orlando outpaces metro average by 1.2 pts.",
    ],
    risks: [
      "Insurance costs continue to rise across Central Florida.",
      "Short-term rental regulation changes can impact underwriting.",
      "Hurricane season introduces lease-up volatility.",
    ],
    actions: [
      {
        label: "Balance STR exposure",
        description:
          "Blend long-term and mid-term leases to reduce revenue swings in tourism-driven areas.",
        impact: "high",
      },
      {
        label: "Model insurance ahead of close",
        description:
          "Quote multiple carriers early to avoid last-minute premium shocks.",
        impact: "medium",
      },
      {
        label: "Target medical corridor demand",
        description:
          "Prioritize Lake Nona and downtown hospital clusters for stable occupancy.",
        impact: "low",
      },
    ],
  },
  {
    id: "washington-dc",
    name: "Washington, DC",
    queries: [
      "washington dc",
      "district of columbia",
      "dmv",
      "arlington",
      "alexandria",
      "montgomery county",
    ],
    summary:
      "Government stability supports demand; inventory is tight inside the beltway while outer suburbs offer more negotiating room.",
    datasetVersion: "2024-Q4",
    metrics: {
      medianListPrice: 692000,
      yoyPriceChange: 1.8,
      inventoryMonths: 2.7,
      rentYield: 3.9,
      affordabilityIndex: 88,
      jobGrowth: 2.1,
    },
    timeline: [
      { month: "May", demandIndex: 57, absorptionRate: 27 },
      { month: "Jun", demandIndex: 58, absorptionRate: 28 },
      { month: "Jul", demandIndex: 60, absorptionRate: 29 },
      { month: "Aug", demandIndex: 62, absorptionRate: 29 },
      { month: "Sep", demandIndex: 63, absorptionRate: 28 },
      { month: "Oct", demandIndex: 61, absorptionRate: 27 },
    ],
    topZips: [
      {
        name: "20002 - NoMa/H Street",
        medianPrice: 715000,
        rentYield: 3.9,
        yoy: 2.0,
      },
      {
        name: "22201 - Clarendon",
        medianPrice: 725000,
        rentYield: 3.8,
        yoy: 1.6,
      },
      {
        name: "20852 - Rockville",
        medianPrice: 595000,
        rentYield: 4.1,
        yoy: 2.4,
      },
    ],
    opportunities: [
      "Corporate housing demand supports furnished leases near federal corridors.",
      "Transit-oriented listings near Metro lines hold steady rent premiums.",
      "Condo inventory provides selective negotiation leverage.",
    ],
    risks: [
      "Condo fee increases pressure net yields in core neighborhoods.",
      "Regulatory shifts can slow approval timelines for conversions.",
      "Luxury demand softening above $1.2M in late 2024.",
    ],
    actions: [
      {
        label: "Underwrite HOA reserves",
        description:
          "Review condo reserve studies to avoid surprise assessments.",
        impact: "high",
      },
      {
        label: "Target Metro-adjacent assets",
        description:
          "Prioritize properties within 0.5 miles of Metro stations to stabilize rent growth.",
        impact: "medium",
      },
      {
        label: "Budget for longer approvals",
        description:
          "Build additional lead time for condo docs and resale approvals.",
        impact: "low",
      },
    ],
  },
  {
    id: "new-york-ny",
    name: "New York, NY",
    queries: [
      "new york",
      "new york ny",
      "nyc",
      "manhattan",
      "brooklyn",
      "queens",
      "bronx",
      "staten island",
    ],
    summary:
      "Luxury demand stabilizes with finance hiring; co-op and condo inventory offers leverage, but rental yields remain compressed.",
    datasetVersion: "2024-Q4",
    metrics: {
      medianListPrice: 795000,
      yoyPriceChange: 1.2,
      inventoryMonths: 3.4,
      rentYield: 3.4,
      affordabilityIndex: 74,
      jobGrowth: 1.7,
    },
    timeline: [
      { month: "May", demandIndex: 52, absorptionRate: 24 },
      { month: "Jun", demandIndex: 53, absorptionRate: 25 },
      { month: "Jul", demandIndex: 55, absorptionRate: 26 },
      { month: "Aug", demandIndex: 56, absorptionRate: 26 },
      { month: "Sep", demandIndex: 57, absorptionRate: 25 },
      { month: "Oct", demandIndex: 55, absorptionRate: 24 },
    ],
    topZips: [
      {
        name: "10027 - Upper Manhattan",
        medianPrice: 720000,
        rentYield: 3.6,
        yoy: 1.4,
      },
      {
        name: "11215 - Park Slope",
        medianPrice: 985000,
        rentYield: 3.3,
        yoy: 1.0,
      },
      {
        name: "11101 - Long Island City",
        medianPrice: 890000,
        rentYield: 3.5,
        yoy: 1.6,
      },
    ],
    opportunities: [
      "Seller concessions are more common on new-construction condos.",
      "Corporate housing demand supports furnished lease premiums.",
      "Outer boroughs show steadier rent growth than core Manhattan.",
    ],
    risks: [
      "Maintenance fees and taxes weigh on net yields.",
      "Regulatory changes continue to influence rent growth.",
      "Co-op board approvals extend closing timelines.",
    ],
    actions: [
      {
        label: "Screen co-op rules early",
        description:
          "Review board requirements and financial ratios before underwriting co-ops.",
        impact: "high",
      },
      {
        label: "Budget for assessments",
        description:
          "Include contingency for upcoming capital projects in older buildings.",
        impact: "medium",
      },
      {
        label: "Prioritize transit access",
        description:
          "Units within a 10-minute walk to subway lines see stronger renewals.",
        impact: "low",
      },
    ],
  },
  {
    id: "los-angeles-ca",
    name: "Los Angeles, CA",
    queries: [
      "los angeles",
      "los angeles ca",
      "la county",
      "hollywood",
      "pasadena",
      "san fernando valley",
    ],
    summary:
      "Entertainment hiring stabilizes while higher rates temper buying; coastal inventory remains tight but inland suburbs offer more leverage.",
    datasetVersion: "2024-Q4",
    metrics: {
      medianListPrice: 885000,
      yoyPriceChange: 2.0,
      inventoryMonths: 3.2,
      rentYield: 3.6,
      affordabilityIndex: 72,
      jobGrowth: 1.9,
    },
    timeline: [
      { month: "May", demandIndex: 50, absorptionRate: 23 },
      { month: "Jun", demandIndex: 52, absorptionRate: 24 },
      { month: "Jul", demandIndex: 54, absorptionRate: 25 },
      { month: "Aug", demandIndex: 55, absorptionRate: 25 },
      { month: "Sep", demandIndex: 56, absorptionRate: 24 },
      { month: "Oct", demandIndex: 54, absorptionRate: 23 },
    ],
    topZips: [
      {
        name: "90026 - Silver Lake",
        medianPrice: 1185000,
        rentYield: 3.3,
        yoy: 1.7,
      },
      {
        name: "91367 - Woodland Hills",
        medianPrice: 945000,
        rentYield: 3.6,
        yoy: 2.0,
      },
      {
        name: "90045 - Westchester",
        medianPrice: 1095000,
        rentYield: 3.4,
        yoy: 1.4,
      },
    ],
    opportunities: [
      "Seller credits more common on condos with longer days-on-market.",
      "ADU incentives improve rent economics in suburban neighborhoods.",
      "Studio-adjacent rentals see stronger mid-term demand.",
    ],
    risks: [
      "Insurance costs rising in fire-exposed corridors.",
      "Permitting timelines extend renovation schedules.",
      "Seismic retrofit requirements add upfront capital needs.",
    ],
    actions: [
      {
        label: "Budget for fire hardening",
        description:
          "Allocate capital for defensible space and Class A roofing to secure insurance coverage.",
        impact: "high",
      },
      {
        label: "Target ADU-ready lots",
        description:
          "Prioritize parcels with alley access or large setbacks for secondary units.",
        impact: "medium",
      },
      {
        label: "Plan for longer timelines",
        description:
          "Add 60-90 days to renovation schedules for permits and inspections.",
        impact: "low",
      },
    ],
  },
  {
    id: "san-diego-ca",
    name: "San Diego, CA",
    queries: ["san diego", "san diego ca", "san diego county", "north county"],
    summary:
      "Biotech and defense hiring sustain demand; coastal inventory is tight while inland submarkets provide better yields.",
    datasetVersion: "2024-Q4",
    metrics: {
      medianListPrice: 812000,
      yoyPriceChange: 2.4,
      inventoryMonths: 2.9,
      rentYield: 3.7,
      affordabilityIndex: 76,
      jobGrowth: 2.0,
    },
    timeline: [
      { month: "May", demandIndex: 54, absorptionRate: 25 },
      { month: "Jun", demandIndex: 56, absorptionRate: 26 },
      { month: "Jul", demandIndex: 58, absorptionRate: 27 },
      { month: "Aug", demandIndex: 60, absorptionRate: 27 },
      { month: "Sep", demandIndex: 61, absorptionRate: 26 },
      { month: "Oct", demandIndex: 59, absorptionRate: 25 },
    ],
    topZips: [
      {
        name: "92122 - UTC",
        medianPrice: 985000,
        rentYield: 3.6,
        yoy: 2.3,
      },
      {
        name: "92129 - Rancho Penasquitos",
        medianPrice: 895000,
        rentYield: 3.7,
        yoy: 2.0,
      },
      {
        name: "92056 - Oceanside",
        medianPrice: 735000,
        rentYield: 4.0,
        yoy: 2.8,
      },
    ],
    opportunities: [
      "Mid-term rentals near UCSD and biotech hubs hold steady occupancy.",
      "Inland North County inventory offers better cap rates than coastal zones.",
      "Demand for ADU rentals remains strong in coastal neighborhoods.",
    ],
    risks: [
      "Insurance rates rising in wildfire-exposed foothills.",
      "Coastal permitting adds lead time and cost.",
      "HOA fee growth impacts condo net yields.",
    ],
    actions: [
      {
        label: "Target inland yield pockets",
        description:
          "Prioritize submarkets like Vista and Oceanside for stronger rent-to-price spreads.",
        impact: "high",
      },
      {
        label: "Monitor HOA reserves",
        description:
          "Review condo reserves to avoid special assessments on older buildings.",
        impact: "medium",
      },
      {
        label: "Include insurance contingencies",
        description:
          "Bake in additional reserves for wildfire and flood coverage.",
        impact: "low",
      },
    ],
  },
  {
    id: "boston-ma",
    name: "Boston, MA",
    queries: [
      "boston",
      "boston ma",
      "greater boston",
      "suffolk county",
      "cambridge",
      "somerville",
    ],
    summary:
      "Education and biotech hiring sustain demand; limited inventory keeps prices firm while rents remain resilient in transit corridors.",
    datasetVersion: "2024-Q4",
    metrics: {
      medianListPrice: 789000,
      yoyPriceChange: 1.6,
      inventoryMonths: 2.4,
      rentYield: 3.8,
      affordabilityIndex: 81,
      jobGrowth: 2.2,
    },
    timeline: [
      { month: "May", demandIndex: 56, absorptionRate: 26 },
      { month: "Jun", demandIndex: 58, absorptionRate: 27 },
      { month: "Jul", demandIndex: 61, absorptionRate: 28 },
      { month: "Aug", demandIndex: 63, absorptionRate: 28 },
      { month: "Sep", demandIndex: 64, absorptionRate: 27 },
      { month: "Oct", demandIndex: 62, absorptionRate: 26 },
    ],
    topZips: [
      {
        name: "02139 - Cambridge",
        medianPrice: 1125000,
        rentYield: 3.5,
        yoy: 1.5,
      },
      {
        name: "02135 - Brighton",
        medianPrice: 765000,
        rentYield: 3.9,
        yoy: 1.8,
      },
      {
        name: "02155 - Medford/Somerville",
        medianPrice: 825000,
        rentYield: 3.7,
        yoy: 1.9,
      },
    ],
    opportunities: [
      "Student housing demand supports steady leasing in fall intake cycles.",
      "Biotech expansions in Kendall Square lift mid-term rental demand.",
      "Commuter rail improvements support rent premiums in inner suburbs.",
    ],
    risks: [
      "Condo fees rising as associations fund reserves.",
      "Regulatory constraints limit rent growth in certain corridors.",
      "Older housing stock requires higher capex budgets.",
    ],
    actions: [
      {
        label: "Align leases with academic calendar",
        description:
          "Target September renewals to capture student-driven demand peaks.",
        impact: "high",
      },
      {
        label: "Budget for capital upgrades",
        description: "Plan for envelope and HVAC updates in pre-war buildings.",
        impact: "medium",
      },
      {
        label: "Prioritize transit access",
        description:
          "Units near Red and Green line stations outperform on rent growth.",
        impact: "low",
      },
    ],
  },
  {
    id: "philadelphia-pa",
    name: "Philadelphia, PA",
    queries: [
      "philadelphia",
      "philadelphia pa",
      "philly",
      "delaware county",
      "montgomery county pa",
      "bucks county",
    ],
    summary:
      "Urban core demand is steady with medical and education hiring; buyers find leverage in rowhome inventory while close-in suburbs stay competitive.",
    datasetVersion: "2024-Q4",
    metrics: {
      medianListPrice: 418000,
      yoyPriceChange: 3.0,
      inventoryMonths: 2.8,
      rentYield: 4.8,
      affordabilityIndex: 101,
      jobGrowth: 2.4,
    },
    timeline: [
      { month: "May", demandIndex: 57, absorptionRate: 28 },
      { month: "Jun", demandIndex: 59, absorptionRate: 29 },
      { month: "Jul", demandIndex: 62, absorptionRate: 30 },
      { month: "Aug", demandIndex: 64, absorptionRate: 31 },
      { month: "Sep", demandIndex: 65, absorptionRate: 30 },
      { month: "Oct", demandIndex: 63, absorptionRate: 29 },
    ],
    topZips: [
      {
        name: "19103 - Center City",
        medianPrice: 585000,
        rentYield: 4.2,
        yoy: 2.1,
      },
      {
        name: "19147 - Queen Village",
        medianPrice: 512000,
        rentYield: 4.5,
        yoy: 2.6,
      },
      {
        name: "19087 - Wayne",
        medianPrice: 675000,
        rentYield: 4.0,
        yoy: 2.3,
      },
    ],
    opportunities: [
      "Medical hiring around University City supports stable leasing demand.",
      "Rowhome inventory under $450k has steadier rent-to-price spreads.",
      "Transit-oriented corridors near SEPTA lines attract premium tenants.",
    ],
    risks: [
      "Wage tax and transfer fees can tighten investor margins.",
      "Older housing stock increases maintenance and HVAC upgrade costs.",
      "Insurance underwriting is stricter for historic brick properties.",
    ],
    actions: [
      {
        label: "Target SEPTA-adjacent rehabs",
        description:
          "Focus on properties within 0.5 miles of rail stops to sustain rent growth.",
        impact: "high",
      },
      {
        label: "Budget for systems upgrades",
        description:
          "Allocate reserves for plumbing and electrical refreshes on pre-1970 stock.",
        impact: "medium",
      },
      {
        label: "Model transfer tax impacts",
        description:
          "Include city and county transfer taxes in cash-to-close estimates.",
        impact: "low",
      },
    ],
  },
  {
    id: "minneapolis-st-paul-mn",
    name: "Minneapolis-St. Paul, MN",
    queries: [
      "minneapolis",
      "st paul",
      "twin cities",
      "minneapolis mn",
      "st paul mn",
      "hennepin county",
      "ramsey county",
    ],
    summary:
      "Healthcare and corporate employers keep demand resilient; buyers see opportunities in suburban SFR while urban condos are more negotiable.",
    datasetVersion: "2024-Q4",
    metrics: {
      medianListPrice: 382000,
      yoyPriceChange: 2.7,
      inventoryMonths: 2.4,
      rentYield: 5.0,
      affordabilityIndex: 110,
      jobGrowth: 2.5,
    },
    timeline: [
      { month: "May", demandIndex: 58, absorptionRate: 29 },
      { month: "Jun", demandIndex: 60, absorptionRate: 30 },
      { month: "Jul", demandIndex: 63, absorptionRate: 31 },
      { month: "Aug", demandIndex: 65, absorptionRate: 31 },
      { month: "Sep", demandIndex: 66, absorptionRate: 30 },
      { month: "Oct", demandIndex: 64, absorptionRate: 29 },
    ],
    topZips: [
      {
        name: "55408 - Uptown",
        medianPrice: 425000,
        rentYield: 4.8,
        yoy: 2.2,
      },
      {
        name: "55101 - St Paul",
        medianPrice: 348000,
        rentYield: 5.3,
        yoy: 2.9,
      },
      {
        name: "55344 - Eden Prairie",
        medianPrice: 495000,
        rentYield: 4.6,
        yoy: 2.5,
      },
    ],
    opportunities: [
      "Suburban listings under $400k remain undersupplied.",
      "Medical district leasing stays steady near major hospital campuses.",
      "Value-add duplexes in St Paul deliver strong cash flow after rehab.",
    ],
    risks: [
      "Property tax appeals are common and can affect cash flow timing.",
      "Winterization costs add to upkeep for older housing stock.",
      "Condo inventory in core neighborhoods softens resale pricing.",
    ],
    actions: [
      {
        label: "Prioritize energy-efficient upgrades",
        description:
          "Insulation and window upgrades improve winter rentability and reduce vacancy.",
        impact: "high",
      },
      {
        label: "Model winter maintenance",
        description:
          "Include snow removal and heating reserves in operating budgets.",
        impact: "medium",
      },
      {
        label: "Target suburban school districts",
        description:
          "Stable school zones sustain demand for 3-4 bedroom rentals.",
        impact: "low",
      },
    ],
  },
  {
    id: "portland-or",
    name: "Portland, OR",
    queries: [
      "portland",
      "portland or",
      "multnomah county",
      "clackamas county",
      "washington county or",
    ],
    summary:
      "Buyer activity is cautious but steady; close-in neighborhoods remain popular while western suburbs provide better rent-to-price ratios.",
    datasetVersion: "2024-Q4",
    metrics: {
      medianListPrice: 585000,
      yoyPriceChange: 1.4,
      inventoryMonths: 3.1,
      rentYield: 4.1,
      affordabilityIndex: 92,
      jobGrowth: 2.1,
    },
    timeline: [
      { month: "May", demandIndex: 52, absorptionRate: 25 },
      { month: "Jun", demandIndex: 54, absorptionRate: 26 },
      { month: "Jul", demandIndex: 56, absorptionRate: 27 },
      { month: "Aug", demandIndex: 58, absorptionRate: 27 },
      { month: "Sep", demandIndex: 59, absorptionRate: 26 },
      { month: "Oct", demandIndex: 57, absorptionRate: 25 },
    ],
    topZips: [
      {
        name: "97209 - Pearl District",
        medianPrice: 710000,
        rentYield: 3.8,
        yoy: 1.2,
      },
      {
        name: "97229 - Bethany",
        medianPrice: 612000,
        rentYield: 4.2,
        yoy: 1.6,
      },
      {
        name: "97217 - Kenton",
        medianPrice: 525000,
        rentYield: 4.4,
        yoy: 1.9,
      },
    ],
    opportunities: [
      "Accessory dwelling unit demand remains strong in inner neighborhoods.",
      "Transit corridors along MAX lines support premium rents.",
      "Price-softened condos create entry points for long-term holds.",
    ],
    risks: [
      "Permitting timelines can stretch for major remodels.",
      "Insurance costs rising for older wood-frame homes.",
      "Rent growth is slower in high-supply downtown submarkets.",
    ],
    actions: [
      {
        label: "Target ADU-ready lots",
        description:
          "Lots with alley access support additional units and stronger NOI.",
        impact: "high",
      },
      {
        label: "Underwrite longer permits",
        description:
          "Add 45-60 days to rehab schedules for city review cycles.",
        impact: "medium",
      },
      {
        label: "Prioritize transit adjacency",
        description:
          "Homes near MAX stops see steadier rent growth and lower vacancy.",
        impact: "low",
      },
    ],
  },
  {
    id: "las-vegas-nv",
    name: "Las Vegas, NV",
    queries: [
      "las vegas",
      "las vegas nv",
      "clark county",
      "henderson",
      "summerlin",
    ],
    summary:
      "Population inflows and hospitality hiring keep demand firm; investors still find strong yields in suburban SFR despite rising insurance costs.",
    datasetVersion: "2024-Q4",
    metrics: {
      medianListPrice: 449000,
      yoyPriceChange: 3.6,
      inventoryMonths: 2.9,
      rentYield: 5.4,
      affordabilityIndex: 95,
      jobGrowth: 3.2,
    },
    timeline: [
      { month: "May", demandIndex: 61, absorptionRate: 31 },
      { month: "Jun", demandIndex: 63, absorptionRate: 32 },
      { month: "Jul", demandIndex: 66, absorptionRate: 33 },
      { month: "Aug", demandIndex: 68, absorptionRate: 33 },
      { month: "Sep", demandIndex: 69, absorptionRate: 32 },
      { month: "Oct", demandIndex: 67, absorptionRate: 31 },
    ],
    topZips: [
      {
        name: "89135 - Summerlin",
        medianPrice: 595000,
        rentYield: 4.7,
        yoy: 3.1,
      },
      {
        name: "89052 - Henderson",
        medianPrice: 525000,
        rentYield: 5.0,
        yoy: 3.4,
      },
      {
        name: "89117 - Spring Valley",
        medianPrice: 455000,
        rentYield: 5.5,
        yoy: 3.9,
      },
    ],
    opportunities: [
      "Corporate relocations support mid-term rental demand near Summerlin.",
      "Resale inventory under $450k remains tight, sustaining rent growth.",
      "Builder incentives available in fast-growing southwest corridors.",
    ],
    risks: [
      "Insurance premiums rise in wildfire-exposed outer zones.",
      "HOA fee growth affects net yields in master-planned communities.",
      "Water conservation policies may affect landscaping costs.",
    ],
    actions: [
      {
        label: "Budget for insurance drift",
        description:
          "Model 10-15% annual premium increases in exposed submarkets.",
        impact: "high",
      },
      {
        label: "Prioritize low-HOA inventory",
        description:
          "Lower-fee communities preserve cash flow in price-sensitive rentals.",
        impact: "medium",
      },
      {
        label: "Target commuter corridors",
        description:
          "Assets near I-215 and Summerlin Pkwy retain strong tenant demand.",
        impact: "low",
      },
    ],
  },
  {
    id: "san-antonio-tx",
    name: "San Antonio, TX",
    queries: [
      "san antonio",
      "san antonio tx",
      "bexar county",
      "new braunfels",
      "live oak",
    ],
    summary:
      "Military, healthcare, and logistics hiring keep demand consistent; entry-level SFR inventory remains competitive with above-average yields.",
    datasetVersion: "2024-Q4",
    metrics: {
      medianListPrice: 345000,
      yoyPriceChange: 3.1,
      inventoryMonths: 2.5,
      rentYield: 5.9,
      affordabilityIndex: 116,
      jobGrowth: 3.0,
    },
    timeline: [
      { month: "May", demandIndex: 63, absorptionRate: 33 },
      { month: "Jun", demandIndex: 65, absorptionRate: 34 },
      { month: "Jul", demandIndex: 68, absorptionRate: 35 },
      { month: "Aug", demandIndex: 70, absorptionRate: 35 },
      { month: "Sep", demandIndex: 71, absorptionRate: 34 },
      { month: "Oct", demandIndex: 69, absorptionRate: 33 },
    ],
    topZips: [
      {
        name: "78258 - Stone Oak",
        medianPrice: 465000,
        rentYield: 5.2,
        yoy: 3.0,
      },
      {
        name: "78253 - Alamo Ranch",
        medianPrice: 355000,
        rentYield: 6.0,
        yoy: 3.6,
      },
      {
        name: "78130 - New Braunfels",
        medianPrice: 385000,
        rentYield: 5.7,
        yoy: 3.4,
      },
    ],
    opportunities: [
      "Military relocation cycles keep leasing velocity strong in north suburbs.",
      "New builds under $350k offer attractive rent-to-price spreads.",
      "Medical district expansion supports steady mid-term demand.",
    ],
    risks: [
      "Property tax growth in fast-appreciating corridors can compress cash flow.",
      "Insurance premiums rising from hail exposure.",
      "Construction volumes add competition in outer-ring submarkets.",
    ],
    actions: [
      {
        label: "Model tax growth in underwrite",
        description:
          "Stress-test 6-8% annual tax increases in high-growth zones.",
        impact: "high",
      },
      {
        label: "Target military-adjacent inventory",
        description:
          "Prioritize locations within a 20-minute drive of key bases.",
        impact: "medium",
      },
      {
        label: "Track new-build concessions",
        description:
          "Use builder credits to lower entry pricing in competitive corridors.",
        impact: "low",
      },
    ],
  },
  {
    id: "sacramento-ca",
    name: "Sacramento, CA",
    queries: [
      "sacramento",
      "sacramento ca",
      "sac county",
      "el dorado county",
      "roseville",
    ],
    summary:
      "State government stability keeps demand steady; migration from the Bay Area supports mid-tier pricing while outer suburbs offer stronger yields.",
    datasetVersion: "2024-Q4",
    metrics: {
      medianListPrice: 510000,
      yoyPriceChange: 2.2,
      inventoryMonths: 2.7,
      rentYield: 4.6,
      affordabilityIndex: 98,
      jobGrowth: 2.2,
    },
    timeline: [
      { month: "May", demandIndex: 56, absorptionRate: 27 },
      { month: "Jun", demandIndex: 58, absorptionRate: 28 },
      { month: "Jul", demandIndex: 61, absorptionRate: 29 },
      { month: "Aug", demandIndex: 63, absorptionRate: 29 },
      { month: "Sep", demandIndex: 64, absorptionRate: 28 },
      { month: "Oct", demandIndex: 62, absorptionRate: 27 },
    ],
    topZips: [
      {
        name: "95814 - Downtown",
        medianPrice: 585000,
        rentYield: 4.1,
        yoy: 1.7,
      },
      {
        name: "95630 - Folsom",
        medianPrice: 635000,
        rentYield: 4.0,
        yoy: 2.2,
      },
      {
        name: "95757 - Elk Grove",
        medianPrice: 512000,
        rentYield: 4.7,
        yoy: 2.6,
      },
    ],
    opportunities: [
      "Bay Area spillover supports demand in commuter suburbs.",
      "Build-to-rent communities create consistent leasing pipelines.",
      "Mid-tier homes in Elk Grove show strong rent retention.",
    ],
    risks: [
      "Wildfire exposure in outer corridors can raise insurance premiums.",
      "State budget cycles may impact government hiring cadence.",
      "New supply near downtown adds pricing pressure for condos.",
    ],
    actions: [
      {
        label: "Underwrite insurance headroom",
        description:
          "Include reserves for wildfire coverage in eastern suburbs.",
        impact: "high",
      },
      {
        label: "Target commuter-friendly suburbs",
        description: "Focus on Folsom and Elk Grove for stable tenant demand.",
        impact: "medium",
      },
      {
        label: "Monitor condo supply",
        description: "Track downtown deliveries that could soften rents.",
        impact: "low",
      },
    ],
  },
  {
    id: "columbus-oh",
    name: "Columbus, OH",
    queries: ["columbus", "columbus oh", "franklin county", "dublin oh"],
    summary:
      "Tech and logistics hiring keep demand strong; entry-level inventory is tight with above-average rent growth in suburban corridors.",
    datasetVersion: "2024-Q4",
    metrics: {
      medianListPrice: 312000,
      yoyPriceChange: 3.8,
      inventoryMonths: 2.2,
      rentYield: 6.1,
      affordabilityIndex: 118,
      jobGrowth: 3.1,
    },
    timeline: [
      { month: "May", demandIndex: 64, absorptionRate: 34 },
      { month: "Jun", demandIndex: 66, absorptionRate: 35 },
      { month: "Jul", demandIndex: 69, absorptionRate: 36 },
      { month: "Aug", demandIndex: 71, absorptionRate: 37 },
      { month: "Sep", demandIndex: 72, absorptionRate: 36 },
      { month: "Oct", demandIndex: 70, absorptionRate: 35 },
    ],
    topZips: [
      {
        name: "43215 - Short North",
        medianPrice: 385000,
        rentYield: 5.5,
        yoy: 3.2,
      },
      {
        name: "43081 - Westerville",
        medianPrice: 345000,
        rentYield: 6.0,
        yoy: 4.1,
      },
      {
        name: "43228 - Westland",
        medianPrice: 275000,
        rentYield: 6.4,
        yoy: 4.6,
      },
    ],
    opportunities: [
      "Data center expansions sustain leasing velocity in north suburbs.",
      "Starter homes under $300k remain undersupplied.",
      "Renter demand is strong near Ohio State University corridors.",
    ],
    risks: [
      "Construction costs rising for value-add rehabs.",
      "Tax abatement programs may be phased out in select tracts.",
      "Competition from new townhome developments in outer rings.",
    ],
    actions: [
      {
        label: "Target OSU-adjacent rentals",
        description:
          "Prioritize locations near campus for consistent leasing demand.",
        impact: "high",
      },
      {
        label: "Focus on entry-level inventory",
        description:
          "Homes under $325k deliver the strongest rent-to-price spreads.",
        impact: "medium",
      },
      {
        label: "Track incentive updates",
        description:
          "Monitor city tax abatement updates to keep underwriting current.",
        impact: "low",
      },
    ],
  },
  {
    id: "detroit-mi",
    name: "Detroit, MI",
    queries: ["detroit", "detroit mi", "wayne county", "oakland county"],
    summary:
      "Manufacturing hiring stabilizes demand while value-add inventory offers strong yields; select suburbs remain competitive with steady rent growth.",
    datasetVersion: "2024-Q4",
    metrics: {
      medianListPrice: 245000,
      yoyPriceChange: 2.5,
      inventoryMonths: 2.6,
      rentYield: 6.0,
      affordabilityIndex: 120,
      jobGrowth: 2.0,
    },
    timeline: [
      { month: "May", demandIndex: 55, absorptionRate: 28 },
      { month: "Jun", demandIndex: 57, absorptionRate: 29 },
      { month: "Jul", demandIndex: 60, absorptionRate: 30 },
      { month: "Aug", demandIndex: 62, absorptionRate: 30 },
      { month: "Sep", demandIndex: 63, absorptionRate: 29 },
      { month: "Oct", demandIndex: 61, absorptionRate: 28 },
    ],
    topZips: [
      {
        name: "48221 - Bagley",
        medianPrice: 235000,
        rentYield: 6.2,
        yoy: 2.1,
      },
      {
        name: "48067 - Royal Oak",
        medianPrice: 365000,
        rentYield: 5.1,
        yoy: 2.6,
      },
      {
        name: "48326 - Auburn Hills",
        medianPrice: 325000,
        rentYield: 5.6,
        yoy: 2.9,
      },
    ],
    opportunities: [
      "Value-add duplexes deliver strong cash flow after light rehab.",
      "Employer expansions in auto tech support rental demand.",
      "Suburban listings under $300k move quickly with fewer concessions.",
    ],
    risks: [
      "Older housing stock requires higher maintenance reserves.",
      "Property tax assessments can swing year over year.",
      "Insurance underwriting is stricter for legacy roofs.",
    ],
    actions: [
      {
        label: "Budget for capex reserves",
        description:
          "Plan for roof, plumbing, and furnace updates on older assets.",
        impact: "high",
      },
      {
        label: "Prioritize stable suburbs",
        description:
          "Target Royal Oak and Auburn Hills for steadier rent growth.",
        impact: "medium",
      },
      {
        label: "Track tax appeals",
        description:
          "Use local advisors to keep assessments aligned with market value.",
        impact: "low",
      },
    ],
  },
  {
    id: "kansas-city-mo",
    name: "Kansas City, MO",
    queries: ["kansas city", "kansas city mo", "kcmo", "jackson county"],
    summary:
      "Logistics and healthcare hiring keep demand steady; strong cash-flow opportunities persist in suburban SFR inventory.",
    datasetVersion: "2024-Q4",
    metrics: {
      medianListPrice: 335000,
      yoyPriceChange: 3.4,
      inventoryMonths: 2.4,
      rentYield: 5.8,
      affordabilityIndex: 115,
      jobGrowth: 2.6,
    },
    timeline: [
      { month: "May", demandIndex: 61, absorptionRate: 32 },
      { month: "Jun", demandIndex: 63, absorptionRate: 33 },
      { month: "Jul", demandIndex: 66, absorptionRate: 34 },
      { month: "Aug", demandIndex: 68, absorptionRate: 34 },
      { month: "Sep", demandIndex: 69, absorptionRate: 33 },
      { month: "Oct", demandIndex: 67, absorptionRate: 32 },
    ],
    topZips: [
      {
        name: "64111 - Westport",
        medianPrice: 365000,
        rentYield: 5.6,
        yoy: 3.1,
      },
      {
        name: "64155 - Northland",
        medianPrice: 315000,
        rentYield: 6.0,
        yoy: 3.7,
      },
      {
        name: "66213 - Overland Park",
        medianPrice: 425000,
        rentYield: 5.2,
        yoy: 2.8,
      },
    ],
    opportunities: [
      "Industrial hiring boosts rental absorption in north suburbs.",
      "Starter homes under $325k remain supply constrained.",
      "Value-add renovations in midtown see quick lease-up.",
    ],
    risks: [
      "Insurance premiums rising on older brick homes.",
      "Construction costs pressure renovation budgets.",
      "Competition from new townhome developments in Johnson County.",
    ],
    actions: [
      {
        label: "Target north suburb rentals",
        description:
          "Focus on Northland corridors with strong commuter access.",
        impact: "high",
      },
      {
        label: "Model renovation buffers",
        description:
          "Include contingency for material cost inflation on rehabs.",
        impact: "medium",
      },
      {
        label: "Track new-build supply",
        description:
          "Monitor Johnson County deliveries to avoid oversupplied pockets.",
        impact: "low",
      },
    ],
  },
  {
    id: "salt-lake-city-ut",
    name: "Salt Lake City, UT",
    queries: [
      "salt lake city",
      "salt lake city ut",
      "slc",
      "salt lake county",
      "davis county",
    ],
    summary:
      "Mountain west migration keeps demand steady; inventory is tighter near urban cores while southern suburbs offer stronger yields.",
    datasetVersion: "2024-Q4",
    metrics: {
      medianListPrice: 575000,
      yoyPriceChange: 2.0,
      inventoryMonths: 2.8,
      rentYield: 4.3,
      affordabilityIndex: 90,
      jobGrowth: 2.8,
    },
    timeline: [
      { month: "May", demandIndex: 55, absorptionRate: 27 },
      { month: "Jun", demandIndex: 57, absorptionRate: 28 },
      { month: "Jul", demandIndex: 60, absorptionRate: 29 },
      { month: "Aug", demandIndex: 62, absorptionRate: 29 },
      { month: "Sep", demandIndex: 63, absorptionRate: 28 },
      { month: "Oct", demandIndex: 61, absorptionRate: 27 },
    ],
    topZips: [
      {
        name: "84103 - The Avenues",
        medianPrice: 675000,
        rentYield: 3.9,
        yoy: 1.6,
      },
      {
        name: "84095 - South Jordan",
        medianPrice: 545000,
        rentYield: 4.4,
        yoy: 2.2,
      },
      {
        name: "84043 - Lehi",
        medianPrice: 525000,
        rentYield: 4.5,
        yoy: 2.4,
      },
    ],
    opportunities: [
      "Tech corridor growth in Lehi supports stable rental absorption.",
      "Suburban SFR inventory under $550k remains tight.",
      "ADU demand is strong in close-in neighborhoods.",
    ],
    risks: [
      "Water availability concerns may affect long-term permitting.",
      "HOA fee growth in newer communities can compress yields.",
      "Winter maintenance adds operating overhead in foothill areas.",
    ],
    actions: [
      {
        label: "Target tech corridor rentals",
        description:
          "Lehi and South Jordan show steady demand from commuter tenants.",
        impact: "high",
      },
      {
        label: "Model HOA fee growth",
        description: "Include 5-7% annual HOA increases in underwriting.",
        impact: "medium",
      },
      {
        label: "Budget for winter upkeep",
        description:
          "Add snow and ice reserves to operating budgets for hillside homes.",
        impact: "low",
      },
    ],
  },
  {
    id: "san-jose-ca",
    name: "San Jose, CA",
    queries: [
      "san jose",
      "san jose ca",
      "silicon valley",
      "santa clara county",
      "cupertino",
      "sunnyvale",
    ],
    summary:
      "Tech hiring stabilizes and inventory remains lean; core Silicon Valley stays expensive while southern suburbs offer slightly better yields.",
    datasetVersion: "2024-Q4",
    metrics: {
      medianListPrice: 1245000,
      yoyPriceChange: 1.6,
      inventoryMonths: 2.3,
      rentYield: 3.1,
      affordabilityIndex: 70,
      jobGrowth: 2.2,
    },
    timeline: [
      { month: "May", demandIndex: 54, absorptionRate: 25 },
      { month: "Jun", demandIndex: 56, absorptionRate: 26 },
      { month: "Jul", demandIndex: 58, absorptionRate: 27 },
      { month: "Aug", demandIndex: 60, absorptionRate: 27 },
      { month: "Sep", demandIndex: 61, absorptionRate: 26 },
      { month: "Oct", demandIndex: 59, absorptionRate: 25 },
    ],
    topZips: [
      {
        name: "95125 - Willow Glen",
        medianPrice: 1475000,
        rentYield: 2.9,
        yoy: 1.3,
      },
      {
        name: "95050 - Santa Clara",
        medianPrice: 1185000,
        rentYield: 3.3,
        yoy: 1.6,
      },
      {
        name: "95132 - North San Jose",
        medianPrice: 1125000,
        rentYield: 3.4,
        yoy: 1.9,
      },
    ],
    opportunities: [
      "Townhome inventory in South San Jose offers relative pricing discounts.",
      "Corporate housing demand supports premium leases near major campuses.",
      "ADU conversions can lift yields on larger suburban lots.",
    ],
    risks: [
      "Affordability constraints limit buyer pool for entry-level homes.",
      "Insurance costs rising in foothill and wildfire-adjacent zones.",
      "Condo HOA fees compress net yields in transit corridors.",
    ],
    actions: [
      {
        label: "Target transit-adjacent townhomes",
        description:
          "Focus on VTA and Caltrain corridors to stabilize leasing demand.",
        impact: "high",
      },
      {
        label: "Model HOA fee growth",
        description:
          "Plan for 5-7% annual HOA increases in newer condo communities.",
        impact: "medium",
      },
      {
        label: "Evaluate ADU feasibility",
        description:
          "Lots with alley access can unlock secondary unit cash flow.",
        impact: "low",
      },
    ],
  },
  {
    id: "riverside-ca",
    name: "Riverside, CA",
    queries: [
      "riverside",
      "riverside ca",
      "inland empire",
      "san bernardino county",
      "riverside county",
      "ontario ca",
    ],
    summary:
      "Inland logistics hiring supports demand; buyers find comparatively strong yields versus coastal metros, with steady rent growth in commuter suburbs.",
    datasetVersion: "2024-Q4",
    metrics: {
      medianListPrice: 545000,
      yoyPriceChange: 3.2,
      inventoryMonths: 2.9,
      rentYield: 4.6,
      affordabilityIndex: 92,
      jobGrowth: 2.9,
    },
    timeline: [
      { month: "May", demandIndex: 60, absorptionRate: 31 },
      { month: "Jun", demandIndex: 62, absorptionRate: 32 },
      { month: "Jul", demandIndex: 65, absorptionRate: 33 },
      { month: "Aug", demandIndex: 67, absorptionRate: 33 },
      { month: "Sep", demandIndex: 68, absorptionRate: 32 },
      { month: "Oct", demandIndex: 66, absorptionRate: 31 },
    ],
    topZips: [
      {
        name: "92507 - UC Riverside",
        medianPrice: 515000,
        rentYield: 4.8,
        yoy: 3.1,
      },
      {
        name: "91730 - Rancho Cucamonga",
        medianPrice: 585000,
        rentYield: 4.4,
        yoy: 2.6,
      },
      {
        name: "92336 - Fontana",
        medianPrice: 525000,
        rentYield: 4.7,
        yoy: 3.4,
      },
    ],
    opportunities: [
      "Warehouse hiring near I-10 sustains leasing velocity for SFR rentals.",
      "Commuter towns show strong rent growth for 3-4 bedroom homes.",
      "New construction incentives remain available in east corridor tracts.",
    ],
    risks: [
      "Insurance costs rising in wildfire-exposed foothill areas.",
      "Traffic congestion can soften demand in distant commuter zones.",
      "New supply adds competition in outer-ring subdivisions.",
    ],
    actions: [
      {
        label: "Target commuter hubs",
        description:
          "Focus on submarkets within 45 minutes of major employment centers.",
        impact: "high",
      },
      {
        label: "Model insurance headroom",
        description: "Include buffers for wildfire-related premium increases.",
        impact: "medium",
      },
      {
        label: "Negotiate builder credits",
        description:
          "Use closing incentives to offset higher rate environments.",
        impact: "low",
      },
    ],
  },
  {
    id: "pittsburgh-pa",
    name: "Pittsburgh, PA",
    queries: ["pittsburgh", "pittsburgh pa", "allegheny county", "steel city"],
    summary:
      "Healthcare and education hiring keep demand steady; entry-level inventory remains tight with solid rent-to-price spreads.",
    datasetVersion: "2024-Q4",
    metrics: {
      medianListPrice: 295000,
      yoyPriceChange: 3.3,
      inventoryMonths: 2.5,
      rentYield: 5.6,
      affordabilityIndex: 116,
      jobGrowth: 2.4,
    },
    timeline: [
      { month: "May", demandIndex: 62, absorptionRate: 33 },
      { month: "Jun", demandIndex: 64, absorptionRate: 34 },
      { month: "Jul", demandIndex: 67, absorptionRate: 35 },
      { month: "Aug", demandIndex: 69, absorptionRate: 35 },
      { month: "Sep", demandIndex: 70, absorptionRate: 34 },
      { month: "Oct", demandIndex: 68, absorptionRate: 33 },
    ],
    topZips: [
      {
        name: "15213 - Oakland",
        medianPrice: 345000,
        rentYield: 5.2,
        yoy: 2.8,
      },
      {
        name: "15206 - East Liberty",
        medianPrice: 385000,
        rentYield: 5.0,
        yoy: 3.1,
      },
      {
        name: "15120 - Munhall",
        medianPrice: 215000,
        rentYield: 6.2,
        yoy: 3.6,
      },
    ],
    opportunities: [
      "Student housing demand supports stable leasing near universities.",
      "Value-add duplexes show strong cash flow after light rehab.",
      "Downtown office conversions increase renter pools in adjacent districts.",
    ],
    risks: [
      "Older housing stock raises renovation and maintenance budgets.",
      "Property tax appeals can shift escrow timing.",
      "Neighborhood variability requires careful micro-market underwriting.",
    ],
    actions: [
      {
        label: "Target university-adjacent rentals",
        description:
          "Focus on Oakland and Shadyside corridors for consistent demand.",
        impact: "high",
      },
      {
        label: "Budget for mechanical upgrades",
        description:
          "Plan for HVAC and electrical refreshes on pre-1960 stock.",
        impact: "medium",
      },
      {
        label: "Stress-test vacancy",
        description:
          "Use conservative lease-up assumptions in transitional neighborhoods.",
        impact: "low",
      },
    ],
  },
  {
    id: "cincinnati-oh",
    name: "Cincinnati, OH",
    queries: [
      "cincinnati",
      "cincinnati oh",
      "hamilton county",
      "clermont county",
    ],
    summary:
      "Healthcare and consumer goods hiring keep demand steady; suburban SFR inventory offers strong yields with moderate price growth.",
    datasetVersion: "2024-Q4",
    metrics: {
      medianListPrice: 315000,
      yoyPriceChange: 3.1,
      inventoryMonths: 2.4,
      rentYield: 5.8,
      affordabilityIndex: 114,
      jobGrowth: 2.5,
    },
    timeline: [
      { month: "May", demandIndex: 61, absorptionRate: 32 },
      { month: "Jun", demandIndex: 63, absorptionRate: 33 },
      { month: "Jul", demandIndex: 66, absorptionRate: 34 },
      { month: "Aug", demandIndex: 68, absorptionRate: 34 },
      { month: "Sep", demandIndex: 69, absorptionRate: 33 },
      { month: "Oct", demandIndex: 67, absorptionRate: 32 },
    ],
    topZips: [
      {
        name: "45202 - Over-the-Rhine",
        medianPrice: 365000,
        rentYield: 5.3,
        yoy: 2.7,
      },
      {
        name: "45236 - Blue Ash",
        medianPrice: 395000,
        rentYield: 5.1,
        yoy: 2.9,
      },
      {
        name: "45069 - West Chester",
        medianPrice: 355000,
        rentYield: 5.6,
        yoy: 3.3,
      },
    ],
    opportunities: [
      "Renovated townhomes lease quickly in close-in suburbs.",
      "Employer stability supports steady rent growth in Class B assets.",
      "Value-add bungalows under $300k remain undersupplied.",
    ],
    risks: [
      "Construction costs pressure rehab margins.",
      "Insurance premiums rising on older brick properties.",
      "Inventory tightening in top school districts reduces deal flow.",
    ],
    actions: [
      {
        label: "Target sub-300k inventory",
        description:
          "Focus on workforce housing with strong rent-to-price ratios.",
        impact: "high",
      },
      {
        label: "Model rehab buffers",
        description:
          "Include contingency for material cost inflation on renovations.",
        impact: "medium",
      },
      {
        label: "Prioritize school districts",
        description:
          "Stable districts support lower vacancy and steady rent growth.",
        impact: "low",
      },
    ],
  },
  {
    id: "cleveland-oh",
    name: "Cleveland, OH",
    queries: ["cleveland", "cleveland oh", "cuyahoga county", "lake county oh"],
    summary:
      "Healthcare anchors support demand; investors find strong cash flow in suburban SFR with steady rent growth.",
    datasetVersion: "2024-Q4",
    metrics: {
      medianListPrice: 265000,
      yoyPriceChange: 3.0,
      inventoryMonths: 2.7,
      rentYield: 6.0,
      affordabilityIndex: 120,
      jobGrowth: 2.3,
    },
    timeline: [
      { month: "May", demandIndex: 59, absorptionRate: 31 },
      { month: "Jun", demandIndex: 61, absorptionRate: 32 },
      { month: "Jul", demandIndex: 64, absorptionRate: 33 },
      { month: "Aug", demandIndex: 66, absorptionRate: 33 },
      { month: "Sep", demandIndex: 67, absorptionRate: 32 },
      { month: "Oct", demandIndex: 65, absorptionRate: 31 },
    ],
    topZips: [
      {
        name: "44106 - University Circle",
        medianPrice: 305000,
        rentYield: 5.6,
        yoy: 2.6,
      },
      {
        name: "44118 - Cleveland Heights",
        medianPrice: 255000,
        rentYield: 6.1,
        yoy: 3.2,
      },
      {
        name: "44060 - Mentor",
        medianPrice: 275000,
        rentYield: 5.8,
        yoy: 2.9,
      },
    ],
    opportunities: [
      "Hospital expansions support leasing velocity in near-east suburbs.",
      "Value-add duplexes provide strong cash flow after upgrades.",
      "Starter homes under $250k remain supply constrained.",
    ],
    risks: [
      "Older housing stock increases maintenance and repair costs.",
      "Property tax assessments vary by municipality.",
      "Insurance carriers tighter on legacy roofs.",
    ],
    actions: [
      {
        label: "Prioritize healthcare corridors",
        description:
          "Target assets near University Circle and major hospital campuses.",
        impact: "high",
      },
      {
        label: "Budget for capex",
        description: "Plan for HVAC and roof upgrades in older homes.",
        impact: "medium",
      },
      {
        label: "Track municipal taxes",
        description: "Model local tax differences for suburban submarkets.",
        impact: "low",
      },
    ],
  },
  {
    id: "st-louis-mo",
    name: "St. Louis, MO",
    queries: [
      "st louis",
      "st. louis",
      "st louis mo",
      "st. louis mo",
      "st louis county",
    ],
    summary:
      "Healthcare and bioscience hiring keep demand stable; value-add opportunities persist in older housing stock with strong yields.",
    datasetVersion: "2024-Q4",
    metrics: {
      medianListPrice: 295000,
      yoyPriceChange: 2.8,
      inventoryMonths: 2.6,
      rentYield: 5.7,
      affordabilityIndex: 114,
      jobGrowth: 2.3,
    },
    timeline: [
      { month: "May", demandIndex: 60, absorptionRate: 31 },
      { month: "Jun", demandIndex: 62, absorptionRate: 32 },
      { month: "Jul", demandIndex: 65, absorptionRate: 33 },
      { month: "Aug", demandIndex: 67, absorptionRate: 33 },
      { month: "Sep", demandIndex: 68, absorptionRate: 32 },
      { month: "Oct", demandIndex: 66, absorptionRate: 31 },
    ],
    topZips: [
      {
        name: "63110 - The Hill",
        medianPrice: 365000,
        rentYield: 5.1,
        yoy: 2.4,
      },
      {
        name: "63119 - Webster Groves",
        medianPrice: 425000,
        rentYield: 4.8,
        yoy: 2.1,
      },
      {
        name: "63129 - South County",
        medianPrice: 315000,
        rentYield: 5.6,
        yoy: 3.0,
      },
    ],
    opportunities: [
      "Renovated brick homes lease quickly in inner-ring suburbs.",
      "Medical campus expansions support rental demand.",
      "Entry-level homes under $300k show strong rent-to-price spreads.",
    ],
    risks: [
      "Older housing stock increases rehab complexity.",
      "Municipal fragmentation impacts tax and permitting timelines.",
      "Insurance underwriting is stricter for legacy roofs.",
    ],
    actions: [
      {
        label: "Target inner-ring suburbs",
        description:
          "Focus on stable neighborhoods with strong school districts.",
        impact: "high",
      },
      {
        label: "Plan for rehab buffers",
        description: "Include 10-15% contingency on older brick rehabs.",
        impact: "medium",
      },
      {
        label: "Track local tax shifts",
        description: "Review municipal tax changes before acquisition.",
        impact: "low",
      },
    ],
  },
  {
    id: "milwaukee-wi",
    name: "Milwaukee, WI",
    queries: [
      "milwaukee",
      "milwaukee wi",
      "milwaukee county",
      "waukesha county",
    ],
    summary:
      "Manufacturing and healthcare hiring keep demand steady; investors see strong yields in suburban SFR with moderate price growth.",
    datasetVersion: "2024-Q4",
    metrics: {
      medianListPrice: 285000,
      yoyPriceChange: 3.4,
      inventoryMonths: 2.3,
      rentYield: 5.9,
      affordabilityIndex: 118,
      jobGrowth: 2.5,
    },
    timeline: [
      { month: "May", demandIndex: 62, absorptionRate: 33 },
      { month: "Jun", demandIndex: 64, absorptionRate: 34 },
      { month: "Jul", demandIndex: 67, absorptionRate: 35 },
      { month: "Aug", demandIndex: 69, absorptionRate: 35 },
      { month: "Sep", demandIndex: 70, absorptionRate: 34 },
      { month: "Oct", demandIndex: 68, absorptionRate: 33 },
    ],
    topZips: [
      {
        name: "53202 - East Town",
        medianPrice: 325000,
        rentYield: 5.4,
        yoy: 2.9,
      },
      {
        name: "53207 - Bay View",
        medianPrice: 345000,
        rentYield: 5.2,
        yoy: 3.1,
      },
      {
        name: "53186 - Waukesha",
        medianPrice: 315000,
        rentYield: 5.8,
        yoy: 3.4,
      },
    ],
    opportunities: [
      "Entry-level inventory under $275k remains tight.",
      "Downtown revitalization supports steady rental demand.",
      "Value-add duplexes perform well in Bay View corridors.",
    ],
    risks: [
      "Older housing stock increases maintenance needs.",
      "Property tax assessments vary across municipalities.",
      "Winterization costs add operating overhead.",
    ],
    actions: [
      {
        label: "Target entry-level inventory",
        description:
          "Homes under $300k offer the strongest rent-to-price ratios.",
        impact: "high",
      },
      {
        label: "Budget for winter upkeep",
        description: "Include snow removal and heating reserves in pro formas.",
        impact: "medium",
      },
      {
        label: "Track municipal taxes",
        description: "Compare city vs suburban tax rates before acquisition.",
        impact: "low",
      },
    ],
  },
  {
    id: "indianapolis-in",
    name: "Indianapolis, IN",
    queries: [
      "indianapolis",
      "indianapolis in",
      "indy",
      "marion county",
      "hamilton county in",
    ],
    summary:
      "Logistics and healthcare hiring keep demand steady; strong yields persist in suburban SFR with stable rent growth.",
    datasetVersion: "2024-Q4",
    metrics: {
      medianListPrice: 305000,
      yoyPriceChange: 3.5,
      inventoryMonths: 2.4,
      rentYield: 6.0,
      affordabilityIndex: 117,
      jobGrowth: 2.8,
    },
    timeline: [
      { month: "May", demandIndex: 63, absorptionRate: 33 },
      { month: "Jun", demandIndex: 65, absorptionRate: 34 },
      { month: "Jul", demandIndex: 68, absorptionRate: 35 },
      { month: "Aug", demandIndex: 70, absorptionRate: 35 },
      { month: "Sep", demandIndex: 71, absorptionRate: 34 },
      { month: "Oct", demandIndex: 69, absorptionRate: 33 },
    ],
    topZips: [
      {
        name: "46220 - Broad Ripple",
        medianPrice: 345000,
        rentYield: 5.7,
        yoy: 3.0,
      },
      {
        name: "46077 - Zionsville",
        medianPrice: 465000,
        rentYield: 5.1,
        yoy: 2.5,
      },
      {
        name: "46235 - Lawrence",
        medianPrice: 275000,
        rentYield: 6.3,
        yoy: 3.7,
      },
    ],
    opportunities: [
      "Warehouse expansion supports leasing demand on the west side.",
      "Starter homes under $300k remain supply constrained.",
      "Renter demand strong in north suburban school districts.",
    ],
    risks: [
      "Construction costs pressure rehab margins.",
      "Inventory tightening in premium suburbs reduces deal flow.",
      "Insurance premiums rising for older roofs.",
    ],
    actions: [
      {
        label: "Target sub-300k inventory",
        description:
          "Focus on workforce housing with strong rent-to-price spreads.",
        impact: "high",
      },
      {
        label: "Model rehab buffers",
        description:
          "Include contingency for material inflation and labor shortages.",
        impact: "medium",
      },
      {
        label: "Prioritize school zones",
        description: "Stable districts drive consistent leasing demand.",
        impact: "low",
      },
    ],
  },
  {
    id: "richmond-va",
    name: "Richmond, VA",
    queries: [
      "richmond",
      "richmond va",
      "henrico county",
      "chesterfield county",
    ],
    summary:
      "Government and healthcare hiring keep demand steady; close-in neighborhoods remain competitive while suburbs offer strong yields.",
    datasetVersion: "2024-Q4",
    metrics: {
      medianListPrice: 385000,
      yoyPriceChange: 3.6,
      inventoryMonths: 2.5,
      rentYield: 5.2,
      affordabilityIndex: 107,
      jobGrowth: 2.7,
    },
    timeline: [
      { month: "May", demandIndex: 61, absorptionRate: 32 },
      { month: "Jun", demandIndex: 63, absorptionRate: 33 },
      { month: "Jul", demandIndex: 66, absorptionRate: 34 },
      { month: "Aug", demandIndex: 68, absorptionRate: 34 },
      { month: "Sep", demandIndex: 69, absorptionRate: 33 },
      { month: "Oct", demandIndex: 67, absorptionRate: 32 },
    ],
    topZips: [
      {
        name: "23220 - The Fan",
        medianPrice: 465000,
        rentYield: 4.7,
        yoy: 3.0,
      },
      {
        name: "23233 - Short Pump",
        medianPrice: 515000,
        rentYield: 4.8,
        yoy: 2.6,
      },
      {
        name: "23112 - Midlothian",
        medianPrice: 395000,
        rentYield: 5.3,
        yoy: 3.4,
      },
    ],
    opportunities: [
      "Hospital hiring supports leasing in near-west suburbs.",
      "Rowhome inventory offers value-add upside with steady demand.",
      "Renter growth in Midlothian outpaces metro average.",
    ],
    risks: [
      "Older housing stock requires higher maintenance reserves.",
      "Property tax adjustments vary by county.",
      "Competition from new townhomes in western suburbs.",
    ],
    actions: [
      {
        label: "Target near-west suburbs",
        description: "Short Pump and Glen Allen show strong renter demand.",
        impact: "high",
      },
      {
        label: "Budget for capex",
        description: "Include reserves for roof and HVAC replacements.",
        impact: "medium",
      },
      {
        label: "Track new-build deliveries",
        description:
          "Monitor townhome pipelines to avoid oversupplied pockets.",
        impact: "low",
      },
    ],
  },
  {
    id: "virginia-beach-va",
    name: "Virginia Beach, VA",
    queries: [
      "virginia beach",
      "virginia beach va",
      "hampton roads",
      "norfolk",
      "chesapeake",
    ],
    summary:
      "Military and shipyard employment support steady demand; coastal pricing remains firm while inland suburbs offer better yields.",
    datasetVersion: "2024-Q4",
    metrics: {
      medianListPrice: 405000,
      yoyPriceChange: 3.0,
      inventoryMonths: 2.7,
      rentYield: 5.1,
      affordabilityIndex: 103,
      jobGrowth: 2.4,
    },
    timeline: [
      { month: "May", demandIndex: 60, absorptionRate: 31 },
      { month: "Jun", demandIndex: 62, absorptionRate: 32 },
      { month: "Jul", demandIndex: 65, absorptionRate: 33 },
      { month: "Aug", demandIndex: 67, absorptionRate: 33 },
      { month: "Sep", demandIndex: 68, absorptionRate: 32 },
      { month: "Oct", demandIndex: 66, absorptionRate: 31 },
    ],
    topZips: [
      {
        name: "23451 - Oceanfront",
        medianPrice: 535000,
        rentYield: 4.6,
        yoy: 2.4,
      },
      {
        name: "23454 - Great Neck",
        medianPrice: 495000,
        rentYield: 4.8,
        yoy: 2.7,
      },
      {
        name: "23320 - Chesapeake",
        medianPrice: 385000,
        rentYield: 5.4,
        yoy: 3.3,
      },
    ],
    opportunities: [
      "Military relocation cycles support consistent leasing demand.",
      "Inland suburbs offer stronger rent-to-price spreads.",
      "Seasonal rentals can boost income near coastal corridors.",
    ],
    risks: [
      "Wind and flood insurance costs elevate operating budgets.",
      "HOA fees higher in resort-style communities.",
      "Short-term rental regulations tightening near oceanfront zones.",
    ],
    actions: [
      {
        label: "Model insurance costs early",
        description: "Quote wind and flood policies before final underwriting.",
        impact: "high",
      },
      {
        label: "Target inland submarkets",
        description: "Chesapeake and inland corridors offer steadier yields.",
        impact: "medium",
      },
      {
        label: "Screen STR ordinances",
        description: "Verify local rules before underwriting vacation rentals.",
        impact: "low",
      },
    ],
  },
  {
    id: "baltimore-md",
    name: "Baltimore, MD",
    queries: [
      "baltimore",
      "baltimore md",
      "baltimore county",
      "anne arundel county",
    ],
    summary:
      "Healthcare and port activity support steady demand; buyers see leverage in rowhome inventory while suburban SFR stays competitive.",
    datasetVersion: "2024-Q4",
    metrics: {
      medianListPrice: 365000,
      yoyPriceChange: 3.1,
      inventoryMonths: 2.8,
      rentYield: 4.9,
      affordabilityIndex: 104,
      jobGrowth: 2.3,
    },
    timeline: [
      { month: "May", demandIndex: 58, absorptionRate: 29 },
      { month: "Jun", demandIndex: 60, absorptionRate: 30 },
      { month: "Jul", demandIndex: 63, absorptionRate: 31 },
      { month: "Aug", demandIndex: 65, absorptionRate: 31 },
      { month: "Sep", demandIndex: 66, absorptionRate: 30 },
      { month: "Oct", demandIndex: 64, absorptionRate: 29 },
    ],
    topZips: [
      {
        name: "21230 - Federal Hill",
        medianPrice: 425000,
        rentYield: 4.6,
        yoy: 2.7,
      },
      {
        name: "21224 - Canton",
        medianPrice: 455000,
        rentYield: 4.4,
        yoy: 2.5,
      },
      {
        name: "21090 - Glen Burnie",
        medianPrice: 315000,
        rentYield: 5.2,
        yoy: 3.2,
      },
    ],
    opportunities: [
      "Rowhome renovations show strong rent premiums near waterfront.",
      "Port logistics hiring supports steady leasing demand.",
      "Suburban rentals under $350k remain undersupplied.",
    ],
    risks: [
      "Property tax rates vary by jurisdiction.",
      "Older housing stock requires higher maintenance reserves.",
      "Insurance premiums rising in historic districts.",
    ],
    actions: [
      {
        label: "Target rowhome corridors",
        description: "Focus on Canton and Federal Hill for stable demand.",
        impact: "high",
      },
      {
        label: "Budget for capex",
        description: "Plan for roof and plumbing upgrades in older stock.",
        impact: "medium",
      },
      {
        label: "Compare tax jurisdictions",
        description: "Model city vs county tax impacts before acquisition.",
        impact: "low",
      },
    ],
  },
  {
    id: "new-orleans-la",
    name: "New Orleans, LA",
    queries: [
      "new orleans",
      "new orleans la",
      "orleans parish",
      "jefferson parish",
    ],

    summary:
      "Tourism and port employment support demand; investors see strong yields in mid-tier neighborhoods with careful insurance underwriting.",
    datasetVersion: "2024-Q4",
    metrics: {
      medianListPrice: 355000,
      yoyPriceChange: 3.4,
      inventoryMonths: 3.0,
      rentYield: 5.7,
      affordabilityIndex: 102,
      jobGrowth: 2.2,
    },
    timeline: [
      { month: "May", demandIndex: 58, absorptionRate: 29 },
      { month: "Jun", demandIndex: 60, absorptionRate: 30 },
      { month: "Jul", demandIndex: 63, absorptionRate: 31 },
      { month: "Aug", demandIndex: 65, absorptionRate: 31 },
      { month: "Sep", demandIndex: 66, absorptionRate: 30 },
      { month: "Oct", demandIndex: 64, absorptionRate: 29 },
    ],
    topZips: [
      {
        name: "70115 - Uptown",
        medianPrice: 485000,
        rentYield: 5.0,
        yoy: 2.8,
      },
      {
        name: "70119 - Mid-City",
        medianPrice: 385000,
        rentYield: 5.6,
        yoy: 3.2,
      },
      {
        name: "70003 - Metairie",
        medianPrice: 315000,
        rentYield: 6.0,
        yoy: 3.5,
      },
    ],
    opportunities: [
      "Mid-term rentals near medical centers remain undersupplied.",
      "Historic renovations capture premium rent in walkable districts.",
      "Suburban SFRs show steady leasing velocity.",
    ],
    risks: [
      "Wind and flood insurance costs remain elevated.",
      "Permitting timelines can stretch for historic renovations.",
      "Seasonal tourism introduces rent volatility in some corridors.",
    ],
    actions: [
      {
        label: "Model insurance early",
        description: "Quote flood and wind policies before final underwriting.",
        impact: "high",
      },
      {
        label: "Target medical corridors",
        description: "Mid-City rentals benefit from hospital staffing demand.",
        impact: "medium",
      },
      {
        label: "Screen STR regulations",
        description:
          "Confirm permit requirements before underwriting short-term rentals.",
        impact: "low",
      },
    ],
  },
  {
    id: "boise-id",
    name: "Boise, ID",
    queries: ["boise", "boise id", "ada county", "meridian", "nampa"],
    summary:
      "Mountain west migration keeps demand steady; inventory is tight in core submarkets while outer-ring areas provide better yields.",
    datasetVersion: "2024-Q4",
    metrics: {
      medianListPrice: 515000,
      yoyPriceChange: 2.8,
      inventoryMonths: 2.7,
      rentYield: 4.5,
      affordabilityIndex: 93,
      jobGrowth: 2.7,
    },
    timeline: [
      { month: "May", demandIndex: 57, absorptionRate: 28 },
      { month: "Jun", demandIndex: 59, absorptionRate: 29 },
      { month: "Jul", demandIndex: 62, absorptionRate: 30 },
      { month: "Aug", demandIndex: 64, absorptionRate: 30 },
      { month: "Sep", demandIndex: 65, absorptionRate: 29 },
      { month: "Oct", demandIndex: 63, absorptionRate: 28 },
    ],
    topZips: [
      {
        name: "83702 - North End",
        medianPrice: 625000,
        rentYield: 4.1,
        yoy: 2.2,
      },
      {
        name: "83642 - Meridian",
        medianPrice: 485000,
        rentYield: 4.7,
        yoy: 2.9,
      },
      {
        name: "83686 - Nampa",
        medianPrice: 425000,
        rentYield: 5.0,
        yoy: 3.3,
      },
    ],
    opportunities: [
      "Suburban SFR demand remains strong in Meridian and Kuna.",
      "Rental demand steady from remote workers relocating to Idaho.",
      "New construction incentives available in southwest corridors.",
    ],
    risks: [
      "Affordability pressure limiting entry-level buyers.",
      "Insurance costs rising in wildfire-adjacent zones.",
      "New build supply adds competition in outer-ring tracts.",
    ],
    actions: [
      {
        label: "Target commuter suburbs",
        description:
          "Meridian and Nampa deliver stronger rent-to-price ratios.",
        impact: "high",
      },
      {
        label: "Model insurance headroom",
        description: "Include buffers for wildfire-related premium increases.",
        impact: "medium",
      },
      {
        label: "Track builder incentives",
        description: "Use credits to offset rate buydowns and closing costs.",
        impact: "low",
      },
    ],
  },
  {
    id: "providence-ri",
    name: "Providence, RI",
    queries: ["providence", "providence ri", "rhode island", "kent county"],
    summary:
      "Education and healthcare demand keep leasing steady; buyers find leverage in small multi-family inventory with solid yields.",
    datasetVersion: "2024-Q4",
    metrics: {
      medianListPrice: 445000,
      yoyPriceChange: 3.0,
      inventoryMonths: 2.6,
      rentYield: 4.7,
      affordabilityIndex: 99,
      jobGrowth: 2.2,
    },
    timeline: [
      { month: "May", demandIndex: 58, absorptionRate: 29 },
      { month: "Jun", demandIndex: 60, absorptionRate: 30 },
      { month: "Jul", demandIndex: 63, absorptionRate: 31 },
      { month: "Aug", demandIndex: 65, absorptionRate: 31 },
      { month: "Sep", demandIndex: 66, absorptionRate: 30 },
      { month: "Oct", demandIndex: 64, absorptionRate: 29 },
    ],
    topZips: [
      {
        name: "02906 - East Side",
        medianPrice: 585000,
        rentYield: 4.1,
        yoy: 2.3,
      },
      {
        name: "02904 - Elmhurst",
        medianPrice: 455000,
        rentYield: 4.6,
        yoy: 2.8,
      },
      {
        name: "02919 - Johnston",
        medianPrice: 385000,
        rentYield: 5.0,
        yoy: 3.1,
      },
    ],
    opportunities: [
      "Multi-family demand strong near universities and hospitals.",
      "Starter homes under $400k remain supply constrained.",
      "Commuter access to Boston supports rent stability.",
    ],
    risks: [
      "Older housing stock increases maintenance reserves.",
      "Property tax changes can affect underwriting.",
      "Winterization costs add operating overhead.",
    ],
    actions: [
      {
        label: "Target multi-family inventory",
        description: "Small multi-family assets offer resilient cash flow.",
        impact: "high",
      },
      {
        label: "Budget for winter upkeep",
        description: "Include snow removal and heating reserves in pro formas.",
        impact: "medium",
      },
      {
        label: "Model tax impacts",
        description: "Review local tax assessments before acquisition.",
        impact: "low",
      },
    ],
  },
];

const DEFAULT_DATASET: MarketDataset = {
  id: "national-baseline",
  name: "United States – Composite",
  queries: [],
  summary:
    "Composite benchmark built from diversified MLS feeds. Use this to compare local traction against national momentum.",
  datasetVersion: "2024-Q4",
  metrics: {
    medianListPrice: 498000,
    yoyPriceChange: 1.8,
    inventoryMonths: 3.1,
    rentYield: 4.8,
    affordabilityIndex: 102,
    jobGrowth: 2.9,
  },
  timeline: [
    { month: "May", demandIndex: 55, absorptionRate: 29 },
    { month: "Jun", demandIndex: 58, absorptionRate: 30 },
    { month: "Jul", demandIndex: 60, absorptionRate: 31 },
    { month: "Aug", demandIndex: 61, absorptionRate: 31 },
    { month: "Sep", demandIndex: 62, absorptionRate: 30 },
    { month: "Oct", demandIndex: 61, absorptionRate: 29 },
  ],
  topZips: [
    {
      name: "Nashville, TN (37209)",
      medianPrice: 465000,
      rentYield: 5.1,
      yoy: 3.4,
    },
    {
      name: "Columbus, OH (43230)",
      medianPrice: 328000,
      rentYield: 5.7,
      yoy: 4.2,
    },
    {
      name: "Tampa, FL (33647)",
      medianPrice: 512000,
      rentYield: 5.0,
      yoy: 3.1,
    },
  ],
  opportunities: [
    "Rate volatility keeps motivated sellers open to inspection credits.",
    "Household formation is running 1.5% above 10-year trend across Sun Belt metros.",
    "Rent-vs-buy breakeven horizon compressing as rent growth outpaces price gains.",
  ],
  risks: [
    "Insurance premiums remain elevated in coastal markets.",
    "Labor shortages elongate renovation timelines for value-add investors.",
    "Regional bank credit tightening may slow jumbo loan approvals.",
  ],
  actions: [
    {
      label: "Stack lender incentives",
      description:
        "Compare credit union rate locks with buydowns from national lenders to trim effective APR by 40-60 bps.",
      impact: "medium",
    },
    {
      label: "Budget for longer due diligence",
      description:
        "Average appraisal turn time is up to 13 days; bake that into closing timelines to avoid rate lock extensions.",
      impact: "low",
    },
    {
      label: "Monitor insurance riders",
      description:
        "Pair wind/hail deductibles with reserve planning to keep cash flow resilient in high-risk counties.",
      impact: "low",
    },
  ],
};

const scoreFromDataset = (dataset: MarketDataset) => {
  const { metrics } = dataset;
  const buyingWindow = Math.max(
    25,
    Math.min(
      95,
      90 - metrics.inventoryMonths * 12 + metrics.yoyPriceChange * 4,
    ),
  );
  const rentalDemand = Math.max(
    20,
    Math.min(95, 60 + metrics.rentYield * 5 + metrics.jobGrowth * 3),
  );
  const competition = Math.max(
    15,
    Math.min(
      95,
      80 - metrics.inventoryMonths * 14 + metrics.yoyPriceChange * 5,
    ),
  );
  const risk = Math.max(
    10,
    Math.min(
      90,
      55 - metrics.affordabilityIndex / 2 + metrics.inventoryMonths * 6,
    ),
  );

  return {
    buyingWindow: Math.round(buyingWindow),
    rentalDemand: Math.round(rentalDemand),
    competition: Math.round(competition),
    risk: Math.round(risk),
  };
};

type ScoreState = {
  dataset: MarketDataset;
  score: number;
  hasStrongMatch: boolean;
};

export const insightsRouter = router({
  marketSnapshot: publicProcedure
    .input(
      z
        .object({
          query: z.string().min(2, "Add at least two characters to search"),
        })
        .default({ query: "United States" }),
    )
    .query(({ input }) => {
      const normalized = input.query.trim().toLowerCase();
      const tokens = normalized
        .split(/[^a-z0-9]+/)
        .map((token) => token.trim())
        .filter(Boolean);

      const scored = MARKET_DATASETS.reduce<ScoreState>(
        (best, entry) => {
          let score = 0;
          let hasStrongMatch = false;
          const entryName = entry.name.toLowerCase();

          if (entryName === normalized) {
            score += 100;
            hasStrongMatch = true;
          }

          for (const raw of entry.queries) {
            const queryTerm = raw.toLowerCase();
            const isShort = queryTerm.length <= 3;
            const termTokens = queryTerm.split(/[^a-z0-9]+/).filter(Boolean);
            const tokenMatch = tokens.includes(queryTerm);
            const phraseMatch = !tokenMatch && normalized.includes(queryTerm);
            const allTokensPresent =
              termTokens.length > 1 &&
              termTokens.every((token) => tokens.includes(token));

            if (tokenMatch) {
              score += isShort ? 1 : queryTerm.length + 2;
              if (!isShort) hasStrongMatch = true;
            } else if (allTokensPresent) {
              score += queryTerm.length + termTokens.length;
              hasStrongMatch = true;
            } else if (phraseMatch && !isShort) {
              score += queryTerm.length;
              hasStrongMatch = true;
            }
          }

          if (
            score > best.score ||
            (score === best.score && hasStrongMatch && !best.hasStrongMatch)
          ) {
            return { dataset: entry, score, hasStrongMatch };
          }

          return best;
        },
        { dataset: DEFAULT_DATASET, score: 0, hasStrongMatch: false },
      );

      const dataset = scored.hasStrongMatch ? scored.dataset : DEFAULT_DATASET;

      const scorecard = scoreFromDataset(dataset);
      const [latest] = dataset.timeline.slice(-1);
      const absorptionTrend = dataset.timeline.map((point, index, arr) => {
        const preceding = index === 0 ? point : arr[index - 1];
        const delta = point.absorptionRate - preceding.absorptionRate;
        return { month: point.month, rate: point.absorptionRate, delta };
      });

      return {
        marketLabel: dataset.name,
        datasetId: dataset.id,
        summary: dataset.summary,
        datasetVersion: dataset.datasetVersion,
        metrics: dataset.metrics,
        scorecard,
        timeline: dataset.timeline,
        absorptionTrend,
        latestDemandIndex: latest?.demandIndex ?? null,
        topZips: dataset.topZips,
        opportunities: dataset.opportunities,
        risks: dataset.risks,
        recommendedActions: dataset.actions,
      };
    }),
});

type InsightsRouterOutput = inferRouterOutputs<typeof insightsRouter>;

export type MarketSnapshot = InsightsRouterOutput["marketSnapshot"];
