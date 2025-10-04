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

// Slider settings
const sliderSettings = {
  dots: true,
  arrows: true,
  infinite: false,
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
      "Map properties instantly — explore clusters, zoom into neighborhoods, and get oriented fast.",
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
      "Data handled with care; no surprises — just a faster path to the right home.",
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
    author: "— Alice",
  },
  {
    testimonial:
      "The property recommendations feel so personalized. I truly enjoyed chatting with the bot.",
    author: "— Bob",
  },
  {
    testimonial:
      "I love the interactive approach. It’s not just browsing listings – it’s a conversation that guides me.",
    author: "— Charlie",
  },
  {
    testimonial:
      "I appreciate how quickly it responds. It saved me so much time finding the perfect home!",
    author: "— Diane",
  },
  {
    testimonial:
      "The personalized recommendations are spot-on. This is the future of home buying!",
    author: "— Edward",
  },
  {
    testimonial:
      "A revolutionary approach to real estate. It’s like having a personal advisor at your fingertips.",
    author: "— Fiona",
  },
  {
    testimonial:
      "The chatbot is incredibly intuitive. I felt like I was chatting with a friend who knows the market well.",
    author: "— George",
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

      <div className="font-sans overflow-x-hidden">
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
        `}</style>

        {/* Full Screen Hero Section */}
        <section
          className="relative h-screen w-full border-4 border-primary"
          style={{
            backgroundImage: "url('/home.webp')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* Overlay for contrast */}
          <div className="absolute inset-0 bg-black/60"></div>
          <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center px-4">
            <AnimatedInView delay={0}>
              <h1 className="text-5xl md:text-7xl font-bold text-white mb-4">
                EstateWise
              </h1>
            </AnimatedInView>
            <AnimatedInView delay={0.2}>
              <p className="text-lg md:text-2xl text-white mb-8">
                Chat with our intelligent bot for real-time, personalized real
                estate recommendations.
              </p>
            </AnimatedInView>
            <AnimatedInView delay={0.4}>
              <Link href="/chat">
                <Button
                  className="rounded-full px-8 py-4 text-lg cursor-pointer"
                  aria-label="Start Chat"
                  title="Start Chat"
                >
                  <BotMessageSquare className="w-5 h-5" />
                  Explore Properties
                </Button>
              </Link>
            </AnimatedInView>
            <AnimatedInView delay={0.5}>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-4">
                <Link href="/insights">
                  <Button
                    variant="default"
                    className="rounded-full px-8 py-4 text-lg cursor-pointer shadow-md"
                    aria-label="Insights & Tools"
                    title="Insights & Tools"
                  >
                    <BarChart3 className="w-5 h-5" />
                    Insights & Tools
                  </Button>
                </Link>
                <Link href="/map">
                  <Button
                    variant="secondary"
                    className="rounded-full px-8 py-4 text-lg cursor-pointer shadow-md"
                    aria-label="Properties Map"
                    title="Properties Map"
                  >
                    <MapPin className="w-5 h-5" />
                    Properties Map
                  </Button>
                </Link>
                <Link href="/resilience-lab">
                  <Button
                    variant="outline"
                    className="rounded-full px-8 py-4 text-lg cursor-pointer shadow-md"
                    aria-label="Community Resilience Lab"
                    title="Community Resilience Lab"
                  >
                    <Shield className="w-5 h-5" />
                    Resilience Lab
                  </Button>
                </Link>
              </div>
            </AnimatedInView>
            <AnimatedInView delay={0.6}>
              <Link href="#features">
                <Button
                  className="mt-4 rounded-full px-8 py-4 text-lg transition-transform duration-300 bg-transparent cursor-pointer"
                  aria-label="Learn More"
                  title="Learn More"
                >
                  Learn More <ArrowDown className="w-5 h-5 inline-block" />
                </Button>
              </Link>
            </AnimatedInView>
          </div>
        </section>

        {/* Features Section */}
        <section
          id="features"
          className="bg-background text-foreground py-20 px-4"
        >
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
                  <AnimatedInView>
                    <Card className="h-64 shadow-lg border-primary">
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
                  </AnimatedInView>
                </div>
              ))}
            </Slider>
          </AnimatedInView>
        </section>

        {/* How It Works Section */}
        <section
          id="how-it-works"
          className="bg-background text-foreground py-20 px-4"
        >
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
                  <AnimatedInView>
                    <Card className="h-64 shadow-lg border-primary">
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
                  </AnimatedInView>
                </div>
              ))}
            </Slider>
          </AnimatedInView>
        </section>

        {/* Interactive Chat Advantage Section */}
        <section
          id="chat-advantage"
          className="bg-background text-foreground py-20 px-4"
        >
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
                  <AnimatedInView>
                    <Card className="h-64 shadow-lg border-primary">
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
                  </AnimatedInView>
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
                  <AnimatedInView>
                    <Card className="h-35 shadow-lg border-primary">
                      <CardContent className="flex flex-col justify-evenly text-center">
                        <p className="italic">{item.testimonial}</p>
                        <div className="flex items-center justify-center space-x-2">
                          <span className="font-bold">{item.author}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </AnimatedInView>
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
                <Card className="h-full">
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
          className="bg-background text-foreground py-20 px-4"
        >
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
                <Card className="h-full">
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
          className="bg-background text-foreground py-20 px-4"
        >
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
                <Card className="h-full">
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
          className="bg-background text-foreground py-20 px-4"
        >
          <AnimatedInView delay={0}>
            <div className="max-w-6xl mx-auto text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Trust & Privacy</h2>
              <p className="text-lg text-muted-foreground">
                Built to inform, not overwhelm — with privacy in mind.
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
                <Card className="h-full">
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
        <section id="tech" className="bg-background text-foreground py-20 px-4">
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
                <Card className="h-full">
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
          className="bg-background text-foreground py-20 px-4"
        >
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
                <Card className="h-full">
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
          className="bg-background text-foreground py-20 px-4"
        >
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
                <Card className="h-full">
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
          className="bg-background text-foreground py-20 px-4"
        >
          <AnimatedInView delay={0}>
            <div className="max-w-6xl mx-auto text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Built‑In Tools</h2>
              <p className="text-lg text-muted-foreground">
                Everything you need to explore, compare, and plan — in one
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
                <Card className="h-full">
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
          className="bg-background text-foreground py-20 px-4"
        >
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
                  <AnimatedInView>
                    <Card className="h-35 shadow-lg border-primary">
                      <CardContent className="flex flex-col justify-evenly text-center">
                        <p className="italic">{item.testimonial}</p>
                        <div className="flex items-center justify-center space-x-2">
                          <span className="font-bold">{item.author}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </AnimatedInView>
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
                <Card className="h-full">
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
                desc: "Cut through noise — get to shortlist faster.",
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
                <Card className="h-full">
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
                Clear, fast, and helpful — from first chat to confident
                decisions.
              </p>
            </div>
          </AnimatedInView>
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                title: "Clarity over clutter",
                desc: "No noisy feeds — just the right tools at the right time.",
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
                desc: "From chat to map to calculator — every step moves you forward.",
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
                <Card className="h-full">
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
        <section id="faqs" className="bg-background text-foreground py-20 px-4">
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
                  Pick a starting point — you can always switch.
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
