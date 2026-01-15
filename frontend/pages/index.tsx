"use client";

import React, { useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, useInView } from "framer-motion";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DarkModeToggle } from "@/components/dark-mode-toggle";
import {
  ChevronLeft,
  ChevronRight,
  ArrowDown,
  TrendingUp,
  Shield,
  Star,
  User,
  MapPin,
  Phone,
  Smile,
  CheckSquare,
  FileText,
  GithubIcon,
  BarChart3,
  BotMessageSquare,
  Calculator,
} from "lucide-react";

// Dynamically load react-slick to avoid SSR issues
const Slider = dynamic(() => import("react-slick"), { ssr: false });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PrevArrow(props: any) {
  const { onClick } = props;
  return (
    <button
      onClick={onClick}
      className="absolute left-0 top-1/2 z-10 transform -translate-y-1/2 bg-white text-primary p-2 rounded-full shadow hover:scale-105 cursor-pointer"
      aria-label="Previous"
      type="button"
    >
      <ChevronLeft className="w-6 h-6" />
    </button>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function NextArrow(props: any) {
  const { onClick } = props;
  return (
    <button
      onClick={onClick}
      className="absolute right-0 top-1/2 z-10 transform -translate-y-1/2 bg-white text-primary p-2 rounded-full shadow hover:scale-105 cursor-pointer"
      aria-label="Next"
      type="button"
    >
      <ChevronRight className="w-6 h-6" />
    </button>
  );
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
function AnimatedInView({ children, className = "", delay = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { delay, duration: 0.5 } },
      }}
    >
      {children}
    </motion.div>
  );
}

const SectionBackdrop: React.FC = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    <div className="absolute -left-24 top-0 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
    <div className="absolute right-0 top-10 h-72 w-72 rounded-full bg-emerald-400/12 blur-3xl" />
    <div className="absolute left-1/3 bottom-0 h-56 w-56 rounded-full bg-amber-400/10 blur-3xl" />
  </div>
);

// Slider settings
const sliderSettings = {
  className: "landing-carousel",
  dots: true,
  arrows: true,
  infinite: true,
  autoplay: true,
  autoplaySpeed: 3000,
  speed: 500,
  slidesToShow: 3,
  slidesToScroll: 1,
  prevArrow: <PrevArrow />,
  nextArrow: <NextArrow />,
  responsive: [
    {
      breakpoint: 1024,
      settings: { slidesToShow: 2 },
    },
    {
      breakpoint: 640,
      settings: { slidesToShow: 1 },
    },
  ],
};

const heroHighlights = [
  {
    label: "Chapel Hill first",
    detail: "Curated for UNC, Carrboro, and nearby enclaves.",
    icon: <MapPin className="w-4 h-4" />,
  },
  {
    label: "Fast insights",
    detail: "Ask, map, and compare in seconds.",
    icon: <TrendingUp className="w-4 h-4" />,
  },
  {
    label: "Always-on",
    detail: "Chat anytime - routes, schools, and ROI.",
    icon: <BotMessageSquare className="w-4 h-4" />,
  },
];

const features = [
  {
    title: "AI‑Powered Assistant",
    description:
      "Conversational guidance that learns your preferences and surfaces better homes over time.",
    icon: <BotMessageSquare className="w-16 h-16 text-primary" />,
  },
  {
    title: "Smart Property Mapping",
    description:
      "Map properties instantly - explore clusters, zoom into neighborhoods, and get oriented fast.",
    icon: <MapPin className="w-16 h-16 text-primary" />,
  },
  {
    title: "Insights & Analytics",
    description:
      "Graph relationships, neighborhood stats, and comparisons that add context to your search.",
    icon: <BarChart3 className="w-16 h-16 text-primary" />,
  },
  {
    title: "Mortgage & Affordability",
    description:
      "Built‑in calculators and charts to estimate payments and buying power in minutes.",
    icon: <TrendingUp className="w-16 h-16 text-primary" />,
  },
  {
    title: "Interactive Visualizations",
    description:
      "Clear visuals that adapt to dark mode and make complex info easy to read.",
    icon: <Star className="w-16 h-16 text-primary" />,
  },
  {
    title: "Neighborhood & ZIP Insights",
    description: "Explore areas and compare locations with clean summaries.",
    icon: <User className="w-16 h-16 text-primary" />,
  },
  {
    title: "Personalization & Feedback",
    description:
      "Like/dislike responses and refine results based on what matters to you.",
    icon: <CheckSquare className="w-16 h-16 text-primary" />,
  },
  {
    title: "Privacy & Security",
    description:
      "Data handled with care; no surprises - just a faster path to the right home.",
    icon: <Shield className="w-16 h-16 text-primary" />,
  },
];

const howItWorks = [
  {
    title: "Tell Us Your Goals",
    description: "Share budget, areas, and must‑haves to set the stage.",
    icon: <User className="w-16 h-16 text-primary" />,
  },
  {
    title: "Chat & Discover",
    description:
      "Get conversational recommendations and explore options that fit.",
    icon: <BotMessageSquare className="w-16 h-16 text-primary" />,
  },
  {
    title: "Visualize on a Map",
    description: "Open a map view to see locations and make quicker decisions.",
    icon: <MapPin className="w-16 h-16 text-primary" />,
  },
  {
    title: "Analyze With Insights",
    description: "Use graphs and neighborhood summaries to compare areas.",
    icon: <BarChart3 className="w-16 h-16 text-primary" />,
  },
  {
    title: "Estimate Affordability",
    description: "Run mortgage and payment calculators to set a smart budget.",
    icon: <TrendingUp className="w-16 h-16 text-primary" />,
  },
  {
    title: "Refine & Save",
    description:
      "Give feedback, adjust preferences, and keep progress for later.",
    icon: <CheckSquare className="w-16 h-16 text-primary" />,
  },
];

