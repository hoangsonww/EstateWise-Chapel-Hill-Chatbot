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
  Bookmark,
  Calculator,
  GitBranch,
  Loader2,
  MapPin,
  MessageCircleMore,
  Plus,
  Settings,
  Trash2,
  User as UserIcon,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DarkModeToggle } from "@/components/dark-mode-toggle";
import {
  createSavedSearch,
  getSavedSearches,
  deleteSavedSearch,
  updateSavedSearch,
  type SavedSearch,
  type AlertFrequency,
  type AlertType,
} from "@/lib/api";

const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  new_match: "New Matches",
  price_drop: "Price Drop",
  status_change: "Status Change",
};

const FREQ_LABELS: Record<AlertFrequency, string> = {
  hourly: "Hourly",
  daily: "Daily",
  custom: "Custom",
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

type FormState = {
  name: string;
  query: string;
  frequency: AlertFrequency;
  alertTypes: AlertType[];
  priceDropPercent: string;
  priceDropAmount: string;
};

const defaultForm: FormState = {
  name: "",
  query: "",
  frequency: "daily",
  alertTypes: ["new_match"],
  priceDropPercent: "",
  priceDropAmount: "",
};

export default function SavedSearchesPage() {
  const router = useRouter();
  const token = useMemo(
    () => Cookies.get("estatewise_token") || Cookies.get("token") || "",
    [],
  );
  const isAuthed = Boolean(token);

  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(false);
  const [authMenuOpen, setAuthMenuOpen] = useState(false);
  const [navMenuOpen, setNavMenuOpen] = useState(false);

  // Create / Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSearch, setEditingSearch] = useState<SavedSearch | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const navLinks = [
    { href: "/chat", label: "Chat", Icon: MessageCircleMore },
    { href: "/charts", label: "Charts", Icon: BarChart3 },
    { href: "/insights", label: "Insights", Icon: GitBranch },
    { href: "/analyzer", label: "Deal Analyzer", Icon: Calculator },
    { href: "/forums", label: "Forums", Icon: Users },
    { href: "/map", label: "Map", Icon: MapPin },
  ];

  const fetchSearches = useCallback(async () => {
    if (!isAuthed) return;
    setLoading(true);
    try {
      const data = await getSavedSearches(token);
      setSearches(data);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load saved searches",
      );
    } finally {
      setLoading(false);
    }
  }, [isAuthed, token]);

  useEffect(() => {
    fetchSearches();
  }, [fetchSearches]);

  useEffect(() => {
    setAuthMenuOpen(false);
    setNavMenuOpen(false);
  }, [router.asPath]);

  // Pre-fill form when editing
  useEffect(() => {
    if (editingSearch) {
      setForm({
        name: editingSearch.name,
        query: editingSearch.query,
        frequency: editingSearch.frequency,
        alertTypes: editingSearch.alertTypes,
        priceDropPercent: editingSearch.priceDropPercent?.toString() ?? "",
        priceDropAmount: editingSearch.priceDropAmount?.toString() ?? "",
      });
    } else {
      // Pre-fill query from URL param when opening for creation
      const q = router.query.q as string | undefined;
      setForm({ ...defaultForm, query: q ?? "" });
    }
  }, [editingSearch, router.query.q]);

  const toggleAlertType = (type: AlertType) => {
    setForm((prev) => {
      const has = prev.alertTypes.includes(type);
      const next = has
        ? prev.alertTypes.filter((t) => t !== type)
        : [...prev.alertTypes, type];
      return { ...prev, alertTypes: next.length > 0 ? next : [type] };
    });
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.query.trim()) {
      toast.error("Name and query are required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        query: form.query.trim(),
        frequency: form.frequency,
        alertTypes: form.alertTypes,
        ...(form.priceDropPercent
          ? { priceDropPercent: Number(form.priceDropPercent) }
          : {}),
        ...(form.priceDropAmount
          ? { priceDropAmount: Number(form.priceDropAmount) }
          : {}),
      };

      if (editingSearch) {
        await updateSavedSearch(editingSearch._id, payload, token);
        toast.success("Saved search updated.");
      } else {
        await createSavedSearch(payload, token);
        toast.success("Saved search created.");
      }
      setDialogOpen(false);
      setEditingSearch(null);
      await fetchSearches();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save search",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSavedSearch(id, token);
      setSearches((prev) => prev.filter((s) => s._id !== id));
      toast.success("Saved search deleted.");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete saved search",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleString() : "Never";

  return (
    <>
      <Head>
        <title>Saved Searches | EstateWise</title>
        <meta
          name="description"
          content="Manage your saved property searches and alert preferences."
        />
      </Head>

      <div className="min-h-screen bg-background text-foreground">
        {/* ── Nav ── */}
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/60">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-foreground min-w-0">
                <Bookmark className="w-6 h-6 text-primary" />
                <h1 className="text-xl font-bold truncate">Saved Searches</h1>
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

                {/* Bell / Notifications link */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href="/notifications"
                      className="inline-flex h-8 w-8 items-center justify-center text-foreground hover:text-primary transition-colors"
                      aria-label="Notification Center"
                    >
                      <Bell className="w-5 h-5" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>Notifications</TooltipContent>
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
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          {!isAuthed ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Bookmark className="w-12 h-12 text-muted-foreground" />
              <p className="text-muted-foreground text-center">
                Please{" "}
                <Link href="/login" className="underline text-primary">
                  log in
                </Link>{" "}
                to manage your saved searches.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-semibold">Your Saved Searches</h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    Up to 20 searches. The alert job re-runs them on your chosen
                    schedule and notifies you of new matches, price drops, and
                    status changes.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setEditingSearch(null);
                    setDialogOpen(true);
                  }}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  New search
                </Button>
              </div>

              <Separator className="mb-6" />

              {loading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : searches.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                  <Bookmark className="w-10 h-10 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No saved searches yet. Click &ldquo;New search&rdquo; or
                    use the{" "}
                    <Link href="/map" className="underline text-primary">
                      Map
                    </Link>{" "}
                    page to save a search.
                  </p>
                </div>
              ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="grid gap-4"
                >
                  <AnimatePresence>
                    {searches.map((s) => (
                      <motion.div
                        key={s._id}
                        variants={itemVariants}
                        layout
                        exit={{ opacity: 0, y: -8 }}
                      >
                        <Card>
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between gap-2">
                              <CardTitle className="text-base leading-snug">
                                {s.name}
                              </CardTitle>
                              <div className="flex items-center gap-2 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingSearch(s);
                                    setDialogOpen(true);
                                  }}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => setDeletingId(s._id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="text-sm text-muted-foreground space-y-1">
                            <p>
                              <span className="font-medium text-foreground">
                                Query:
                              </span>{" "}
                              {s.query}
                            </p>
                            <p>
                              <span className="font-medium text-foreground">
                                Frequency:
                              </span>{" "}
                              {FREQ_LABELS[s.frequency]}
                            </p>
                            <p>
                              <span className="font-medium text-foreground">
                                Alerts:
                              </span>{" "}
                              {s.alertTypes
                                .map((t) => ALERT_TYPE_LABELS[t])
                                .join(", ")}
                            </p>
                            {s.priceDropPercent != null && (
                              <p>
                                <span className="font-medium text-foreground">
                                  Price drop threshold:
                                </span>{" "}
                                {s.priceDropPercent}%
                              </p>
                            )}
                            {s.priceDropAmount != null && (
                              <p>
                                <span className="font-medium text-foreground">
                                  Price drop amount:
                                </span>{" "}
                                ${s.priceDropAmount.toLocaleString()}
                              </p>
                            )}
                            <p>
                              <span className="font-medium text-foreground">
                                Last run:
                              </span>{" "}
                              {formatDate(s.lastRunAt)}
                            </p>
                            <div className="pt-1">
                              <Link
                                href={
                                  s.lastResultIds.length > 0
                                    ? `/map?zpids=${s.lastResultIds.join(",")}`
                                    : `/map?q=${encodeURIComponent(s.query)}`
                                }
                                className="text-primary hover:underline text-xs"
                              >
                                View results on map →
                              </Link>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ── Create / Edit Dialog ── */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingSearch(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSearch ? "Edit saved search" : "Save a new search"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="ss-name">Name</Label>
              <Input
                id="ss-name"
                placeholder="e.g. 2BR under 500k Chapel Hill"
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="ss-query">Search query</Label>
              <Input
                id="ss-query"
                placeholder="e.g. 2 bedroom Chapel Hill under 500000"
                value={form.query}
                onChange={(e) =>
                  setForm((p) => ({ ...p, query: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1">
              <Label>Frequency</Label>
              <Select
                value={form.frequency}
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    frequency: v as AlertFrequency,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Alert types</Label>
              <div className="flex flex-wrap gap-2 pt-1">
                {(
                  ["new_match", "price_drop", "status_change"] as AlertType[]
                ).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleAlertType(t)}
                    className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                      form.alertTypes.includes(t)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {ALERT_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            {form.alertTypes.includes("price_drop") && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="ss-pct">Drop % threshold</Label>
                  <Input
                    id="ss-pct"
                    type="number"
                    min={0}
                    max={100}
                    placeholder="5"
                    value={form.priceDropPercent}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        priceDropPercent: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ss-amt">Drop $ threshold</Label>
                  <Input
                    id="ss-amt"
                    type="number"
                    min={0}
                    placeholder="10000"
                    value={form.priceDropAmount}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        priceDropAmount: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                setEditingSearch(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingSearch ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ── */}
      <Dialog
        open={Boolean(deletingId)}
        onOpenChange={(open) => !open && setDeletingId(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete saved search?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete this saved search and stop future
            alerts. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingId && handleDelete(deletingId)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
