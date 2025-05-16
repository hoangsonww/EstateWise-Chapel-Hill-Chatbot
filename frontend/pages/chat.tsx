"use client";

import React, { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

const API_BASE_URL = "https://api.homesluxera.com";

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
      return "#aea287"; // Set the primary color
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
  // Custom Link
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  a: ({ children, href, ...props }: any) => (
    <a
      href={href}
      className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium hover:bg-blue-200 max-w-full break-words"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
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
  if (typeof window !== "undefined" && !Cookies.get("Luxera_token")) {
    const stored = localStorage.getItem("luxeraChat");
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
      className="p-1 cursor-pointer transition-none hover:text-primary"
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
  const isAuthed = !!Cookies.get("Luxera_token");
  const username = localStorage.getItem("username") || "Guest";
  const [authMenuOpen, setAuthMenuOpen] = useState(false);

  const handleAuthIconClick = () => {
    setAuthMenuOpen((prev) => !prev);
  };

  return (
    <div className="sticky top-0 z-20 flex items-center justify-between p-4 border-b border-border bg-background shadow-md h-16">
      <div className="flex items-center gap-2">
        {!sidebarVisible && (
          <button
            onClick={toggleSidebar}
            className="p-2 cursor-pointer hover:bg-muted rounded duration-200"
            aria-label="Toggle Sidebar"
            title="Toggle Sidebar"
          >
            <Menu className="w-6 h-6" />
          </button>
        )}
        <span className="hidden md:inline text-xl font-bold select-none text-foreground">
          Hi {username}, welcome to Luxera Ai! 🏠
        </span>
      </div>
      <div className="flex items-center gap-4 relative">
        <Link href="/charts" legacyBehavior>
          <a
            className="flex items-center gap-1 hover:text-primary"
            title="Charts"
          >
            <BarChart3 className="w-5 h-5" />
          </a>
        </Link>
        <DarkModeToggle />
        {isAuthed ? (
          <>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="flex items-center gap-1 transition-none cursor-pointer"
              title="New Conversation"
            >
              <PlusCircle className="w-5 h-5" />
              New Conversation
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                document.cookie =
                  "Luxera_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                toast.success("Logged out successfully");
                window.location.reload();
              }}
              className="flex items-center gap-1 transition-none text-red-500 hover:bg-red-500/10 cursor-pointer"
              title="Log Out"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={handleAuthIconClick}
                className="p-1 cursor-pointer hover:text-primary"
                aria-label="User Menu"
                title="User Menu"
              >
                <UserIcon className="w-5 h-5" />
              </button>
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
            <Button
              onClick={() => {
                localStorage.removeItem("luxeraChat");
                toast.success("Conversation deleted successfully");
                window.location.reload();
              }}
              variant="outline"
              className="flex items-center gap-1 transition-none text-red-500 hover:bg-red-500/10 cursor-pointer ml-2"
              title="Delete Conversation"
              aria-label="Delete Conversation"
            >
              <Trash2 className="w-5 h-5" />
              Delete
            </Button>
          </div>
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
          const token = Cookies.get("Luxera_token");
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
          const local = localStorage.getItem("LuxeraConvos");
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
      const token = Cookies.get("Luxera_token");
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderRenameButtons = (conv: any) => (
    <div className="flex items-center gap-2">
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleRename(conv._id);
        }}
        title="Save"
        className="cursor-pointer hover:text-green-500"
      >
        <Check className="w-4 h-4" />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setRenamingId(null);
          setNewTitle("");
        }}
        title="Cancel"
        className="cursor-pointer hover:text-red-500"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const token = Cookies.get("Luxera_token");
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

    return (
      <motion.div
        key={conv._id}
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        ref={(el) => (itemRefs.current[conv._id] = el)}
        variants={rowVariants}
        initial={highlightId === conv._id ? "initial" : false}
        animate="animate"
        layout
        className={`flex items-center justify-between border-b border-sidebar-border p-2 cursor-pointer shadow-sm transition-colors duration-500 m-2 rounded-md dark:rounded-bl-none dark:rounded-br-none
          ${isSelected ? "bg-muted dark:bg-primary/50" : "hover:bg-muted"}
          ${highlightId === conv._id ? "bg-primary/10 dark:bg-primary/20" : ""}`}
        onClick={() => {
          onSelect(conv);
          if (isMobile) toggleSidebar();
        }}
      >
        {/* Title container */}
        <div className="flex-1 min-w-0 select-none">
          {renamingId === conv._id ? (
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleRename(conv._id);
                }
              }}
              autoFocus
              className="cursor-text"
            />
          ) : (
            <span className="block truncate">
              {conv.title || "Untitled Conversation"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {renamingId === conv._id ? (
            renderRenameButtons(conv)
          ) : (
            <>
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
            </>
          )}
        </div>
      </motion.div>
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
                    <button
                      onClick={() => setShowSearchModal(true)}
                      className="p-1 cursor-pointer hover:bg-muted rounded"
                      title="Search Conversations"
                      aria-label="Search Conversations"
                    >
                      <Search className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={toggleSidebar}
                    className="p-1 cursor-pointer hover:bg-muted rounded"
                    title="Close Sidebar"
                    aria-label="Close Sidebar"
                  >
                    <X className="w-5 h-5" />
                  </button>
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
                      className="p-2 bg-muted rounded cursor-pointer hover:bg-muted-foreground shadow-sm"
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
              <button
                onClick={() => setShowSearchModal(true)}
                className="p-1 cursor-pointer hover:bg-muted rounded"
                title="Search Conversations"
                aria-label="Search Conversations"
              >
                <Search className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={toggleSidebar}
              className="p-1 cursor-pointer hover:bg-muted rounded"
              title="Close Sidebar"
              aria-label="Close Sidebar"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
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
};

const ChatWindow: React.FC<ChatWindowProps> = ({
  isAuthed,
  localConvos,
  setLocalConvos,
  selectedConvoId,
  onSetSelectedConvo,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(
    !Cookies.get("Luxera_token") ? getInitialMessages() : [],
  );
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [convLoading, setConvLoading] = useState(false);
  const latestMessageRef = useRef<HTMLDivElement>(null);
  const prevConvoId = useRef<string | null>(null);
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
          localStorage.getItem("LuxeraGuestWeights") || "{}",
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

  /* persist guest history + autoscroll */
  useEffect(() => {
    if (!Cookies.get("Luxera_token")) {
      localStorage.setItem("luxeraChat", JSON.stringify(messages));
    }
    latestMessageRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ------------------------------------------------------------------ */
  /* helpers                                                            */
  /* ------------------------------------------------------------------ */

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createNewConversation = async (): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/api/conversations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Cookies.get("Luxera_token")}`,
      },
      body: JSON.stringify({ title: "Untitled Conversation" }),
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
   * Send message to the API and update the chat history.
   */
  const handleSend = async () => {
    if (!userInput.trim() || loading) return;
    setLoading(true);

    try {
      const text = userInput;
      setUserInput("");
      setMessages((m) => [...m, { role: "user", text }]);
      setInputHistory((h) => {
        const next = [...h, text];
        setHistoryIndex(next.length);
        return next;
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body: any = { message: text };
      if (isAuthed) {
        if (!selectedConvoId) {
          const c = await createNewConversation();
          body.convoId = c._id;
        } else body.convoId = selectedConvoId;
      } else {
        // We're facing issues where the guest's conversation gets too long
        // This overloads the backend (Vercel limits the payload size), so
        // perhaps we only want to send as much as we can to the backend
        const MAX_PAYLOAD_SIZE = 102_400;
        // start with the full history
        const fullHistory = [...messages, { role: "user", text }];
        body.history = [...fullHistory];
        body.expertWeights = guestWeights;

        // now ensure JSON.stringify(body) is under limit
        let serialized = JSON.stringify(body);
        while (
          serialized.length > MAX_PAYLOAD_SIZE &&
          body.history.length > 1
        ) {
          // drop the oldest message
          body.history.shift();
          serialized = JSON.stringify(body);
        }
      }

      const res = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(isAuthed
            ? { Authorization: `Bearer ${Cookies.get("Luxera_token")}` }
            : {}),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error");

      const data = await res.json();

      setMessages((m) => [
        ...m,
        { role: "model", text: data.response, expertViews: data.expertViews },
      ]);

      if (!isAuthed && data.expertWeights) {
        setGuestWeights(data.expertWeights);
        localStorage.setItem(
          "LuxeraGuestWeights",
          JSON.stringify(data.expertWeights),
        );
      }

      if (isAuthed && body.convoId && !selectedConvoId) {
        const r = await fetch(`${API_BASE_URL}/api/conversations`, {
          headers: {
            Authorization: `Bearer ${Cookies.get("Luxera_token")}`,
          },
        });
        if (r.ok) setLocalConvos(await r.json());
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error(
        "Error processing your message - our AI model is overloaded. Please try again later.",
      );
    } finally {
      setLoading(false);
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
            ? { Authorization: `Bearer ${Cookies.get("Luxera_token")}` }
            : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const j = await res.json();
      if (!isAuthed && j.expertWeights) {
        setGuestWeights(j.expertWeights);
        localStorage.setItem(
          "LuxeraGuestWeights",
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

    const upColor =
      ratings[idx] === "up" ? "text-green-600" : "hover:text-green-600";
    const downColor =
      ratings[idx] === "down" ? "text-red-600" : "hover:text-red-600";

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
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={markdownComponents}
          >
            {text.replace(/\\_/g, "_")}
          </ReactMarkdown>

          {msg.role === "model" && (
            <div className="flex items-center justify-between mt-1 mb-1">
              {/* dropdown */}
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

        {loading && (
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
  const isAuthed = !!Cookies.get("Luxera_token");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [conversations, setConversations] = useState<any[]>([]);
  const [conversationLoading, setConversationLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedConvo, setSelectedConvo] = useState<any>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);

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
        const token = Cookies.get("Luxera_token");
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
        const local = localStorage.getItem("LuxeraConvos");
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
        <title>Luxera Ai | Chat</title>
        <meta
          name="description"
          content="Chat with Luxera Ai for personalized property recommendations"
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
                />
              </motion.div>
            </div>
            {/* Main content */}
            <div className="flex-1 flex flex-col duration-600 ease-in-out">
              <TopBar
                onNewConvo={() => {
                  setSelectedConvo(null);
                  if (!isAuthed) localStorage.removeItem("luxeraChat");
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
            />
          </div>
        </div>
      </ClientOnly>
    </>
  );
}
