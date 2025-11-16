"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Head from "next/head";
import Link from "next/link";
import Cookies from "js-cookie";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { toast } from "sonner";
import {
  Loader2,
  BotMessageSquare,
  Send,
  Trash2,
  Search,
  Sun,
  Moon,
  User as UserIcon,
  PlusCircle,
  Pencil,
  X,
  Home,
  Menu,
  ChevronLeft,
  LogOut,
  BarChart3,
  MapPin,
  GitBranch,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  Inbox,
  LogIn,
  Settings,
  Cpu,
  Zap,
  Check,
  Copy,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import Chart, { ChartConfiguration } from "chart.js/auto";

const API_BASE_URL = "https://estatewise-backend.vercel.app";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { when: "beforeChildren", staggerChildren: 0.1 },
  },
};

const bubbleVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

const desktopSidebarVariants = {
  visible: { width: "18rem", transition: { duration: 0.6, ease: "easeInOut" } },
  hidden: { width: "0rem", transition: { duration: 0.6, ease: "easeInOut" } },
};

// ----------------------------------------------------------
// ChartBlock Component for rendering Chart.js specs
// ----------------------------------------------------------
interface ChartBlockProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  spec: any;
}

export const ChartBlock: React.FC<ChartBlockProps> = React.memo(
  ({ spec }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<Chart | null>(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stripAlpha = (color: any): any => {
      if (typeof color === "string" && color.startsWith("rgba")) {
        // convert "rgba(r, g, b, a)" → "rgb(r, g, b)"
        return color.replace(
          /rgba\(\s*([0-9]+,\s*[0-9]+,\s*[0-9]+),\s*[\d.]+\s*\)/,
          "rgb($1)",
        );
      }
      if (Array.isArray(color)) {
        return color.map(stripAlpha);
      }
      return color;
    };

    const getFontColor = () => {
      const isDark = document.documentElement.classList.contains("dark");
      if (canvasRef.current) {
        return getComputedStyle(canvasRef.current).color;
      }
      return isDark ? "#ffffff" : "#000000";
    };

    const specString = JSON.stringify(spec);

    useEffect(() => {
      if (!canvasRef.current) return;

      // re‑parse the spec so we can safely mutate it
      const config: ChartConfiguration = JSON.parse(specString);
      const fontColor = getFontColor();

      // enforce opaque colors on all datasets
      if (config.data?.datasets) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        config.data.datasets.forEach((ds: any) => {
          if (ds.backgroundColor)
            ds.backgroundColor = stripAlpha(ds.backgroundColor);
          if (ds.borderColor) ds.borderColor = stripAlpha(ds.borderColor);
        });
      }

      config.options = {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 0 },
        ...(config.options || {}),
        plugins: {
          ...(config.options?.plugins || {}),
          legend: {
            ...(config.options?.plugins?.legend || {}),
            labels: {
              ...(config.options?.plugins?.legend?.labels || {}),
              color: fontColor,
            },
          },
          tooltip: {
            ...(config.options?.plugins?.tooltip || {}),
            titleColor: "#ffffff",
            bodyColor: "#ffffff",
            footerColor: "#ffffff",
          },
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scales: any = config.options.scales || {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Object.entries(scales).forEach(([key, axisOrArray]: any) => {
        console.log(key, axisOrArray);
        if (Array.isArray(axisOrArray)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          axisOrArray.forEach((axis: any) => {
            if (axis.ticks) axis.ticks.color = fontColor;
            if (axis.title) axis.title.color = fontColor;
            if (axis.scaleLabel) axis.scaleLabel.color = fontColor;
          });
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const axis = axisOrArray as any;
          if (axis.ticks) axis.ticks.color = fontColor;
          if (axis.title) axis.title.color = fontColor;
          if (axis.scaleLabel) axis.scaleLabel.color = fontColor;
        }
      });
      // ===========================

      if (chartRef.current) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        chartRef.current.config = config;
        chartRef.current.update();
      } else {
        chartRef.current = new Chart(canvasRef.current, config);
      }

      // watch for dark/light toggle
      const observer = new MutationObserver(() => {
        const newColor = getFontColor();
        const chart = chartRef.current!;
        chart.options.plugins!.legend!.labels!.color = newColor;

        // reapply to scales again
        Object.entries(chart.options.scales || {}).forEach(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ([key, axisOrArray]: any) => {
            console.log(key, axisOrArray);
            if (Array.isArray(axisOrArray)) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              axisOrArray.forEach((axis: any) => {
                if (axis.ticks) axis.ticks.color = newColor;
                if (axis.title) axis.title.color = newColor;
                if (axis.scaleLabel) axis.scaleLabel.color = newColor;
              });
            } else {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const axis = axisOrArray as any;
              if (axis.ticks) axis.ticks.color = newColor;
              if (axis.title) axis.title.color = newColor;
              if (axis.scaleLabel) axis.scaleLabel.color = newColor;
            }
          },
        );

        chart.update();
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
    }, [specString, getFontColor]);

    return (
      <div className="mb-4 w-full max-w-full">
        <canvas
          ref={canvasRef}
          className="block w-full"
          style={{ height: "300px" }}
        />
      </div>
    );
  },
  (prev, next) => JSON.stringify(prev.spec) === JSON.stringify(next.spec),
);

ChartBlock.displayName = "ChartBlock";

// ----------------------------------------------------------
// ReactMarkdown Custom Components
// ----------------------------------------------------------
const markdownComponents = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  text: ({ children, ...props }: any) => (
    <>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {children.map((child: any) =>
        typeof child === "string" ? child.replace(/\\_/g, "_") : child,
      )}
    </>
  ),
  // Headings
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  h1: ({ children, ...props }: any) => (
    <h1
      className="text-2xl font-bold my-4 border-b-2 border-gray-200 pb-2"
      {...props}
    >
      {children}
    </h1>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  h2: ({ children, ...props }: any) => (
    <h2
      className="text-xl font-bold my-3 border-b border-gray-200 pb-1"
      {...props}
    >
      {children}
    </h2>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  h3: ({ children, ...props }: any) => (
    <h3 className="text-lg font-bold my-3" {...props}>
      {children}
    </h3>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  h4: ({ children, ...props }: any) => (
    <h4 className="text-base font-bold my-2" {...props}>
      {children}
    </h4>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  h5: ({ children, ...props }: any) => (
    <h5 className="text-sm font-bold my-2" {...props}>
      {children}
    </h5>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  h6: ({ children, ...props }: any) => (
    <h6 className="text-xs font-bold my-2" {...props}>
      {children}
    </h6>
  ),
  // Paragraph
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  p: ({ children, ...props }: any) => (
    <p className="mb-3 leading-relaxed" {...props}>
      {children}
    </p>
  ),
  // Blockquote
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  blockquote: ({ children, ...props }: any) => (
    <blockquote
      className="border-l-4 border-gray-300 pl-4 italic text-gray-700 my-3"
      {...props}
    >
      {children}
    </blockquote>
  ),
  // Horizontal Rule
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hr: ({ ...props }: any) => (
    <hr className="border-t border-gray-300 my-3" {...props} />
  ),
  // Code Block & Inline Code
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  code: ({ inline, children, className, ...props }: any) => {
    const content = String(children).trim();

    // detect chart-spec code blocks
    if (!inline && /language-chart-spec/.test(className || "")) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let spec: any;
      try {
        // first, try strict JSON
        spec = JSON.parse(content);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (jsonErr) {
        // if it looks like there's a function in there, try JS eval
        if (/function\s*\(/.test(content)) {
          try {
            // eslint-disable-next-line no-eval
            spec = eval("(" + content + ")");
          } catch (evalErr) {
            console.error("Failed to eval chart-spec:", evalErr);
            spec = null;
          }
        }
      }

      if (spec) {
        return <ChartBlock spec={spec} />;
      } else {
        // fallback plain code
        return (
          <pre
            className="bg-gray-100 text-gray-800 p-2 rounded text-sm font-mono overflow-x-auto my-3"
            {...props}
          >
            <code>{children}</code>
          </pre>
        );
      }
    }

    // inline code
    if (inline) {
      return (
        <code
          className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-sm font-mono"
          {...props}
        >
          {children}
        </code>
      );
    }

    // other code blocks
    return (
      <pre
        className="bg-gray-100 text-gray-800 p-2 rounded text-sm font-mono overflow-x-auto my-3"
        {...props}
      >
        <code>{children}</code>
      </pre>
    );
  },
  // Table elements
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: ({ children, ...props }: any) => (
    <div className="overflow-x-auto my-3">
      <table
        className="min-w-full border-collapse border border-gray-300 text-sm"
        {...props}
      >
        {children}
      </table>
    </div>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  thead: ({ children, ...props }: any) => (
    <thead className="bg-background border-b border-gray-300" {...props}>
      {children}
    </thead>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tbody: ({ children, ...props }: any) => <tbody {...props}>{children}</tbody>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tr: ({ children, ...props }: any) => (
    <tr className="border-b last:border-0" {...props}>
      {children}
    </tr>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  th: ({ children, ...props }: any) => (
    <th
      className="border border-gray-300 px-3 py-2 font-semibold text-left"
      {...props}
    >
      {children}
    </th>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  td: ({ children, ...props }: any) => (
    <td className="border border-gray-300 px-3 py-2 align-top" {...props}>
      {children}
    </td>
  ),
  // Lists
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ul: ({ children, ...props }: any) => (
    <ul className="list-disc list-outside pl-4 my-3" {...props}>
      {children}
    </ul>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ol: ({ children, ...props }: any) => (
    <ol className="list-decimal list-outside pl-4 my-3 ml-2" {...props}>
      {children}
    </ol>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  li: ({ children, ...props }: any) => (
    <li className="my-1 marker:mr-2" {...props}>
      {children}
    </li>
  ),
  // Images
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  img: ({ src, alt, ...props }: any) => (
    <img className="max-w-full h-auto my-3" src={src} alt={alt} {...props} />
  ),
  // Emphasis and strong (bold)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  em: ({ children, ...props }: any) => (
    <em className="italic" {...props}>
      {children}
    </em>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  strong: ({ children, ...props }: any) => (
    <strong className="font-bold" {...props}>
      {children}
    </strong>
  ),
  // Strikethrough
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  del: ({ children, ...props }: any) => (
    <del className="line-through" {...props}>
      {children}
    </del>
  ),
  // Custom Link: render external links as chips and, for Zillow property links,
  // append an inline map icon that opens our map page for that specific ZPID.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  a: ({ children, href, ...props }: any) => {
    const isZillow =
      typeof href === "string" &&
      /https?:\/\/www\.zillow\.com\/homedetails\/(\d+)_zpid\//.test(href);

    let zpid: string | null = null;
    if (isZillow && typeof href === "string") {
      const m = href.match(/homedetails\/(\d+)_zpid/);
      if (m && m[1]) zpid = m[1];
    }

    return (
      <span className="inline-flex items-center gap-1 align-middle flex-wrap max-w-full">
        <a
          href={href}
          className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium hover:bg-blue-200 break-all"
          style={{ maxWidth: zpid ? "calc(100% - 2rem)" : "100%" }}
          target="_blank"
          rel="noopener noreferrer"
          {...props}
        >
          {children}
        </a>
        {zpid && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="h-7 w-7 ml-0.5 flex-shrink-0"
                aria-label="View this property on the map"
                title="View this property on the map"
              >
                <Link href={`/map?zpids=${encodeURIComponent(zpid)}`}>
                  <MapPin className="w-4 h-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>View on map</TooltipContent>
          </Tooltip>
        )}
      </span>
    );
  },
};

// ----------------------------------------------------------
// Chat Types and Local Storage Helper
// ----------------------------------------------------------
type ChatMessage = {
  role: "user" | "model";
  text: string;
  expertViews?: Record<string, string>;
};

const getInitialMessages = (): ChatMessage[] => {
  if (typeof window !== "undefined" && !Cookies.get("estatewise_token")) {
    const stored = localStorage.getItem("estateWiseChat");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    }
  }
  return [];
};

// ----------------------------------------------------------
// ClientOnly Component
// ----------------------------------------------------------
const ClientOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <>{children}</>;
};

// ----------------------------------------------------------
// Dark Mode Toggle Component
// ----------------------------------------------------------
const DarkModeToggle: React.FC = () => {
  // On initial load, read the saved preference (fallback to system or light)
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("dark-mode");
    if (saved !== null) return saved === "true";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
      localStorage.setItem("dark-mode", "true");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("dark-mode", "false");
    }
    const newThemeColor = darkMode ? "#262626" : "#faf9f2";
    const meta = document.querySelector("meta[name='theme-color']");
    if (meta) meta.setAttribute("content", newThemeColor);
  }, [darkMode]);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    toast.success(next ? "Dark mode activated" : "Light mode activated");
  };

  return (
    <button
      onClick={toggleDarkMode}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full p-0 cursor-pointer transition-none hover:text-primary"
      aria-label="Toggle Dark Mode"
      title="Toggle Dark Mode"
    >
      {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
};

// ----------------------------------------------------------
// Top Bar Component
// ----------------------------------------------------------
type TopBarProps = {
  onNewConvo: () => void;
  toggleSidebar: () => void;
  sidebarVisible: boolean;
};

const TopBar: React.FC<TopBarProps> = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onNewConvo,
  toggleSidebar,
  sidebarVisible,
}) => {
  const isAuthed = !!Cookies.get("estatewise_token");
  const username = localStorage.getItem("username") || "Guest";
  const [authMenuOpen, setAuthMenuOpen] = useState(false);

  const handleAuthIconClick = () => {
    setAuthMenuOpen((prev) => !prev);
  };

  return (
    <div className="sticky top-0 z-20 flex items-center justify-between p-4 border-b border-border bg-background shadow-md h-16 overflow-visible whitespace-nowrap">
      <div className="flex items-center gap-2">
        {!sidebarVisible && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleSidebar}
                className="p-2 cursor-pointer hover:bg-muted rounded duration-200"
                aria-label="Toggle Sidebar"
                title="Toggle Sidebar"
              >
                <Menu className="w-6 h-6" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Open sidebar</TooltipContent>
          </Tooltip>
        )}
        <span className="hidden md:inline text-xl font-bold select-none text-foreground">
          Hi {username}, welcome to EstateWise! 🏠
        </span>
      </div>
      <div className="flex items-center gap-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/charts"
              className="inline-flex h-8 w-8 items-center justify-center hover:text-primary transition-colors"
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
              href="/insights"
              className="inline-flex h-8 w-8 items-center justify-center hover:text-primary transition-colors"
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
              href="/map"
              className="inline-flex h-8 w-8 items-center justify-center hover:text-primary transition-colors"
              aria-label="Map"
            >
              <MapPin className="w-5 h-5" />
            </Link>
          </TooltipTrigger>
          <TooltipContent>Map</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/forums"
              className="inline-flex h-8 w-8 items-center justify-center hover:text-primary transition-colors"
              aria-label="Forums"
            >
              <Users className="w-5 h-5" />
            </Link>
          </TooltipTrigger>
          <TooltipContent>Forums</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <DarkModeToggle />
            </span>
          </TooltipTrigger>
          <TooltipContent>Toggle theme</TooltipContent>
        </Tooltip>
        {isAuthed ? (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex h-8 w-8 items-center justify-center hover:text-primary transition-colors cursor-pointer"
                  aria-label="New Conversation"
                  title="New Conversation"
                >
                  <PlusCircle className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>New conversation</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    document.cookie =
                      "estatewise_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                    toast.success("Logged out successfully");
                    window.location.reload();
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center hover:text-red-600 transition-colors cursor-pointer"
                  title="Log Out"
                  aria-label="Log Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Sign out</TooltipContent>
            </Tooltip>
          </>
        ) : (
          <>
            <div className="relative">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleAuthIconClick}
                    className="inline-flex h-8 w-8 items-center justify-center hover:text-primary transition-colors cursor-pointer"
                    aria-label="User Menu"
                    title="User Menu"
                  >
                    <UserIcon className="w-5 h-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Account</TooltipContent>
              </Tooltip>
              {authMenuOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-card rounded shadow-lg py-2 z-50">
                  <Link href="/login">
                    <div
                      className="px-4 py-2 hover:bg-muted cursor-pointer select-none"
                      onClick={() => setAuthMenuOpen(false)}
                      title="Log In"
                      aria-label="Log In"
                    >
                      Log In
                    </div>
                  </Link>
                  <Link href="/signup">
                    <div
                      className="px-4 py-2 hover:bg-muted cursor-pointer select-none"
                      onClick={() => setAuthMenuOpen(false)}
                      title="Sign Up"
                      aria-label="Sign Up"
                    >
                      Sign Up
                    </div>
                  </Link>
                </div>
              )}
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    localStorage.removeItem("estateWiseChat");
                    toast.success("Conversation deleted successfully");
                    window.location.reload();
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center hover:text-red-600 transition-colors cursor-pointer"
                  aria-label="Delete Conversation"
                  title="Delete Conversation"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Delete conversation</TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
    </div>
  );
};

// ----------------------------------------------------------
// Sidebar Component
// ----------------------------------------------------------
type SidebarProps = {
  conversationLoading: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  conversations: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSelect: (conv: any) => void;
  isAuthed: boolean;
  refreshConvos: () => void;
  sidebarVisible: boolean;
  toggleSidebar: () => void;
  selectedConvoId: string | null;
  namingInProgress: Set<string>;
  loadingConversations: Set<string>;
  isStreaming: boolean;
};

const Sidebar: React.FC<SidebarProps> = ({
  conversationLoading,
  conversations,
  onSelect,
  isAuthed,
  refreshConvos,
  sidebarVisible,
  toggleSidebar,
  selectedConvoId,
  namingInProgress,
  loadingConversations,
  isStreaming,
}) => {
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [query, setQuery] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [generatingName, setGeneratingName] = useState(false);

  /* -----------------------------------------------------------------
   * Highlighting + auto-scroll logic
   * ----------------------------------------------------------------- */
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const itemRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const prevConvoIdsRef = useRef<string[]>([]);

  useEffect(() => {
    // Detect newly‑added conversation ids
    const prevIds = prevConvoIdsRef.current;
    const currentIds = conversations.map((c) => c._id);
    const newIds = currentIds.filter((id) => !prevIds.includes(id));

    if (newIds.length > 0) {
      const newId = newIds[0];
      setHighlightId(newId);

      setTimeout(() => {
        const el = itemRefs.current[newId];
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);

      setTimeout(() => setHighlightId(null), 0);
    }

    // Update the ref for the next run
    prevConvoIdsRef.current = currentIds;
  }, [conversations]);

  useEffect(() => {
    const updateWidth = () => setIsMobile(window.innerWidth < 768);
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (value.trim() === "") {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let results: any[] = [];
        if (isAuthed) {
          const token = Cookies.get("estatewise_token");
          const res = await fetch(
            `${API_BASE_URL}/api/conversations/search?q=${value}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          if (res.ok) {
            results = await res.json();
          } else {
            toast.error("Conversation search failed");
          }
        } else {
          const local = localStorage.getItem("estateWiseConvos");
          if (local) {
            const convos = JSON.parse(local);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            results = convos.filter((conv: any) =>
              String(conv.title).toLowerCase().includes(value.toLowerCase()),
            );
          }
        }
        setSearchResults(results);
      } catch (error) {
        console.error("Search error:", error);
        toast.error("Error searching conversations");
      } finally {
        setSearchLoading(false);
      }
    }, 500);
  };

  const handleRename = async (convId: string) => {
    try {
      const token = Cookies.get("estatewise_token");
      const res = await fetch(`${API_BASE_URL}/api/conversations/${convId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: newTitle }),
      });
      if (res.ok) {
        toast.success("Conversation renamed");
        setRenamingId(null);
        setNewTitle("");
        refreshConvos();
      } else {
        toast.error("Failed to rename conversation");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error renaming conversation");
    }
  };

  const handleGenerateName = async (convId: string) => {
    try {
      setGeneratingName(true);
      const token = Cookies.get("estatewise_token");
      const res = await fetch(
        `${API_BASE_URL}/api/conversations/${convId}/generate-name`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (res.ok) {
        const data = await res.json();
        setNewTitle(data.suggestedName);
        toast.success("Name generated successfully!");
      } else {
        toast.error("Failed to generate name");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error generating name");
    } finally {
      setGeneratingName(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderRenameModal = (conv: any) => (
    <Dialog
      open={renamingId === conv._id}
      onOpenChange={(open) => {
        if (!open) {
          setRenamingId(null);
          setNewTitle("");
        }
      }}
    >
      <DialogContent className="[&>button]:hidden border bg-card text-card-foreground">
        <DialogClose asChild>
          <button
            aria-label="Close"
            title="Close"
            className="absolute top-3 right-3 text-card-foreground hover:opacity-80"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogClose>

        <DialogHeader>
          <DialogTitle className="text-card-foreground">
            Rename Conversation
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Enter a new name for your conversation or generate one with AI.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleRename(conv._id);
              }
            }}
            placeholder="Enter conversation name"
            autoFocus
            className="cursor-text bg-background text-foreground border-input"
          />
          <Button
            variant="outline"
            className="w-full cursor-pointer bg-background hover:bg-muted text-foreground border-input"
            onClick={() => handleGenerateName(conv._id)}
            disabled={generatingName}
          >
            {generatingName ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Generate Suggested Name
              </>
            )}
          </Button>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            className="cursor-pointer bg-background hover:bg-muted text-foreground border-input"
            onClick={() => {
              setRenamingId(null);
              setNewTitle("");
            }}
            aria-label="Cancel Rename"
            title="Cancel Rename"
          >
            Cancel
          </Button>
          <Button
            className="cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => handleRename(conv._id)}
            aria-label="Save Rename"
            title="Save Rename"
            disabled={!newTitle.trim()}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const token = Cookies.get("estatewise_token");
      const res = await fetch(`${API_BASE_URL}/api/conversations/${deleteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success("Conversation deleted");
        refreshConvos();
      } else {
        toast.error("Failed to delete conversation");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error deleting conversation");
    } finally {
      setDeleteId(null);
    }
  };

  /* ----------------------------------------------------------
   * Motion variants for conversation rows
   * ---------------------------------------------------------- */
  const rowVariants = {
    initial: { opacity: 0, x: -15 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.25 } },
  };

  /* ----------------------------------------------------------
   * Helper to render a single conversation row
   * ---------------------------------------------------------- */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ConversationRow = ({ conv }: { conv: any }) => {
    const isSelected = conv._id === selectedConvoId;
    const isNaming = namingInProgress.has(conv._id);
    const isLoading = loadingConversations.has(conv._id);
    const shouldBlink = isNaming;

    // Debug logging
    if (shouldBlink) {
      console.log(
        "[ConversationRow] Blinking active for:",
        conv._id,
        conv.title,
        { isNaming, isLoading },
      );
    }

    return (
      <>
        <motion.div
          key={conv._id}
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          ref={(el) => (itemRefs.current[conv._id] = el)}
          variants={rowVariants}
          initial={highlightId === conv._id ? "initial" : false}
          animate="animate"
          layout
          className={`flex items-center justify-between border-b border-sidebar-border p-2 shadow-sm transition-colors duration-500 m-2 rounded-md dark:rounded-bl-none dark:rounded-br-none
            ${isSelected ? "bg-muted dark:bg-primary/50" : "hover:bg-muted"}
            ${highlightId === conv._id ? "bg-primary/10 dark:bg-primary/20" : ""}
            ${isStreaming ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
          onClick={() => {
            if (isStreaming) {
              toast.error(
                "Please wait for the current response to complete before switching conversations",
              );
              return;
            }
            onSelect(conv);
            if (isMobile) toggleSidebar();
          }}
        >
          {/* Title container */}
          <div className="flex-1 min-w-0 select-none">
            <span
              className={`block truncate ${shouldBlink ? "animate-pulse-gentle" : ""}`}
            >
              {conv.title || "Untitled Conversation"}
            </span>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setRenamingId(conv._id);
                setNewTitle(conv.title);
              }}
              title="Rename"
              className="cursor-pointer hover:text-blue-500"
              aria-label="Rename Conversation"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeleteId(conv._id);
              }}
              title="Delete"
              className="cursor-pointer hover:text-red-500"
              aria-label="Delete Conversation"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
        {renderRenameModal(conv)}
      </>
    );
  };

  if (isMobile) {
    return (
      <>
        <AnimatePresence>
          {sidebarVisible && (
            <motion.aside
              className="bg-sidebar text-sidebar-foreground p-4 flex flex-col overflow-hidden h-screen shadow-lg shadow-[4px_0px_10px_rgba(0,0,0,0.1)] fixed inset-0 z-40"
              initial={{ opacity: 0.5, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold select-none">Conversations</h2>
                <div className="flex items-center gap-2">
                  {isAuthed && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setShowSearchModal(true)}
                          className="p-1 cursor-pointer hover:bg-muted rounded"
                          title="Search Conversations"
                          aria-label="Search Conversations"
                        >
                          <Search className="w-5 h-5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Search conversations</TooltipContent>
                    </Tooltip>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={toggleSidebar}
                        className="p-1 cursor-pointer hover:bg-muted rounded"
                        title="Close Sidebar"
                        aria-label="Close Sidebar"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Close sidebar</TooltipContent>
                  </Tooltip>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {conversationLoading ? (
                  <div className="min-h-full flex items-center justify-center">
                    <Loader2 className="animate-spin w-8 h-8" />
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="min-h-full flex flex-col items-center justify-center space-y-2">
                    {isAuthed ? (
                      <Inbox className="w-8 h-8 text-muted-foreground" />
                    ) : (
                      <LogIn className="w-8 h-8 text-muted-foreground" />
                    )}
                    <p className="text-center text-sm text-muted-foreground">
                      {isAuthed
                        ? "No conversations"
                        : "Log in to save conversations"}
                    </p>
                  </div>
                ) : (
                  <motion.div
                    layout
                    className="space-y-2"
                    initial={false}
                    animate={false}
                  >
                    {conversations.map((conv) => (
                      <ConversationRow key={conv._id} conv={conv} />
                    ))}
                  </motion.div>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
        {showSearchModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={() => setShowSearchModal(false)}
          >
            <motion.div
              className="bg-card p-6 rounded-lg shadow-xl w-96"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Search className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold">Search Conversations</h3>
                </div>
                <button
                  onClick={() => setShowSearchModal(false)}
                  className="text-primary font-bold cursor-pointer"
                  title="Close Search Modal"
                  aria-label="Close Search Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <Input
                placeholder="Enter search term..."
                value={query}
                onChange={handleSearchChange}
                className="mb-4 cursor-text"
              />
              <div className="max-h-60 overflow-y-auto space-y-2">
                {searchLoading ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="animate-spin w-5 h-5" />
                  </div>
                ) : query.trim() === "" ? null : searchResults.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground"></p>
                ) : (
                  searchResults.map((conv) => (
                    <div
                      key={conv._id}
                      className={`p-2 bg-muted rounded shadow-sm ${
                        isStreaming
                          ? "cursor-not-allowed opacity-60"
                          : "cursor-pointer hover:bg-muted-foreground"
                      }`}
                      onClick={() => {
                        if (isStreaming) {
                          toast.error(
                            "Please wait for the current response to complete before switching conversations",
                          );
                          return;
                        }
                        onSelect(conv);
                        setShowSearchModal(false);
                      }}
                    >
                      <p className="text-sm truncate text-foreground select-none">
                        {conv.title || "Untitled Conversation"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
        {deleteId && (
          <DeleteConfirmationDialog
            open={true}
            onConfirm={handleDelete}
            onCancel={() => setDeleteId(null)}
          />
        )}
      </>
    );
  }

  return (
    <div className="shadow-lg">
      <motion.aside
        className="bg-sidebar text-sidebar-foreground flex flex-col p-4 h-screen shadow-lg"
        variants={desktopSidebarVariants}
        animate={sidebarVisible ? "visible" : "hidden"}
        initial="visible"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold select-none">Conversations</h2>
          <div className="flex items-center gap-2">
            {isAuthed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setShowSearchModal(true)}
                    className="p-1 cursor-pointer hover:bg-muted rounded"
                    title="Search Conversations"
                    aria-label="Search Conversations"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Search conversations</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleSidebar}
                  className="p-1 cursor-pointer hover:bg-muted rounded"
                  title="Close Sidebar"
                  aria-label="Close Sidebar"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Close sidebar</TooltipContent>
            </Tooltip>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversationLoading ? (
            <div className="min-h-full flex items-center justify-center">
              <Loader2 className="animate-spin w-8 h-8" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="min-h-full flex flex-col items-center justify-center space-y-2">
              {isAuthed ? (
                // When logged in but no conversations, show an Inbox icon
                <Inbox className="w-8 h-8 text-muted-foreground" />
              ) : (
                // When not authenticated, show a LogIn icon
                <LogIn className="w-8 h-8 text-muted-foreground" />
              )}
              <p className="text-center text-sm text-muted-foreground">
                {isAuthed ? "No conversations" : "Log in to save conversations"}
              </p>
            </div>
          ) : (
            <motion.div
              layout
              className="space-y-2"
              initial={false}
              animate={false}
            >
              {conversations.map((conv) => (
                <ConversationRow key={conv._id} conv={conv} />
              ))}
            </motion.div>
          )}
        </div>
        <AnimatePresence>
          {showSearchModal && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSearchModal(false)}
            >
              <motion.div
                className="bg-card p-6 rounded-lg shadow-xl w-96"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Search className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-bold">Search Conversations</h3>
                  </div>
                  <button
                    onClick={() => setShowSearchModal(false)}
                    className="text-primary font-bold cursor-pointer"
                    title="Close Search Modal"
                    aria-label="Close Search Modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <Input
                  placeholder="Enter search term..."
                  value={query}
                  onChange={handleSearchChange}
                  className="mb-4 cursor-text"
                />
                <div className="max-h-60 overflow-y-auto space-y-2 p-1">
                  {searchLoading ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="animate-spin w-5 h-5" />
                    </div>
                  ) : query.trim() === "" ? null : searchResults.length ===
                    0 ? (
                    <p className="text-center text-sm text-muted-foreground"></p>
                  ) : (
                    searchResults.map((conv) => (
                      <div
                        key={conv._id}
                        className="p-2 bg-muted rounded cursor-pointer hover:bg-background shadow-sm hover:shadow-2xl"
                        onClick={() => {
                          onSelect(conv);
                          setShowSearchModal(false);
                        }}
                      >
                        <p className="text-sm truncate text-foreground select-none">
                          {conv.title || "Untitled Conversation"}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
          {deleteId && (
            <DeleteConfirmationDialog
              open={true}
              onConfirm={handleDelete}
              onCancel={() => setDeleteId(null)}
            />
          )}
        </AnimatePresence>
      </motion.aside>
    </div>
  );
};

// ----------------------------------------------------------
// Delete Confirmation Dialog using Shadcn Dialog Components
// ----------------------------------------------------------
const DeleteConfirmationDialog: React.FC<{
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ open, onConfirm, onCancel }) => {
  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="[&>button]:hidden border-none">
        <DialogClose asChild>
          <button
            aria-label="Close"
            title="Close"
            className="absolute top-3 right-3 text-foreground hover:opacity-80"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogClose>

        <DialogHeader>
          <DialogTitle>
            <span className="text-foreground">Confirm Delete</span>
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this conversation?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            className="cursor-pointer text-foreground"
            onClick={onCancel}
            aria-label="Cancel Delete"
            title="Cancel Delete"
          >
            Cancel
          </Button>
          <Button
            className="cursor-pointer"
            onClick={onConfirm}
            aria-label="Confirm Delete"
            title="Confirm Delete"
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

type ChatWindowProps = {
  isAuthed: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  localConvos: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setLocalConvos: (convos: any[]) => void;
  selectedConvoId: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSetSelectedConvo: (conv: any) => void;
  namingInProgress: Set<string>;
  setNamingInProgress: React.Dispatch<React.SetStateAction<Set<string>>>;
  loadingConversations: Set<string>;
  setLoadingConversations: React.Dispatch<React.SetStateAction<Set<string>>>;
};

const ChatWindow: React.FC<ChatWindowProps> = ({
  isAuthed,
  localConvos,
  setLocalConvos,
  selectedConvoId,
  onSetSelectedConvo,
  namingInProgress,
  setNamingInProgress,
  loadingConversations,
  setLoadingConversations,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(
    !Cookies.get("estatewise_token") ? getInitialMessages() : [],
  );
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [convLoading, setConvLoading] = useState(false);
  const latestMessageRef = useRef<HTMLDivElement>(null);
  const prevConvoId = useRef<string | null>(null);
  const shouldAutoScroll = useRef(true);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [inputHistory, setInputHistory] = useState<string[]>(() => {
    try {
      return JSON.parse(sessionStorage.getItem("inputHistory") || "[]");
    } catch {
      return [];
    }
  });
  const [historyIndex, setHistoryIndex] = useState(inputHistory.length);
  const [draftInput, setDraftInput] = useState("");

  useEffect(() => {
    sessionStorage.setItem("inputHistory", JSON.stringify(inputHistory));
  }, [inputHistory]);

  /* guest‑side adaptive weights */
  const [guestWeights, setGuestWeights] = useState<Record<string, number>>(
    () => {
      if (typeof window === "undefined") return {};
      try {
        const stored = JSON.parse(
          localStorage.getItem("estateWiseGuestWeights") || "{}",
        );
        const KEYS = [
          "Data Analyst",
          "Lifestyle Concierge",
          "Financial Advisor",
          "Neighborhood Expert",
          "Cluster Analyst",
        ];
        const ok =
          KEYS.every((k) => typeof stored[k] === "number") &&
          KEYS.filter((k) => k !== "Cluster Analyst").every(
            (k) => stored[k] >= 0.1,
          ) &&
          stored["Cluster Analyst"] === 1;
        return ok ? stored : {};
      } catch {
        return {};
      }
    },
  );

  /* per-message rating state */
  const [ratings, setRatings] = useState<Record<number, "up" | "down">>({});

  /* ------------------------------------------------------------------ */
  /* sync on conversation switch                                        */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (
      isAuthed &&
      selectedConvoId &&
      prevConvoId.current !== selectedConvoId
    ) {
      setConvLoading(true);
      const found = localConvos.find((c) => c._id === selectedConvoId);
      setMessages(found?.messages ?? []);
      prevConvoId.current = selectedConvoId;
      setRatings({}); // clear ratings when switching convo
      setTimeout(() => setConvLoading(false), 250);
    }
  }, [selectedConvoId, isAuthed, localConvos]);

  const loadingPhases = [
    { text: "Understanding Your Query", Icon: Search, spin: false },
    { text: "Processing Your Request", Icon: Settings, spin: true },
    { text: "Reasoning & Thinking", Icon: Cpu, spin: false },
    { text: "Generating a Response", Icon: Zap, spin: false },
  ];
  const [phaseIdx, setPhaseIdx] = useState(0);

  useEffect(() => {
    let active = true;
    if (loading) {
      const rotate = (idx: number) => {
        if (!active || idx >= loadingPhases.length - 1) return;
        const delay = 800 + Math.random() * 700;
        setTimeout(() => {
          if (!active) return;
          const next = idx + 1;
          setPhaseIdx(next);
          rotate(next);
        }, delay);
      };
      rotate(phaseIdx);
    } else {
      setPhaseIdx(0);
    }
    return () => {
      active = false;
    };
  }, [loading]);

  /* persist guest history */
  useEffect(() => {
    if (!Cookies.get("estatewise_token")) {
      localStorage.setItem("estateWiseChat", JSON.stringify(messages));
      const hasTimeoutNote = messages.some((m) => m.text?.includes("⚠️"));
      if (hasTimeoutNote) {
        console.log(
          "[Frontend-Guest] Saved messages with timeout note to localStorage",
        );
      }
    }
  }, [messages]);

  /* smarter autoscroll - only scroll if user is at bottom */
  useEffect(() => {
    if (!shouldAutoScroll.current) return;

    const scrollToBottom = () => {
      latestMessageRef.current?.scrollIntoView({
        behavior: "instant",
        block: "end",
      });
    };

    scrollToBottom();
  }, [messages]);

  /* track if user manually scrolled away from bottom */
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      shouldAutoScroll.current = isNearBottom;
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  /* ------------------------------------------------------------------ */
  /* helpers                                                            */
  /* ------------------------------------------------------------------ */

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createNewConversation = async (): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/api/conversations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Cookies.get("estatewise_token")}`,
      },
      body: JSON.stringify({ title: "New Conversation" }),
    });
    if (!res.ok) throw new Error("Failed to create conversation");
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    setLocalConvos((p) => [data, ...p]);
    onSetSelectedConvo(data);
    prevConvoId.current = data._id;
    return data;
  };

  /**
   * Send message to the API and update the chat history with streaming support.
   */
  const handleSend = async () => {
    if (!userInput.trim() || loading) return;
    setLoading(true);
    shouldAutoScroll.current = true; // Enable auto-scroll for new messages

    const text = userInput;
    setUserInput("");

    const isFirstMessage = messages.length === 0;

    // Add user message immediately
    setMessages((m) => [...m, { role: "user", text }]);

    // Track this conversation as loading immediately
    const currentConvoId = selectedConvoId || "pending";
    setLoadingConversations((prev) => {
      const next = new Set(prev);
      next.add(currentConvoId);
      console.log("[LoadingConvo] Added to loading set:", currentConvoId);
      return next;
    });
    setInputHistory((h) => {
      const next = [...h, text];
      setHistoryIndex(next.length);
      return next;
    });

    // Add placeholder for streaming AI response
    const streamingMessageIndex = messages.length + 1;
    setMessages((m) => [...m, { role: "model", text: "" }]);

    let retryCount = 0;
    const MAX_RETRIES = 3;
    let streamedText = "";
    let receivedExpertViews: Record<string, string> = {};
    let receivedWeights: any = null;
    let receivedConvoId: string | null = null;
    let hasTimedOut = false;

    const attemptStream = async (): Promise<boolean> => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body: any = { message: text };
        if (isAuthed) {
          if (!selectedConvoId) {
            const c = await createNewConversation();
            body.convoId = c._id;
            receivedConvoId = c._id;

            // Update loading conversations with actual ID
            setLoadingConversations((prev) => {
              const next = new Set(prev);
              next.delete("pending");
              next.add(c._id);
              console.log("[LoadingConvo] Updated to actual ID:", c._id);
              return next;
            });

            // Start name generation tracking immediately for first message
            if (isFirstMessage) {
              console.log("[AutoNaming] Starting tracking for", c._id);
              setNamingInProgress((prev) => {
                const next = new Set(prev);
                next.add(c._id);
                console.log("[AutoNaming] Added to set, size:", next.size);
                return next;
              });
            }
          } else {
            body.convoId = selectedConvoId;
          }
        } else {
          const MAX_PAYLOAD_SIZE = 102_400;
          const fullHistory = [...messages, { role: "user", text }];
          body.history = [...fullHistory];
          body.expertWeights = guestWeights;

          let serialized = JSON.stringify(body);
          while (
            serialized.length > MAX_PAYLOAD_SIZE &&
            body.history.length > 1
          ) {
            body.history.shift();
            serialized = JSON.stringify(body);
          }
        }

        const res = await fetch(`${API_BASE_URL}/api/chat?stream=true`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(isAuthed
              ? { Authorization: `Bearer ${Cookies.get("estatewise_token")}` }
              : {}),
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          throw new Error("Stream request failed");
        }

        const reader = res.body?.getReader();
        if (!reader) {
          throw new Error("No reader available");
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let currentEventType = "";

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim() || line.startsWith(":")) continue;

            if (line.startsWith("event: ")) {
              currentEventType = line.slice(7).trim();
              continue;
            }

            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              try {
                const parsed = JSON.parse(data);

                if (parsed.token) {
                  streamedText += parsed.token;

                  // Log if this is the timeout note
                  if (parsed.token.includes("⚠️")) {
                    console.log(
                      "[Frontend-Timeout] Received timeout note token. Total length:",
                      streamedText.length,
                    );
                  }

                  setMessages((m) => {
                    const updated = [...m];
                    updated[streamingMessageIndex] = {
                      role: "model",
                      text: streamedText,
                      expertViews: receivedExpertViews,
                    };
                    return updated;
                  });
                } else if (parsed.expertViews) {
                  receivedExpertViews = parsed.expertViews;
                  setMessages((m) => {
                    const updated = [...m];
                    updated[streamingMessageIndex] = {
                      role: "model",
                      text: streamedText,
                      expertViews: parsed.expertViews,
                    };
                    return updated;
                  });
                } else if (parsed.expertWeights) {
                  receivedWeights = parsed.expertWeights;
                } else if (parsed.convoId) {
                  receivedConvoId = parsed.convoId;

                  // Start polling IN PARALLEL as soon as we get convoId (don't await)
                  if (isAuthed && isFirstMessage && !hasTimedOut) {
                    console.log(
                      "[AutoNaming] Starting PARALLEL polling for",
                      receivedConvoId,
                    );
                    // Fire and forget - runs in background
                    (async () => {
                      const delays = [2000, 4000, 7000, 10000, 15000];
                      for (const delay of delays) {
                        await new Promise((resolve) =>
                          setTimeout(resolve, delay),
                        );
                        try {
                          console.log(`[AutoNaming] Polling at ${delay}ms`);
                          const pollRes = await fetch(
                            `${API_BASE_URL}/api/conversations`,
                            {
                              headers: {
                                Authorization: `Bearer ${Cookies.get("estatewise_token")}`,
                              },
                            },
                          );
                          if (pollRes.ok) {
                            const data = await pollRes.json();
                            setLocalConvos(data);
                            console.log(
                              "[AutoNaming] Conversations updated",
                              data,
                            );

                            // Check if title has been updated
                            const updatedConvo = data.find(
                              (c: any) => c._id === receivedConvoId,
                            );
                            if (
                              updatedConvo &&
                              updatedConvo.title !== "New Conversation"
                            ) {
                              console.log(
                                "[AutoNaming] Title updated to:",
                                updatedConvo.title,
                              );
                              setNamingInProgress((prev) => {
                                const next = new Set(prev);
                                next.delete(receivedConvoId);
                                console.log(
                                  "[AutoNaming] Removed from set, size:",
                                  next.size,
                                );
                                return next;
                              });
                              break;
                            }
                          }
                        } catch (err) {
                          console.error(
                            "Failed to poll for updated title:",
                            err,
                          );
                        }
                      }
                      // Always remove from naming set after all attempts
                      setNamingInProgress((prev) => {
                        const next = new Set(prev);
                        next.delete(receivedConvoId);
                        return next;
                      });
                    })();
                  }
                } else if (
                  currentEventType === "timeout" ||
                  (parsed.message && parsed.message.includes("timeout"))
                ) {
                  // Handle timeout event
                  hasTimedOut = true;
                  console.log(
                    "[Frontend-Timeout] Timeout event received. StreamedText length:",
                    streamedText.length,
                    "Contains timeout note:",
                    streamedText.includes("⚠️"),
                  );

                  // If timeout note is not already in the streamed text, add it
                  if (!streamedText.includes("⚠️")) {
                    const timeoutNote =
                      "\n\n---\n\n⚠️ **Note:** This response was cut off due to cloud infrastructure timeout limits (60 seconds). The partial response has been saved. Please try rephrasing or breaking down your request into smaller parts.";
                    streamedText += timeoutNote;
                    console.log(
                      "[Frontend-Timeout] Manually appended timeout note. New length:",
                      streamedText.length,
                    );

                    // Update the message with the timeout note
                    setMessages((m) => {
                      const updated = [...m];
                      updated[streamingMessageIndex] = {
                        role: "model",
                        text: streamedText,
                        expertViews: receivedExpertViews,
                      };
                      return updated;
                    });
                  }

                  toast.error(
                    "Response timed out due to cloud infrastructure limits",
                    { duration: 5000 },
                  );
                } else if (
                  currentEventType === "done" ||
                  parsed.timedOut !== undefined
                ) {
                  // Handle done event - ensure timeout note is preserved
                  if (parsed.timedOut && !streamedText.includes("⚠️")) {
                    const timeoutNote =
                      "\n\n---\n\n⚠️ **Note:** This response was cut off due to cloud infrastructure timeout limits (60 seconds). The partial response has been saved. Please try rephrasing or breaking down your request into smaller parts.";
                    streamedText += timeoutNote;
                    console.log(
                      "[Frontend-Done] Appended timeout note on done event. Length:",
                      streamedText.length,
                    );

                    // Update the message with the timeout note
                    setMessages((m) => {
                      const updated = [...m];
                      updated[streamingMessageIndex] = {
                        role: "model",
                        text: streamedText,
                        expertViews: receivedExpertViews,
                      };
                      return updated;
                    });
                  }
                  console.log(
                    "[Frontend-Done] Done event received. TimedOut:",
                    parsed.timedOut,
                    "Final text length:",
                    streamedText.length,
                  );
                } else if (parsed.error) {
                  throw new Error(parsed.error);
                }
                // Reset event type after processing
                currentEventType = "";
              } catch (e: any) {
                console.error("Error parsing SSE data:", e);
                if (
                  e?.message &&
                  e.message !== "Unexpected end of JSON input"
                ) {
                  throw e;
                }
              }
            }
          }
        }

        // Update guest weights if applicable
        if (!isAuthed && receivedWeights) {
          setGuestWeights(receivedWeights);
          localStorage.setItem(
            "estateWiseGuestWeights",
            JSON.stringify(receivedWeights),
          );
        }

        // Refresh conversations if needed
        if (isAuthed && receivedConvoId) {
          const r = await fetch(`${API_BASE_URL}/api/conversations`, {
            headers: {
              Authorization: `Bearer ${Cookies.get("estatewise_token")}`,
            },
          });
          if (r.ok) setLocalConvos(await r.json());
        }

        return true;
      } catch (error: any) {
        console.error(`Stream attempt ${retryCount + 1} failed:`, error);

        // Check if it's a rate limit or specific API error
        const errorMsg = error?.message || "";
        const isRateLimit =
          errorMsg.includes("rate limit") || errorMsg.includes("Rate limit");
        const isApiError =
          errorMsg.includes("Google AI") ||
          errorMsg.includes("property database");

        if (isRateLimit || isApiError) {
          // Don't retry for rate limit or specific API errors
          toast.error(errorMsg);
          return false;
        }

        if (retryCount < MAX_RETRIES - 1) {
          retryCount++;
          toast.error(
            `Connection lost. Retrying (${retryCount}/${MAX_RETRIES})...`,
          );
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * retryCount),
          );
          return attemptStream();
        }

        return false;
      }
    };

    try {
      const success = await attemptStream();

      if (!success) {
        // Error message already shown in attemptStream
        // Remove the empty streaming message on failure
        setMessages((m) => m.slice(0, -1));
      }
    } catch (error: any) {
      console.error("Error sending message:", error);
      const errorMsg =
        error?.message || "Error processing your message. Please try again.";
      toast.error(errorMsg);
      // Remove the empty streaming message on error
      setMessages((m) => m.slice(0, -1));
    } finally {
      setLoading(false);
      // Remove from loading conversations
      setLoadingConversations((prev) => {
        const next = new Set(prev);
        next.delete(currentConvoId);
        if (receivedConvoId) next.delete(receivedConvoId);
        next.delete("pending");
        console.log("[LoadingConvo] Removed from loading set");
        return next;
      });

      // Stop pulsing animation when streaming completes
      // The background polling will continue to update the title if needed
      if (receivedConvoId || currentConvoId) {
        // Small delay to let the polling finish if it's about to complete
        setTimeout(() => {
          setNamingInProgress((prev) => {
            const next = new Set(prev);
            if (receivedConvoId) next.delete(receivedConvoId);
            if (currentConvoId !== "pending") next.delete(currentConvoId);
            console.log(
              "[AutoNaming] Stopped pulsing animation, size:",
              next.size,
            );
            return next;
          });
        }, 1000);
      }
    }
  };

  /**
   * Rate a specific model message.
   */
  const rateConversation = async (vote: "up" | "down", idx: number) => {
    // persists ratings
    const newRatings = { ...ratings, [idx]: vote };
    setRatings(newRatings);

    // if no expertViews, just toast and return
    const msg = messages[idx];
    if (!msg.expertViews) {
      toast.success(
        vote === "up"
          ? "Thanks for the feedback!"
          : "Got it – we'll try to improve!",
      );
      return;
    }

    // otherwise call the API
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = { rating: vote };
    if (!isAuthed) payload.expertWeights = guestWeights;
    else if (selectedConvoId) payload.convoId = selectedConvoId;

    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/rate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(isAuthed
            ? { Authorization: `Bearer ${Cookies.get("estatewise_token")}` }
            : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const j = await res.json();
      if (!isAuthed && j.expertWeights) {
        setGuestWeights(j.expertWeights);
        localStorage.setItem(
          "estateWiseGuestWeights",
          JSON.stringify(j.expertWeights),
        );
      }
      toast.success(
        vote === "up"
          ? "Thanks for the feedback!"
          : "Got it – we'll try to improve!",
      );
    } catch {
      toast.error("Could not record feedback");
    }
  };

  /* ------------------------------------------------------------
   * message bubble
   * ---------------------------------------------------------- */
  const latestModelIndex = [...messages]
    .reverse()
    .findIndex((m) => m.role === "model");

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const actualLatestModelIndex =
    latestModelIndex === -1 ? -1 : messages.length - 1 - latestModelIndex;

  const lastIdx = messages.length - 1;

  const MessageBubble: React.FC<{
    msg: ChatMessage;
    idx: number;
    isLast: boolean;
  }> = ({ msg, idx, isLast }) => {
    const [view, setView] = useState<string>("Combined");
    const [pickerOpen, setPickerOpen] = useState<boolean>(false);
    const pickerRef = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState(false);

    // scroll the dropdown into view when opened
    useEffect(() => {
      if (pickerOpen && pickerRef.current) {
        pickerRef.current.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    }, [pickerOpen]);

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(displayedText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Clipboard write failed", err);
      }
    };

    const displayedText =
      view === "Combined" || !msg.expertViews
        ? msg.text
        : msg.expertViews[view];

    const text =
      view === "Combined" || !msg.expertViews
        ? msg.text
        : msg.expertViews[view];

    const zpidsFromText = useMemo(() => {
      const re = /https?:\/\/www\.zillow\.com\/homedetails\/(\d+)_zpid\//g;
      const out: string[] = [];
      let m: RegExpExecArray | null;
      const src = (displayedText || "").toString();
      while ((m = re.exec(src)) !== null) {
        const z = m[1];
        if (z && !out.includes(z)) out.push(z);
      }
      return out;
    }, [displayedText]);

    const upColor =
      ratings[idx] === "up" ? "text-green-600" : "hover:text-green-600";
    const downColor =
      ratings[idx] === "down" ? "text-red-600" : "hover:text-red-600";

    // Determine if this is actively streaming (last message, is model, and loading)
    const isStreaming = isLast && msg.role === "model" && loading && !msg.text;

    return (
      <motion.div
        ref={isLast ? latestMessageRef : undefined}
        variants={bubbleVariants}
        animate="visible"
        exit={{ opacity: 0, y: -10 }}
        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} mb-2`}
      >
        <div
          className={`rounded-lg p-2 pb-0 shadow-lg hover:shadow-xl transition-shadow duration-300 ${
            msg.role === "user"
              ? "bg-primary text-primary-foreground"
              : "bg-muted"
          } max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg`}
        >
          {isStreaming ? (
            <div className="flex items-center gap-2 p-2 animate-pulse">
              {(() => {
                const { Icon, spin } = loadingPhases[phaseIdx];
                return spin ? (
                  <Icon className="w-5 h-5 animate-spin" />
                ) : (
                  <Icon className="w-5 h-5" />
                );
              })()}
              <span className="font-medium">
                {loadingPhases[phaseIdx].text}
                <AnimatedDots resetKey={phaseIdx} />
              </span>
            </div>
          ) : (
            <>
              <ReactMarkdown
                remarkPlugins={[
                  remarkGfm,
                  [remarkMath, { singleDollarTextMath: false }],
                ]}
                rehypePlugins={[rehypeKatex]}
                components={markdownComponents}
              >
                {text.replace(/\\_/g, "_")}
              </ReactMarkdown>
            </>
          )}
          {msg.role === "model" && (
            <div className="flex items-center justify-between mt-2 mb-1">
              {/* left cluster: map-all + dropdown */}
              <div className="flex items-center gap-2">
                {zpidsFromText.length > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="rounded-full shadow-sm"
                        aria-label={`View ${zpidsFromText.length} properties on map`}
                        title="View all on map"
                      >
                        <Link
                          href={`/map?zpids=${encodeURIComponent(zpidsFromText.join(","))}`}
                        >
                          <MapPin className="w-4 h-4" />
                          <span className="ml-1">
                            Map {zpidsFromText.length}
                          </span>
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>View all on map</TooltipContent>
                  </Tooltip>
                )}
                <div className="relative text-xs">
                  {msg.expertViews ? (
                    <>
                      <button
                        onClick={() => setPickerOpen((o) => !o)}
                        className="flex items-center gap-1 px-2 py-1 border border-border rounded-md bg-muted hover:bg-muted/50 cursor-pointer"
                        title="Select Expert View"
                        aria-label="Select Expert View"
                      >
                        {view === "Combined" ? "Combined (Default)" : view}{" "}
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      <AnimatePresence>
                        {pickerOpen && (
                          <motion.div
                            ref={pickerRef}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute left-0 mt-1 min-w-max bg-card border border-border divide-y divide-border rounded-md shadow-md z-50"
                          >
                            {["Combined", ...Object.keys(msg.expertViews)].map(
                              (opt) => (
                                <div
                                  key={opt}
                                  onClick={() => {
                                    setView(opt);
                                    setPickerOpen(false);
                                  }}
                                  className={`px-3 py-2 cursor-pointer whitespace-nowrap ${
                                    view === opt
                                      ? "bg-primary/10 text-foreground"
                                      : "hover:bg-muted"
                                  }`}
                                >
                                  {opt === "Combined"
                                    ? "Combined (Default)"
                                    : opt}
                                </div>
                              ),
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  ) : (
                    <div className="px-2 py-1 border border-border rounded-md bg-muted text-foreground">
                      Combined (Default)
                    </div>
                  )}
                </div>
              </div>

              {/* thumbs btns */}
              <div className="flex gap-1">
                <button
                  onClick={handleCopy}
                  className="p-1 cursor-pointer hover:text-primary"
                  title="Copy message"
                  aria-label="Copy message"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => rateConversation("up", idx)}
                  className={`p-1 cursor-pointer ${upColor}`}
                  title="Like the response? Click to let us know!"
                  aria-label="Thumbs up"
                >
                  <ThumbsUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => rateConversation("down", idx)}
                  className={`p-1 cursor-pointer ${downColor}`}
                  title="Not satisfied? Click to let us know!"
                  aria-label="Thumbs down"
                >
                  <ThumbsDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <motion.div
        ref={messagesContainerRef}
        className="relative overflow-y-auto space-y-2 p-4"
        style={{ height: "calc(100vh - 64px - 80px)" }}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {convLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="animate-spin w-10 h-10" />
          </div>
        )}

        {messages.length === 0 && !loading && !convLoading && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Home className="w-20 h-20 mb-4 text-primary" />
            <p className="text-xl text-center font-semibold">
              Hey {localStorage.getItem("username") || "there"} 👋 Send a
              message to start your home finding journey! 🚀
            </p>
          </div>
        )}

        <AnimatePresence>
          {!convLoading &&
            messages.map((m, i) => (
              <MessageBubble key={i} msg={m} idx={i} isLast={i === lastIdx} />
            ))}
        </AnimatePresence>

        {loading && messages.length === 0 && (
          <motion.div
            variants={bubbleVariants}
            initial="hidden"
            animate="visible"
            className="flex justify-start mb-2"
          >
            <div className="bg-muted p-2 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
              {(() => {
                const { Icon } = loadingPhases[phaseIdx];
                return <Icon className="w-5 h-5" />;
              })()}
              <span className="font-medium">
                {loadingPhases[phaseIdx].text}
                <AnimatedDots resetKey={phaseIdx} />
              </span>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* input */}
      <div className="flex flex-col flex-shrink-0 h-20 p-4">
        <div className="flex gap-2">
          <Input
            placeholder="Type your message…"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp") {
                e.preventDefault();
                // if this is the very first up, stash the current draft
                if (historyIndex === inputHistory.length) {
                  setDraftInput(userInput);
                }
                if (historyIndex > 0) {
                  const prevIdx = historyIndex - 1;
                  setUserInput(inputHistory[prevIdx]);
                  setHistoryIndex(prevIdx);
                }
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                if (historyIndex < inputHistory.length) {
                  const nextIdx = historyIndex + 1;
                  setHistoryIndex(nextIdx);
                  // if we've moved back past the last history entry, restore draft
                  if (nextIdx === inputHistory.length) {
                    setUserInput(draftInput);
                  } else {
                    setUserInput(inputHistory[nextIdx]);
                  }
                }
              } else if (e.key === "Enter") {
                e.preventDefault();
                handleSend();
              }
            }}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={loading}
            className="flex gap-1 cursor-pointer"
            title="Send message"
          >
            <Send className="h-4 w-4" /> Send
          </Button>
        </div>
        <p className="text-center text-xs mt-1">
          By using this app, you agree to our{" "}
          <Link href="/terms" className="underline hover:text-primary">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-primary">
            Privacy Policy
          </Link>
          .
          <BotMessageSquare className="inline-block w-4 h-4 ml-0.5 hover:text-primary" />
        </p>
      </div>
    </div>
  );
};

// ----------------------------------------------------------
// AnimatedDots Component
// ----------------------------------------------------------
const AnimatedDots: React.FC<{ resetKey: number }> = ({ resetKey }) => {
  const [dots, setDots] = useState("");
  useEffect(() => {
    // restart dots when resetKey changes
    setDots("");
    const interval = setInterval(() => {
      setDots((prev) => (prev.length < 3 ? prev + "." : ""));
    }, 500);
    return () => clearInterval(interval);
  }, [resetKey]);
  return <span>{dots}</span>;
};

// ----------------------------------------------------------
// Main ChatPage Layout: Sidebar + Top Bar + ChatWindow
// ----------------------------------------------------------
export default function ChatPage() {
  const isAuthed = !!Cookies.get("estatewise_token");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [conversations, setConversations] = useState<any[]>([]);
  const [conversationLoading, setConversationLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedConvo, setSelectedConvo] = useState<any>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [namingInProgress, setNamingInProgress] = useState<Set<string>>(
    new Set(),
  );
  const [loadingConversations, setLoadingConversations] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    const saved = localStorage.getItem("sidebarVisible");
    if (saved !== null) {
      setSidebarVisible(saved === "true");
    } else {
      const defaultVisible = window.innerWidth >= 768;
      setSidebarVisible(defaultVisible);
      localStorage.setItem("sidebarVisible", defaultVisible.toString());
    }
  }, []);

  const toggleSidebar = () => {
    setSidebarVisible((prev) => {
      const newState = !prev;
      localStorage.setItem("sidebarVisible", newState.toString());
      return newState;
    });
  };

  const refreshConvos = async () => {
    setConversationLoading(true);

    try {
      if (isAuthed) {
        const token = Cookies.get("estatewise_token");
        const res = await fetch(`${API_BASE_URL}/api/conversations`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setConversations(data);
        } else {
          toast.error("Failed to load conversations");
        }
      } else {
        const local = localStorage.getItem("estateWiseConvos");
        if (local) setConversations(JSON.parse(local));
      }
    } catch (err) {
      console.error("Error fetching conversations:", err);
      toast.error("Error fetching conversations");
    } finally {
      setConversationLoading(false);
    }
  };

  useEffect(() => {
    refreshConvos();
  }, [isAuthed]);

  return (
    <>
      <Head>
        <title>EstateWise | Chat</title>
        <meta
          name="description"
          content="Chat with EstateWise for personalized property recommendations"
        />
      </Head>
      <ClientOnly>
        <div className="min-h-screen flex dark:bg-background dark:text-foreground relative">
          <style jsx global>{`
            html {
              scroll-behavior: smooth;
            }

            html,
            body {
              overscroll-behavior: none;
            }

            @keyframes pulse-gentle {
              0%,
              100% {
                opacity: 1;
              }
              50% {
                opacity: 0.6;
              }
            }

            .animate-pulse-gentle {
              animation: pulse-gentle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
            }
          `}</style>
          {/* Desktop sidebar and content container */}
          <div className="flex flex-1">
            {/* Sidebar (desktop only) */}
            <div className="hidden md:block">
              <motion.div
                className="overflow-hidden"
                variants={desktopSidebarVariants}
                animate={sidebarVisible ? "visible" : "hidden"}
                initial="visible"
              >
                <Sidebar
                  conversationLoading={conversationLoading}
                  conversations={conversations}
                  onSelect={(conv) => setSelectedConvo(conv)}
                  isAuthed={isAuthed}
                  refreshConvos={refreshConvos}
                  sidebarVisible={true}
                  toggleSidebar={toggleSidebar}
                  selectedConvoId={selectedConvo ? selectedConvo._id : null}
                  namingInProgress={namingInProgress}
                  loadingConversations={loadingConversations}
                  isStreaming={loadingConversations.size > 0}
                />
              </motion.div>
            </div>
            {/* Main content */}
            <div className="flex-1 flex flex-col duration-600 ease-in-out">
              <TopBar
                onNewConvo={() => {
                  setSelectedConvo(null);
                  if (!isAuthed) localStorage.removeItem("estateWiseChat");
                }}
                toggleSidebar={toggleSidebar}
                sidebarVisible={sidebarVisible}
              />
              <ChatWindow
                isAuthed={isAuthed}
                localConvos={conversations}
                setLocalConvos={setConversations}
                selectedConvoId={selectedConvo ? selectedConvo._id : null}
                onSetSelectedConvo={setSelectedConvo}
                namingInProgress={namingInProgress}
                setNamingInProgress={setNamingInProgress}
                loadingConversations={loadingConversations}
                setLoadingConversations={setLoadingConversations}
              />
            </div>
          </div>
          <div className="md:hidden">
            <Sidebar
              conversationLoading={conversationLoading}
              conversations={conversations}
              onSelect={(conv) => setSelectedConvo(conv)}
              isAuthed={isAuthed}
              refreshConvos={refreshConvos}
              sidebarVisible={sidebarVisible}
              toggleSidebar={toggleSidebar}
              selectedConvoId={selectedConvo ? selectedConvo._id : null}
              namingInProgress={namingInProgress}
              loadingConversations={loadingConversations}
              isStreaming={loadingConversations.size > 0}
            />
          </div>
        </div>
      </ClientOnly>
    </>
  );
}
