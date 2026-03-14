"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  BarChart3,
  Bell,
  BellOff,
  Bookmark,
  Calculator,
  CheckCheck,
  GitBranch,
  Loader2,
  MapPin,
  MessageCircleMore,
  Settings,
  TrendingDown,
  User as UserIcon,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DarkModeToggle } from "@/components/dark-mode-toggle";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type AppNotification,
  type AlertType,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const TYPE_ICON: Record<AlertType, React.ReactNode> = {
  new_match: <Bell className="w-4 h-4 text-primary" />,
  price_drop: <TrendingDown className="w-4 h-4 text-green-500" />,
  status_change: <BellOff className="w-4 h-4 text-amber-500" />,
};

const TYPE_LABEL: Record<AlertType, string> = {
  new_match: "New Match",
  price_drop: "Price Drop",
  status_change: "Status Change",
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" } },
};

/** Groups notifications by date (today / yesterday / earlier). */
function groupByDate(
  notifications: AppNotification[],
): [string, AppNotification[]][] {
  const now = new Date();
  const todayStr = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  const groups: Record<string, AppNotification[]> = {};
  for (const n of notifications) {
    const d = new Date(n.createdAt);
    const ds = d.toDateString();
    let label: string;
    if (ds === todayStr) label = "Today";
    else if (ds === yesterdayStr) label = "Yesterday";
    else label = d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  }
  return Object.entries(groups);
}