const chatAdvantages = [
  {
    title: "Real-Time Chat",
    description:
      "Experience dynamic conversations that instantly respond to your queries.",
    icon: <Smile className="w-16 h-16 text-primary" />,
  },
  {
    title: "Tailored Guidance",
    description:
      "Get recommendations and insights crafted specifically for you.",
    icon: <CheckSquare className="w-16 h-16 text-primary" />,
  },
  {
    title: "Interactive Experience",
    description:
      "Unlike static listings, enjoy a live chat that adapts to your needs.",
    icon: <FileText className="w-16 h-16 text-primary" />,
  },
  {
    title: "Instant Feedback",
    description:
      "Receive immediate responses and refine your search in real-time.",
    icon: <Shield className="w-16 h-16 text-primary" />,
  },
  {
    title: "User-Friendly",
    description: "Navigate effortlessly through our intuitive chat interface.",
    icon: <MapPin className="w-16 h-16 text-primary" />,
  },
  {
    title: "24/7 Availability",
    description:
      "Access property recommendations anytime, anywhere, at your convenience.",
    icon: <Phone className="w-16 h-16 text-primary" />,
  },
  {
    title: "Seamless Integration",
    description:
      "Easily connect with trusted local agents for further assistance and inquiries.",
    icon: <User className="w-16 h-16 text-primary" />,
  },
  {
    title: "Expert Insights",
    description:
      "Receive insider recommendations directly from our chatbot, based on local market trends.",
    icon: <Star className="w-16 h-16 text-primary" />,
  },
  {
    title: "Verified Listings",
    description:
      "Browse up-to-date and verified property listings in Chapel Hill.",
    icon: <CheckSquare className="w-16 h-16 text-primary" />,
  },
  {
    title: "Real-Time Updates",
    description:
      "Stay informed with the latest property listings and market trends.",
    icon: <TrendingUp className="w-16 h-16 text-primary" />,
  },
];

const testimonials = [
  {
    testimonial:
      "EstateWise made finding my dream home in Chapel Hill a breeze. The interactive chat is a total game changer!",
    author: "- Alice",
  },
  {
    testimonial:
      "The property recommendations feel so personalized. I truly enjoyed chatting with the bot.",
    author: "- Bob",
  },
  {
    testimonial:
      "I love the interactive approach. It’s not just browsing listings - it’s a conversation that guides me.",
    author: "- Charlie",
  },
  {
    testimonial:
      "I appreciate how quickly it responds. It saved me so much time finding the perfect home!",
    author: "- Diane",
  },
  {
    testimonial:
      "The personalized recommendations are spot-on. This is the future of home buying!",
    author: "- Edward",
  },
  {
    testimonial:
      "A revolutionary approach to real estate. It’s like having a personal advisor at your fingertips.",
    author: "- Fiona",
  },
  {
    testimonial:
      "The chatbot is incredibly intuitive. I felt like I was chatting with a friend who knows the market well.",
    author: "- George",
  },
];

const faqs = [
  {
    question: "What is EstateWise?",
    answer:
      "A conversational home‑search experience with maps, insights, and calculators to move from browsing to buying with confidence.",
  },
  {
    question: "Can I view homes on a map?",
    answer:
      "Yes. You can open a map of recommendations and explore locations to get oriented quickly.",
  },
  {
    question: "What’s in Insights?",
    answer:
      "Neighborhood summaries, relationship graphs, and clear comparisons that help you evaluate areas.",
  },
  {
    question: "Which calculators are included?",
    answer:
      "Mortgage, affordability, and payment breakdowns with visuals that adapt to light/dark mode.",
  },
  {
    question: "Do I need an account?",
    answer:
      "You can chat as a guest. Creating an account lets you save progress and revisit conversations.",
  },
  {
    question: "Is EstateWise free?",
    answer:
      "Yes. We aim to provide a fast, friendly way to explore homes at no cost.",
  },
  {
    question: "Where are listings from?",
    answer:
      "We reference publicly available listing data and link out for full property details.",
  },
  {
    question: "Does it work on mobile and in dark mode?",
    answer: "Yes. The UI, charts, and maps are responsive and theme‑aware.",
  },
  {
    question: "How is my data handled?",
    answer:
      "We take privacy seriously and handle your information responsibly.",
  },
  {
    question: "What areas are covered?",
    answer: "We focus on Chapel Hill today, with expansion planned.",
  },
];