export default function NotificationsPage() {
  const router = useRouter();
  const token = useMemo(
    () => Cookies.get("estatewise_token") || Cookies.get("token") || "",
    [],
  );
  const isAuthed = Boolean(token);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [authMenuOpen, setAuthMenuOpen] = useState(false);
  const [navMenuOpen, setNavMenuOpen] = useState(false);

  const navLinks = [
    { href: "/chat", label: "Chat", Icon: MessageCircleMore },
    { href: "/charts", label: "Charts", Icon: BarChart3 },
    { href: "/insights", label: "Insights", Icon: GitBranch },
    { href: "/analyzer", label: "Deal Analyzer", Icon: Calculator },
    { href: "/forums", label: "Forums", Icon: Users },
    { href: "/map", label: "Map", Icon: MapPin },
  ];

  const fetchNotifications = useCallback(async () => {
    if (!isAuthed) return;
    setLoading(true);
    try {
      const data = await getNotifications(token, unreadOnly);
      setNotifications(data);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load notifications",
      );
    } finally {
      setLoading(false);
    }
  }, [isAuthed, token, unreadOnly]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    setAuthMenuOpen(false);
    setNavMenuOpen(false);
  }, [router.asPath]);

  const handleMarkRead = async (id: string) => {
    try {
      const updated = await markNotificationRead(id, token);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? updated : n)),
      );
    } catch {
      toast.error("Failed to mark notification as read");
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await markAllNotificationsRead(token);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success("All notifications marked as read.");
    } catch {
      toast.error("Failed to mark all as read");
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const grouped = groupByDate(notifications);

  return (
    <>
      <Head>
        <title>Notifications | EstateWise</title>
        <meta
          name="description"
          content="Your EstateWise saved-search alerts and property notifications."
        />
      </Head>

      <div className="min-h-screen bg-background text-foreground">
        {/* ── Nav ── */}
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/60">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-foreground min-w-0">
                <Bell className="w-6 h-6 text-primary" />
                <h1 className="text-xl font-bold truncate">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center text-xs bg-primary text-primary-foreground rounded-full w-5 h-5 leading-none">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </h1>
              </div>

              <div className="flex items-center gap-3 text-foreground">
                <div className="hidden min-[1065px]:flex items-center gap-4">
                  {navLinks.map(({ href, label, Icon }) => (
                    <Tooltip key={href}>
                      <TooltipTrigger asChild>
                        <Link
                          href={href}
                          className="inline-flex h-8 w-8 items-center justify-center text-foreground hover:text-primary transition-colors"
                          aria-label={label}
                        >
                          <Icon className="w-5 h-5" />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>{label}</TooltipContent>
                    </Tooltip>
                  ))}
                </div>

                {/* Mobile nav toggle */}
                <div className="min-[1065px]:hidden relative">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="inline-flex h-8 w-8 items-center justify-center text-foreground hover:text-primary transition-colors cursor-pointer"
                        aria-label="Open navigation menu"
                        onClick={() => {
                          setAuthMenuOpen(false);
                          setNavMenuOpen((prev) => !prev);
                        }}
                      >
                        <Settings className="w-5 h-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Menu</TooltipContent>
                  </Tooltip>
                  {navMenuOpen && (
                    <div className="absolute right-0 mt-2 w-44 bg-card rounded shadow-lg py-2 z-50">
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

                {/* Saved searches link */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href="/saved-searches"
                      className="inline-flex h-8 w-8 items-center justify-center text-foreground hover:text-primary transition-colors"
                      aria-label="Saved Searches"
                    >
                      <Bookmark className="w-5 h-5" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>Saved Searches</TooltipContent>
                </Tooltip>

                {/* Auth menu */}
                <div className="relative">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          setNavMenuOpen(false);
                          setAuthMenuOpen((prev) => !prev);
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center hover:text-primary transition-colors cursor-pointer"
                        aria-label="User Menu"
                      >
                        <UserIcon className="w-5 h-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Account</TooltipContent>
                  </Tooltip>
                  {authMenuOpen && (
                    <div className="absolute right-0 mt-2 w-40 bg-card rounded shadow-lg py-2 z-50">
                      {isAuthed ? (
                        <div
                          className="px-4 py-2 hover:bg-muted cursor-pointer select-none text-red-600"
                          onClick={() => {
                            setAuthMenuOpen(false);
                            Cookies.remove("estatewise_token");
                            Cookies.remove("token");
                            toast.success("Logged out successfully");
                            window.location.href = "/";
                          }}
                        >
                          Log Out
                        </div>
                      ) : (
                        <>
                          <Link href="/login">
                            <div
                              className="px-4 py-2 hover:bg-muted cursor-pointer select-none"
                              onClick={() => setAuthMenuOpen(false)}
                            >
                              Log In
                            </div>
                          </Link>
                          <Link href="/signup">
                            <div
                              className="px-4 py-2 hover:bg-muted cursor-pointer select-none"
                              onClick={() => setAuthMenuOpen(false)}
                            >
                              Sign Up
                            </div>
                          </Link>
                        </>
                      )}
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
              </div>
            </div>
          </div>
        </header>

        {/* ── Main content ── */}
        <main className="container mx-auto px-4 py-8 max-w-3xl">
          {!isAuthed ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Bell className="w-12 h-12 text-muted-foreground" />
              <p className="text-muted-foreground text-center">
                Please{" "}
                <Link href="/login" className="underline text-primary">
                  log in
                </Link>{" "}
                to view your notifications.
              </p>
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Button
                    variant={unreadOnly ? "default" : "outline"}
                    size="sm"
                    onClick={() => setUnreadOnly((p) => !p)}
                  >
                    {unreadOnly ? "Showing unread" : "Show all"}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleMarkAllRead}
                      disabled={markingAll}
                      className="flex items-center gap-1"
                    >
                      {markingAll ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <CheckCheck className="w-3 h-3" />
                      )}
                      Mark all read
                    </Button>
                  )}
                  <Link href="/saved-searches">
                    <Button variant="outline" size="sm">
                      Manage searches
                    </Button>
                  </Link>
                </div>
              </div>

              <Separator className="mb-6" />

              {loading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                  <Bell className="w-10 h-10 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {unreadOnly
                      ? "No unread notifications."
                      : "No notifications yet. Save searches on the Map or in Saved Searches to get alerts."}
                  </p>
                </div>
              ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="space-y-6"
                >
                  <AnimatePresence>
                    {grouped.map(([label, items]) => (
                      <div key={label}>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                          {label}
                        </p>
                        <div className="space-y-2">
                          {items.map((n) => (
                            <motion.div
                              key={n._id}
                              variants={itemVariants}
                              layout
                            >
                              <Card
                                className={cn(
                                  "transition-colors",
                                  !n.isRead &&
                                    "border-primary/40 bg-primary/5 dark:bg-primary/10",
                                )}
                              >
                                <CardContent className="py-3 px-4">
                                  <div className="flex items-start gap-3">
                                    <div className="mt-0.5 shrink-0">
                                      {TYPE_ICON[n.type]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs font-semibold text-muted-foreground">
                                          {TYPE_LABEL[n.type]}
                                        </span>
                                        {!n.isRead && (
                                          <span className="inline-block w-2 h-2 rounded-full bg-primary" />
                                        )}
                                        <span className="text-xs text-muted-foreground ml-auto">
                                          {new Date(
                                            n.createdAt,
                                          ).toLocaleTimeString([], {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}
                                        </span>
                                      </div>
                                      <p className="font-medium text-sm mt-0.5">
                                        {n.title}
                                      </p>
                                      <p className="text-sm text-muted-foreground mt-0.5">
                                        {n.body}
                                      </p>
                                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                                        {n.metadata?.mapUrl && (
                                          <Link
                                            href={
                                              n.metadata.mapUrl as string
                                            }
                                            className="text-xs text-primary hover:underline"
                                          >
                                            View on map →
                                          </Link>
                                        )}
                                        {!n.isRead && (
                                          <button
                                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                            onClick={() =>
                                              handleMarkRead(n._id)
                                            }
                                          >
                                            Mark as read
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}