export default function Home() {
  return (
    <>
      <Head>
        <title>EstateWise | Your Chapel Hill Property Assistant</title>
        <meta
          name="description"
          content="Discover dynamic, real-time property recommendations in Chapel Hill using our interactive chatbot."
        />
      </Head>

      <div className="font-sans overflow-x-hidden bg-background text-foreground">
        {/* Global smooth scrolling */}
        <style jsx global>{`
          html {
            scroll-behavior: smooth;
          }

          html,
          body {
            margin: 0;
            padding: 0;
            height: 100%;
            overscroll-behavior: none;
          }

          @keyframes glowFloat {
            0% {
              transform: translate3d(0, 0, 0) scale(1);
            }
            50% {
              transform: translate3d(8px, -8px, 0) scale(1.03);
            }
            100% {
              transform: translate3d(0, 0, 0) scale(1);
            }
          }

          .glow-blob {
            filter: blur(60px);
            opacity: 0.7;
            animation: glowFloat 18s ease-in-out infinite;
          }
        `}</style>

        <div className="fixed left-0 top-1/2 z-50 -translate-y-1/2">
          <div className="flex flex-col items-center gap-2 rounded-r-full border border-slate-200/70 border-l-0 bg-white/80 px-3 py-3 shadow-lg backdrop-blur transition hover:bg-white/90 dark:border-white/10 dark:bg-slate-900/70 dark:hover:bg-slate-900/80">
            <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-600/90 dark:text-slate-200/80">
              <span className="block dark:hidden">Light</span>
              <span className="hidden dark:block">Dark</span>
            </span>
            <DarkModeToggle
              className="h-10 w-10 rounded-full bg-slate-900/10 text-slate-900 shadow-sm hover:text-slate-900 dark:bg-white/10 dark:text-white"
              title="Toggle theme"
            />
          </div>
        </div>

        {/* Full Screen Hero Section */}
        <section className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
          <div
            className="absolute inset-0 opacity-60"
            style={{
              backgroundImage: "url('/home.webp')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-slate-950/60 to-slate-950" />
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/30 glow-blob" />
          <div className="absolute right-[-6rem] top-10 h-80 w-80 rounded-full bg-emerald-400/25 glow-blob" />
          <div className="absolute left-1/2 bottom-0 h-72 w-72 -translate-x-1/2 rounded-full bg-amber-400/20 glow-blob" />

          <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center px-4">
            <AnimatedInView delay={0}>
              <span className="inline-flex items-center gap-3 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold uppercase tracking-wide backdrop-blur">
                Chapel Hill · Carrboro · Durham
              </span>
            </AnimatedInView>
            <AnimatedInView delay={0.1}>
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 leading-tight drop-shadow-lg mt-4">
                EstateWise
              </h1>
            </AnimatedInView>
            <AnimatedInView delay={0.2}>
              <p className="text-lg md:text-2xl text-white/90 mb-8 max-w-3xl">
                Chat with a Chapel Hill-first concierge for real-time
                recommendations, neighborhood context, and mapped routes.
              </p>
            </AnimatedInView>
            <AnimatedInView delay={0.3}>
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                <Link href="/chat">
                  <Button
                    className="rounded-full px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg cursor-pointer shadow-lg shadow-primary/30"
                    aria-label="Start Chat"
                    title="Start Chat"
                  >
                    <BotMessageSquare className="w-5 h-5" />
                    Explore Properties
                  </Button>
                </Link>
                <Link href="/insights">
                  <Button
                    variant="secondary"
                    className="rounded-full px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg cursor-pointer bg-white/10 border-white/30 text-white hover:bg-white/20"
                    aria-label="Insights & Tools"
                    title="Insights & Tools"
                  >
                    <BarChart3 className="w-5 h-5" />
                    Insights & Tools
                  </Button>
                </Link>
                <Link href="/map">
                  <Button
                    variant="ghost"
                    className="rounded-full px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg cursor-pointer text-white hover:bg-white/10 hover:text-white"
                    aria-label="Properties Map"
                    title="Properties Map"
                  >
                    <MapPin className="w-5 h-5" />
                    Properties Map
                  </Button>
                </Link>
                <Link href="/analyzer">
                  <Button
                    variant="ghost"
                    className="rounded-full px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg cursor-pointer text-white hover:bg-white/10 hover:text-white border border-white/25"
                    aria-label="Deal Analyzer"
                    title="Deal Analyzer"
                  >
                    <Calculator className="w-5 h-5" />
                    Deal Analyzer
                  </Button>
                </Link>
              </div>
            </AnimatedInView>

            <AnimatedInView delay={0.4}>
              <div className="mt-8 flex flex-wrap justify-center gap-3 sm:gap-4 max-w-3xl">
                {heroHighlights.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 + idx * 0.08, duration: 0.4 }}
                    className="flex items-center gap-3 rounded-xl bg-white/10 border border-white/15 px-4 py-3 backdrop-blur shadow-lg"
                  >
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-white">
                      {item.icon}
                    </span>
                    <div className="text-left">
                      <p className="text-sm font-semibold">{item.label}</p>
                      <p className="text-xs text-white/75">{item.detail}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </AnimatedInView>

            <AnimatedInView delay={0.6}>
              <Link href="#features">
                <Button
                  className="mt-6 rounded-full px-8 py-3 text-base sm:text-lg transition-transform duration-300 bg-white/10 text-white hover:bg-white/20 cursor-pointer border border-white/25"
                  aria-label="Learn More"
                  title="Learn More"
                >
                  Learn More <ArrowDown className="w-5 h-5 inline-block ml-2" />
                </Button>
              </Link>
            </AnimatedInView>

            {/* Floating cards */}
            <div className="pointer-events-none absolute inset-0">
              <motion.div
                className="hidden sm:block absolute left-6 sm:left-10 bottom-14 sm:bottom-16 w-48 sm:w-56 rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4 text-left shadow-xl"
                initial={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
                animate={{
                  y: [0, -10, 0],
                  rotate: [0, 0.8, 0],
                }}
                transition={{
                  duration: 3.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  repeatType: "mirror",
                }}
              >
                <p className="text-xs uppercase text-white/70 mb-1">
                  Live activity
                </p>
                <p className="text-sm font-semibold">
                  4 Chapel Hill homes under $800k
                </p>
                <p className="text-xs text-white/70">Near UNC · Walkable</p>
              </motion.div>
              <motion.div
                className="hidden sm:block absolute right-6 sm:right-10 top-16 sm:top-20 w-48 sm:w-56 rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4 text-left shadow-xl"
                initial={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
                animate={{
                  y: [0, 12, 0],
                  rotate: [0, -0.6, 0],
                }}
                transition={{
                  duration: 3.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  repeatType: "mirror",
                }}
              >
                <p className="text-xs uppercase text-white/70 mb-1">
                  Map snapshot
                </p>
                <p className="text-sm font-semibold">EV-friendly townhomes</p>
                <p className="text-xs text-white/70">Carrboro · Hillsborough</p>
              </motion.div>
              <motion.div
                className="hidden sm:block absolute right-4 sm:right-12 bottom-10 sm:bottom-14 w-48 sm:w-56 rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4 text-left shadow-xl"
                initial={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
                animate={{
                  y: [0, 8, 0],
                  rotate: [0, 0.4, 0],
                }}
                transition={{
                  duration: 3.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  repeatType: "mirror",
                }}
              >
                <p className="text-xs uppercase text-white/70 mb-1">
                  Route idea
                </p>
                <p className="text-sm font-semibold">
                  Saturday tour: Meadowmont → Southern Village → Carrboro
                </p>
                <p className="text-xs text-white/70">8 stops · 22 min drive</p>
              </motion.div>
              <motion.div
                className="hidden sm:block absolute left-8 sm:left-16 top-10 sm:top-14 w-48 sm:w-56 rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4 text-left shadow-xl"
                initial={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
                animate={{
                  y: [0, -6, 0],
                  rotate: [0, -0.5, 0],
                }}
                transition={{
                  duration: 3.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  repeatType: "mirror",
                }}
              >
                <p className="text-xs uppercase text-white/70 mb-1">Trend</p>
                <p className="text-sm font-semibold">
                  Chapel Hill ranches gaining traction
                </p>
                <p className="text-xs text-white/70">+12% MoM interest</p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section
          id="features"
          className="relative bg-background text-foreground py-20 px-4 overflow-hidden"
        >
          <SectionBackdrop />
          <AnimatedInView delay={0}>
            <div className="max-w-6xl mx-auto text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Features</h2>
              <p className="text-lg text-muted-foreground">
                Discover what makes EstateWise your smart property companion in
                Chapel Hill.
              </p>
            </div>
          </AnimatedInView>
          <AnimatedInView delay={0.1}>
            <Slider {...sliderSettings}>
              {features.map((item, index) => (
                <div key={index} className="px-4">
                  <Card className="h-64 shadow-lg border-primary transition-shadow duration-300 hover:shadow-2xl bg-card/80 backdrop-blur">
                    <CardHeader className="flex flex-col items-center">
                      {item.icon}
                      <CardTitle className="mt-2 text-2xl font-bold">
                        {item.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 text-center text-muted-foreground">
                      {item.description}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </Slider>
          </AnimatedInView>
        </section>

        {/* How It Works Section */}
        <section
          id="how-it-works"
          className="relative bg-background text-foreground py-20 px-4 overflow-hidden"
        >
          <SectionBackdrop />
          <AnimatedInView delay={0}>
            <div className="max-w-6xl mx-auto text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">How It Works</h2>
              <p className="text-lg text-muted-foreground">
                Follow these simple steps and let our chatbot guide your home
                search.
              </p>
            </div>
          </AnimatedInView>
          <AnimatedInView delay={0.1}>
            <Slider {...sliderSettings}>
              {howItWorks.map((step, index) => (
                <div key={index} className="px-4">
                  <Card className="h-64 shadow-lg border-primary transition-shadow duration-300 hover:shadow-2xl bg-card/80 backdrop-blur">
                    <CardHeader className="flex flex-col items-center">
                      {step.icon}
                      <CardTitle className="mt-2 text-2xl font-bold">
                        {step.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 text-center text-muted-foreground">
                      {step.description}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </Slider>
          </AnimatedInView>
        </section>

        {/* Interactive Chat Advantage Section */}
        <section
          id="chat-advantage"
          className="relative bg-background text-foreground py-20 px-4 overflow-hidden"
        >
          <SectionBackdrop />
          <AnimatedInView delay={0}>
            <div className="max-w-6xl mx-auto text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">
                Interactive Chat Experience
              </h2>
              <p className="text-lg text-muted-foreground">
                Enjoy real-time, interactive property recommendations that adapt
                to your queries.
              </p>
            </div>
          </AnimatedInView>
          <AnimatedInView delay={0.1}>
            <Slider {...sliderSettings}>
              {chatAdvantages.map((item, index) => (
                <div key={index} className="px-4">
                  <Card className="h-64 shadow-lg border-primary transition-shadow duration-300 hover:shadow-2xl bg-card/80 backdrop-blur">
                    <CardHeader className="flex flex-col items-center">
                      {item.icon}
                      <CardTitle className="mt-2 text-2xl font-bold">
                        {item.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 text-center text-muted-foreground">
                      {item.description}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </Slider>
          </AnimatedInView>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="hidden">
          <AnimatedInView delay={0}>
            <div className="max-w-6xl mx-auto text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Testimonials</h2>
              <p className="text-lg text-muted-foreground">
                Hear from our satisfied users who have found their perfect home.
              </p>
            </div>
          </AnimatedInView>
          <AnimatedInView delay={0.1}>
            <Slider {...sliderSettings}>
              {testimonials.map((item, index) => (
                <div key={index} className="px-4">
                  <Card className="h-35 shadow-lg border-primary">
                    <CardContent className="flex flex-col justify-evenly text-center">
                      <p className="italic">{item.testimonial}</p>
                      <div className="flex items-center justify-center space-x-2">
                        <span className="font-bold">{item.author}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </Slider>
          </AnimatedInView>
        </section>

        {/* Capabilities Section */}
        <section id="capabilities" className="hidden">
          <AnimatedInView delay={0}>
            <div className="max-w-6xl mx-auto text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">What You Can Do</h2>
              <p className="text-lg text-muted-foreground">
                Move from ideas to action with tools that make home shopping
                fast and clear.
              </p>
            </div>
          </AnimatedInView>
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <BotMessageSquare className="w-8 h-8 text-primary" />,
                title: "Ask and refine",
                desc: "Chat your goals and narrow results with natural conversation.",
              },
              {
                icon: <MapPin className="w-8 h-8 text-primary" />,
                title: "See it on a map",
                desc: "Plot homes, compare areas, and zoom into neighborhoods.",
              },
              {
                icon: <BarChart3 className="w-8 h-8 text-primary" />,
                title: "Compare with insights",
                desc: "Neighborhood summaries and relationship graphs for context.",
              },
              {
                icon: <TrendingUp className="w-8 h-8 text-primary" />,
                title: "Estimate payments",
                desc: "Mortgage and affordability calculators with clear breakdowns.",
              },
              {
                icon: <CheckSquare className="w-8 h-8 text-primary" />,
                title: "Personalize",
                desc: "Thumbs up/down to teach the assistant what you like.",
              },
              {
                icon: <Shield className="w-8 h-8 text-primary" />,
                title: "Browse confidently",
                desc: "Responsive, theme‑aware UI with privacy in mind.",
              },
            ].map((it, i) => (
              <AnimatedInView key={i} delay={0.05 * i}>
                <Card className="h-full transition-shadow duration-300 hover:shadow-xl bg-card/80 backdrop-blur">
                  <CardHeader className="flex flex-row items-center gap-3">
                    {it.icon}
                    <CardTitle className="text-xl">{it.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {it.desc}
                  </CardContent>
                </Card>
              </AnimatedInView>
            ))}
          </div>
        </section>

        {/* Use Cases Section */}
        <section
          id="use-cases"
          className="relative bg-background text-foreground py-20 px-4 overflow-hidden"
        >
          <SectionBackdrop />
          <AnimatedInView delay={0}>
            <div className="max-w-6xl mx-auto text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Use Cases</h2>
              <p className="text-lg text-muted-foreground">
                A few ways people put EstateWise to work.
              </p>
            </div>
          </AnimatedInView>
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <User className="w-8 h-8 text-primary" />,
                title: "First home",
                desc: "Understand budgets, compare areas, and shortlist options quickly.",
              },
              {
                icon: <MapPin className="w-8 h-8 text-primary" />,
                title: "Relocation",
                desc: "Get oriented fast with maps and neighborhood summaries.",
              },
              {
                icon: <BarChart3 className="w-8 h-8 text-primary" />,
                title: "Compare areas",
                desc: "Use insights to weigh tradeoffs across neighborhoods.",
              },
              {
                icon: <TrendingUp className="w-8 h-8 text-primary" />,
                title: "Affordability check",
                desc: "Estimate monthly payments and buying power in minutes.",
              },
              {
                icon: <CheckSquare className="w-8 h-8 text-primary" />,
                title: "Shortlist fast",
                desc: "Teach the assistant with quick feedback and refine results.",
              },
              {
                icon: <GithubIcon className="w-8 h-8 text-primary" />,
                title: "Power user",
                desc: "Jump between chat, map, and insights to move faster.",
              },
            ].map((it, i) => (
              <AnimatedInView key={i} delay={0.04 * i}>
                <Card className="h-full transition-shadow duration-300 hover:shadow-xl bg-card/80 backdrop-blur">
                  <CardHeader className="flex flex-row items-center gap-3">
                    {it.icon}
                    <CardTitle className="text-xl">{it.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {it.desc}
                  </CardContent>
                </Card>
              </AnimatedInView>
            ))}
          </div>
        </section>

        {/* Common Workflows Section */}
        <section
          id="workflows"
          className="relative bg-background text-foreground py-20 px-4 overflow-hidden"
        >
          <SectionBackdrop />
          <AnimatedInView delay={0}>
            <div className="max-w-6xl mx-auto text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Common Workflows</h2>
              <p className="text-lg text-muted-foreground">
                Fast, repeatable steps for confidence and speed.
              </p>
            </div>
          </AnimatedInView>
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <BotMessageSquare className="w-8 h-8 text-primary" />,
                title: "Explore",
                desc: "Ask for homes that match your criteria, then refine.",
              },
              {
                icon: <MapPin className="w-8 h-8 text-primary" />,
                title: "Orient",
                desc: "Open the map to visualize location and proximity.",
              },
              {
                icon: <BarChart3 className="w-8 h-8 text-primary" />,
                title: "Analyze",
                desc: "Use insights and calculators to assess fit and budget.",
              },
            ].map((it, i) => (
              <AnimatedInView key={i} delay={0.04 * i}>
                <Card className="h-full transition-shadow duration-300 hover:shadow-xl bg-card/80 backdrop-blur">
                  <CardHeader className="flex flex-row items-center gap-3">
                    {it.icon}
                    <CardTitle className="text-xl">{it.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {it.desc}
                  </CardContent>
                </Card>
              </AnimatedInView>
            ))}
          </div>
        </section>

        {/* Trust & Privacy Section */}
        <section
          id="trust"
          className="relative bg-background text-foreground py-20 px-4 overflow-hidden"
        >
          <SectionBackdrop />
          <AnimatedInView delay={0}>
            <div className="max-w-6xl mx-auto text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Trust & Privacy</h2>
              <p className="text-lg text-muted-foreground">
                Built to inform, not overwhelm - with privacy in mind.
              </p>
            </div>
          </AnimatedInView>
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <Shield className="w-8 h-8 text-primary" />,
                title: "Privacy‑minded",
                desc: "Focused UI and responsible handling of your information.",
              },
              {
                icon: <FileText className="w-8 h-8 text-primary" />,
                title: "Transparent links",
                desc: "Jump to source listings for full details when needed.",
              },
              {
                icon: <CheckSquare className="w-8 h-8 text-primary" />,
                title: "In your control",
                desc: "Refine results with feedback and adjust preferences anytime.",
              },
            ].map((it, i) => (
              <AnimatedInView key={i} delay={0.04 * i}>
                <Card className="h-full transition-shadow duration-300 hover:shadow-xl bg-card/80 backdrop-blur">
                  <CardHeader className="flex flex-row items-center gap-3">
                    {it.icon}
                    <CardTitle className="text-xl">{it.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {it.desc}
                  </CardContent>
                </Card>
              </AnimatedInView>
            ))}
          </div>
        </section>

        {/* Tech Highlights Section */}
        <section
          id="tech"
          className="relative bg-background text-foreground py-20 px-4 overflow-hidden"
        >
          <SectionBackdrop />
          <AnimatedInView delay={0}>
            <div className="max-w-6xl mx-auto text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Tech Highlights</h2>
              <p className="text-lg text-muted-foreground">
                Modern stack for speed, clarity, and reliability.
              </p>
            </div>
          </AnimatedInView>
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              {
                icon: <BotMessageSquare className="w-7 h-7 text-primary" />,
                title: "AI assistant",
                desc: "Conversational guidance to explore options fast.",
              },
              {
                icon: <MapPin className="w-7 h-7 text-primary" />,
                title: "Interactive map",
                desc: "Leaflet‑based view to orient and compare.",
              },
              {
                icon: <BarChart3 className="w-7 h-7 text-primary" />,
                title: "Readable charts",
                desc: "Theme‑aware visuals for light and dark.",
              },
              {
                icon: <TrendingUp className="w-7 h-7 text-primary" />,
                title: "Calculators",
                desc: "Mortgage and affordability built in.",
              },
            ].map((it, i) => (
              <AnimatedInView key={i} delay={0.03 * i}>
                <Card className="h-full transition-shadow duration-300 hover:shadow-xl bg-card/80 backdrop-blur">
                  <CardHeader className="flex flex-row items-center gap-3">
                    {it.icon}
                    <CardTitle className="text-lg">{it.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {it.desc}
                  </CardContent>
                </Card>
              </AnimatedInView>
            ))}
          </div>
        </section>

        {/* Performance Section */}
        <section
          id="performance"
          className="relative bg-background text-foreground py-20 px-4 overflow-hidden"
        >
          <SectionBackdrop />
          <AnimatedInView delay={0}>
            <div className="max-w-6xl mx-auto text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Performance</h2>
              <p className="text-lg text-muted-foreground">
                Snappy, responsive, and tuned for a smooth experience.
              </p>
            </div>
          </AnimatedInView>
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "Fast navigation",
                desc: "Quick transitions between chat, map, and insights.",
              },
              {
                title: "Clean rendering",
                desc: "Readable charts and maps that don’t get in your way.",
              },
              {
                title: "Lightweight UI",
                desc: "Focused design for clarity and speed.",
              },
            ].map((it, i) => (
              <AnimatedInView key={i} delay={0.04 * i}>
                <Card className="h-full transition-shadow duration-300 hover:shadow-xl bg-card/80 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-lg">{it.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {it.desc}
                  </CardContent>
                </Card>
              </AnimatedInView>
            ))}
          </div>
        </section>

        {/* Accessibility & Themes Section */}
        <section
          id="accessibility"
          className="relative bg-background text-foreground py-20 px-4 overflow-hidden"
        >
          <SectionBackdrop />
          <AnimatedInView delay={0}>
            <div className="max-w-6xl mx-auto text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">
                Accessibility & Themes
              </h2>
              <p className="text-lg text-muted-foreground">
                Designed to be usable and legible across devices and themes.
              </p>
            </div>
          </AnimatedInView>
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "Dark‑mode friendly",
                desc: "Theme‑aware charts and UI for easy reading.",
              },
              {
                title: "Responsive layout",
                desc: "Comfortable to use on desktop and mobile.",
              },
              {
                title: "Clear text & contrast",
                desc: "Readable color choices for content and visuals.",
              },
            ].map((it, i) => (
              <AnimatedInView key={i} delay={0.04 * i}>
                <Card className="h-full transition-shadow duration-300 hover:shadow-xl bg-card/80 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-lg">{it.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {it.desc}
                  </CardContent>
                </Card>
              </AnimatedInView>
            ))}
          </div>
        </section>

        {/* Built‑In Tools Section */}
        <section
          id="tools"
          className="relative bg-background text-foreground py-20 px-4 overflow-hidden"
        >
          <SectionBackdrop />
          <AnimatedInView delay={0}>
            <div className="max-w-6xl mx-auto text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Built‑In Tools</h2>
              <p className="text-lg text-muted-foreground">
                Everything you need to explore, compare, and plan - in one
                place.
              </p>
            </div>
          </AnimatedInView>
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <BotMessageSquare className="w-8 h-8 text-primary" />,
                title: "Chat",
                desc: "Ask questions in natural language and refine with feedback.",
              },
              {
                icon: <MapPin className="w-8 h-8 text-primary" />,
                title: "Map",
                desc: "Plot properties, navigate areas, and visualize location tradeoffs.",
              },
              {
                icon: <BarChart3 className="w-8 h-8 text-primary" />,
                title: "Insights",
                desc: "Neighborhood stats and relationships to compare at a glance.",
              },
              {
                icon: <TrendingUp className="w-8 h-8 text-primary" />,
                title: "Calculators",
                desc: "Mortgage, affordability, and monthly breakdowns.",
              },
              {
                icon: <CheckSquare className="w-8 h-8 text-primary" />,
                title: "Personalization",
                desc: "Results adapt as you like/dislike and adjust preferences.",
              },
              {
                icon: <Shield className="w-8 h-8 text-primary" />,
                title: "Theme & Privacy",
                desc: "Responsive, dark‑mode ready, and privacy‑minded.",
              },
            ].map((it, i) => (
              <AnimatedInView key={i} delay={0.04 * i}>
                <Card className="h-full transition-shadow duration-300 hover:shadow-xl bg-card/80 backdrop-blur">
                  <CardHeader className="flex flex-row items-center gap-3">
                    {it.icon}
                    <CardTitle className="text-xl">{it.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {it.desc}
                  </CardContent>
                </Card>
              </AnimatedInView>
            ))}
          </div>
        </section>

        {/* Testimonials Section */}
        <section
          id="testimonials"
          className="relative bg-background text-foreground py-20 px-4 overflow-hidden"
        >
          <SectionBackdrop />
          <AnimatedInView delay={0}>
            <div className="max-w-6xl mx-auto text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Testimonials</h2>
              <p className="text-lg text-muted-foreground">
                Hear from our satisfied users who have found their perfect home.
              </p>
            </div>
          </AnimatedInView>
          <AnimatedInView delay={0.1}>
            <Slider {...sliderSettings}>
              {testimonials.map((item, index) => (
                <div key={index} className="px-4">
                  <Card className="h-35 shadow-lg border-primary">
                    <CardContent className="flex flex-col justify-evenly text-center">
                      <p className="italic">{item.testimonial}</p>
                      <div className="flex items-center justify-center space-x-2">
                        <span className="font-bold">{item.author}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </Slider>
          </AnimatedInView>
        </section>

        {/* Capabilities Section */}
        <section
          id="capabilities"
          className="bg-background text-foreground py-20 px-4"
        >
          <AnimatedInView delay={0}>
            <div className="max-w-6xl mx-auto text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">What You Can Do</h2>
              <p className="text-lg text-muted-foreground">
                Move from ideas to action with tools that make home shopping
                fast and clear.
              </p>
            </div>
          </AnimatedInView>
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <BotMessageSquare className="w-8 h-8 text-primary" />,
                title: "Ask and refine",
                desc: "Chat your goals and narrow results with natural conversation.",
              },
              {
                icon: <MapPin className="w-8 h-8 text-primary" />,
                title: "See it on a map",
                desc: "Plot homes, compare areas, and zoom into neighborhoods.",
              },
              {
                icon: <BarChart3 className="w-8 h-8 text-primary" />,
                title: "Compare with insights",
                desc: "Neighborhood summaries and relationship graphs for context.",
              },
              {
                icon: <TrendingUp className="w-8 h-8 text-primary" />,
                title: "Estimate payments",
                desc: "Mortgage and affordability calculators with clear breakdowns.",
              },
              {
                icon: <CheckSquare className="w-8 h-8 text-primary" />,
                title: "Personalize",
                desc: "Thumbs up/down to teach the assistant what you like.",
              },
              {
                icon: <Shield className="w-8 h-8 text-primary" />,
                title: "Browse confidently",
                desc: "Responsive, theme‑aware UI with privacy in mind.",
              },
            ].map((it, i) => (
              <AnimatedInView key={i} delay={0.05 * i}>
                <Card className="h-full transition-shadow duration-300 hover:shadow-xl bg-card/80 backdrop-blur">
                  <CardHeader className="flex flex-row items-center gap-3">
                    {it.icon}
                    <CardTitle className="text-xl">{it.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {it.desc}
                  </CardContent>
                </Card>
              </AnimatedInView>
            ))}
          </div>
        </section>

        {/* Who It's For Section */}
        <section
          id="who-for"
          className="bg-background text-foreground py-20 px-4"
        >
          <AnimatedInView delay={0}>
            <div className="max-w-6xl mx-auto text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Who It’s For</h2>
              <p className="text-lg text-muted-foreground">
                Built for buyers who want clarity without the clutter.
              </p>
            </div>
          </AnimatedInView>
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              {
                icon: <User className="w-7 h-7 text-primary" />,
                title: "First‑time buyers",
                desc: "Understand options with simple, guided steps.",
              },
              {
                icon: <TrendingUp className="w-7 h-7 text-primary" />,
                title: "Move‑up shoppers",
                desc: "Quickly compare neighborhoods and budgets.",
              },
              {
                icon: <MapPin className="w-7 h-7 text-primary" />,
                title: "Out‑of‑towners",
                desc: "Get oriented fast with maps and summaries.",
              },
              {
                icon: <BarChart3 className="w-7 h-7 text-primary" />,
                title: "Data‑minded",
                desc: "Use charts and graphs to decide with confidence.",
              },
              {
                icon: <CheckSquare className="w-7 h-7 text-primary" />,
                title: "Busy professionals",
                desc: "Cut through noise - get to shortlist faster.",
              },
              {
                icon: <BotMessageSquare className="w-7 h-7 text-primary" />,
                title: "Chat‑first users",
                desc: "Prefer conversation over filters and forms.",
              },
              {
                icon: <Shield className="w-7 h-7 text-primary" />,
                title: "Privacy‑conscious",
                desc: "Explore with confidence on a focused, secure UI.",
              },
              {
                icon: <Phone className="w-7 h-7 text-primary" />,
                title: "Decision makers",
                desc: "Bring facts and visuals to the table quickly.",
              },
            ].map((it, i) => (
              <AnimatedInView key={i} delay={0.03 * i}>
                <Card className="h-full transition-shadow duration-300 hover:shadow-xl bg-card/80 backdrop-blur">
                  <CardHeader className="flex flex-row items-center gap-3">
                    {it.icon}
                    <CardTitle className="text-lg">{it.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {it.desc}
                  </CardContent>
                </Card>
              </AnimatedInView>
            ))}
          </div>
        </section>

        {/* Why EstateWise Section */}
        <section id="why" className="bg-background text-foreground py-20 px-4">
          <AnimatedInView delay={0}>
            <div className="max-w-6xl mx-auto text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Why EstateWise</h2>
              <p className="text-lg text-muted-foreground">
                Clear, fast, and helpful - from first chat to confident
                decisions.
              </p>
            </div>
          </AnimatedInView>
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                title: "Clarity over clutter",
                desc: "No noisy feeds - just the right tools at the right time.",
              },
              {
                title: "Context that matters",
                desc: "Neighborhoods, relationships, and numbers that actually help decisions.",
              },
              {
                title: "Made for dark mode",
                desc: "Readable charts and UI that adapt to your theme.",
              },
              {
                title: "Actionable by design",
                desc: "From chat to map to calculator - every step moves you forward.",
              },
              {
                title: "Always improving",
                desc: "Feedback helps tailor results and refine suggestions.",
              },
              {
                title: "Focused footprint",
                desc: "Streamlined experience without distractions or bloat.",
              },
            ].map((it, i) => (
              <AnimatedInView key={i} delay={0.03 * i}>
                <Card className="h-full transition-shadow duration-300 hover:shadow-xl bg-card/80 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-lg">{it.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {it.desc}
                  </CardContent>
                </Card>
              </AnimatedInView>
            ))}
          </div>
        </section>

        {/* FAQs Section */}
        <section
          id="faqs"
          className="relative bg-background text-foreground py-20 px-4 overflow-hidden"
        >
          <SectionBackdrop />
          <AnimatedInView delay={0}>
            <div className="max-w-6xl mx-auto text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-lg text-muted-foreground">
                Find answers to some of our most common queries.
              </p>
            </div>
          </AnimatedInView>
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
            {faqs.map((faq, index) => (
              <AnimatedInView key={index} delay={0.1}>
                <Card className="shadow-lg rounded-lg p-6 transition-transform border-primary h-full flex flex-col">
                  <h3 className="text-2xl font-bold mb-0">{faq.question}</h3>
                  <p className="text-muted-foreground flex-grow">
                    {faq.answer}
                  </p>
                </Card>
              </AnimatedInView>
            ))}
          </div>
        </section>

        {/* Get Started CTA Section */}
        <section
          id="get-started"
          className="relative py-24 px-4 text-foreground overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />
          <div className="relative max-w-6xl mx-auto">
            <AnimatedInView delay={0}>
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold mb-4">Get Started</h2>
                <p className="text-lg text-muted-foreground">
                  Pick a starting point and dive in - no sign‑up required.
                </p>
              </div>
            </AnimatedInView>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <AnimatedInView delay={0.05}>
                <Card className="h-full border-primary/40">
                  <CardHeader className="flex flex-row items-center gap-3">
                    <BotMessageSquare className="w-6 h-6 text-primary" />
                    <CardTitle className="text-xl">Chat</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-4">
                    <p>Tell us what you want and get tailored suggestions.</p>
                    <Button asChild className="w-full cursor-pointer">
                      <Link href="/chat">Open Chat</Link>
                    </Button>
                  </CardContent>
                </Card>
              </AnimatedInView>
              <AnimatedInView delay={0.1}>
                <Card className="h-full border-primary/40">
                  <CardHeader className="flex flex-row items-center gap-3">
                    <BarChart3 className="w-6 h-6 text-primary" />
                    <CardTitle className="text-xl">Insights</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-4">
                    <p>
                      Compare neighborhoods and run calculators to plan smart.
                    </p>
                    <Button
                      asChild
                      variant="outline"
                      className="w-full cursor-pointer"
                    >
                      <Link href="/insights">Explore Insights</Link>
                    </Button>
                  </CardContent>
                </Card>
              </AnimatedInView>
              <AnimatedInView delay={0.15}>
                <Card className="h-full border-primary/40">
                  <CardHeader className="flex flex-row items-center gap-3">
                    <MapPin className="w-6 h-6 text-primary" />
                    <CardTitle className="text-xl">Map</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-4">
                    <p>See locations at a glance and get oriented fast.</p>
                    <Button
                      asChild
                      variant="secondary"
                      className="w-full cursor-pointer"
                    >
                      <Link href="/map">View Map</Link>
                    </Button>
                  </CardContent>
                </Card>
              </AnimatedInView>
            </div>

            <AnimatedInView delay={0.2}>
              <div className="mt-8">
                <p className="text-center text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground mb-4">
                  More starting points
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/analyzer">Deal Analyzer</Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/market-pulse">Market Pulse</Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/forums">Forums</Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/charts">Charts</Link>
                  </Button>
                  <Button asChild variant="secondary" className="w-full">
                    <Link href="/login">Log In</Link>
                  </Button>
                  <Button asChild className="w-full">
                    <Link href="/signup">Sign Up</Link>
                  </Button>
                </div>
              </div>
            </AnimatedInView>

            <AnimatedInView delay={0.25}>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs">
                <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground">
                  No sign‑up required
                </span>
                <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground">
                  Dark‑mode ready
                </span>
                <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground">
                  Mobile friendly
                </span>
              </div>
            </AnimatedInView>
          </div>
        </section>

        {/* Footer Section */}
        <footer className="bg-background text-muted-foreground py-8 px-4 text-center shadow-lg">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between">
            <p className="text-sm">
              © {new Date().getFullYear()}{" "}
              <strong className="font-bold">EstateWise</strong>. All rights
              reserved.
            </p>
            <div className="mt-4 md:mt-0 flex flex-wrap items-center gap-4 justify-center md:justify-start">
              <Link
                href="https://github.com/hoangsonww/EstateWise-Chapel-Hill-Estate"
                className="flex items-center whitespace-nowrap hover:text-primary transition-colors"
                aria-label="GitHub Repository"
                title="GitHub Repository"
              >
                <GithubIcon className="w-4 h-4 mr-1" />
                <span className="text-sm">GitHub Repository</span>
              </Link>
              <Link
                href="/privacy"
                className="flex items-center whitespace-nowrap hover:text-primary transition-colors"
                aria-label="Privacy Policy"
                title="Privacy Policy"
              >
                <Shield className="w-4 h-4 mr-1" />
                <span className="text-sm">Privacy Policy</span>
              </Link>
              <Link
                href="/terms"
                className="flex items-center whitespace-nowrap hover:text-primary transition-colors"
                aria-label="Terms of Service"
                title="Terms of Service"
              >
                <FileText className="w-4 h-4 mr-1" />
                <span className="text-sm">Terms of Service</span>
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
