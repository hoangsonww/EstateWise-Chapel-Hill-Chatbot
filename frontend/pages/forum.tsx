"use client";

import React, { useState, useEffect, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import Cookies from "js-cookie";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Loader2,
  Send,
  Trash2,
  Search,
  Sun,
  Moon,
  User as UserIcon,
  PlusCircle,
  Pencil,
  X,
  Menu,
  ChevronLeft,
  LogOut,
  BarChart3,
  MapPin,
  GitBranch,
  Inbox,
  LogIn,
  Check,
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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const API_BASE_URL = "https://estatewise-backend.vercel.app";

const desktopSidebarVariants = {
  visible: { width: "18rem", transition: { duration: 0.6, ease: "easeInOut" } },
  hidden: { width: "0rem", transition: { duration: 0.6, ease: "easeInOut" } },
};

const ClientOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <>{children}</>;
};

const DarkModeToggle: React.FC = () => {
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

type TopBarProps = {
  onNewConvo: () => void;
  toggleSidebar: () => void;
  sidebarVisible: boolean;
};

const TopBar: React.FC<TopBarProps> = ({
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
              href="/forum"
              className="inline-flex h-8 w-8 items-center justify-center hover:text-primary transition-colors"
              aria-label="Forum"
            >
              <Users className="w-5 h-5" />
            </Link>
          </TooltipTrigger>
          <TooltipContent>Forum</TooltipContent>
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

type SidebarProps = {
  conversationLoading: boolean;
  conversations: any[];
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
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const itemRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const prevConvoIdsRef = useRef<string[]>([]);

  useEffect(() => {
    const prevIds = prevConvoIdsRef.current;
    const currentIds = conversations.map((c) => c._id);
    const newIds = currentIds.filter((id) => !prevIds.includes(id));
    if (newIds.length > 0) {
      const newId = newIds[0];
      setHighlightId(newId);
      setTimeout(() => {
        itemRefs.current[newId]?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      setTimeout(() => setHighlightId(null), 0);
    }
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
        let results: any[] = [];
        if (isAuthed) {
          const token = Cookies.get("estatewise_token");
          const res = await fetch(`${API_BASE_URL}/api/conversations/search?q=${value}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) results = await res.json();
          else toast.error("Conversation search failed");
        } else {
          const local = localStorage.getItem("estateWiseConvos");
          if (local) {
            const convos = JSON.parse(local);
            results = convos.filter((conv: any) =>
              String(conv.title).toLowerCase().includes(value.toLowerCase())
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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

  const renderRenameButtons = (conv: any) => (
    <div className="flex items-center gap-2">
      <button onClick={(e) => { e.stopPropagation(); handleRename(conv._id); }} title="Save" className="cursor-pointer hover:text-green-500">
        <Check className="w-4 h-4" />
      </button>
      <button onClick={(e) => { e.stopPropagation(); setRenamingId(null); setNewTitle(""); }} title="Cancel" className="cursor-pointer hover:text-red-500">
        <X className="w-4 h-4" />
      </button>
    </div>
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

  const rowVariants = {
    initial: { opacity: 0, x: -15 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.25 } },
  };

  const ConversationRow = ({ conv }: { conv: any }) => {
    const isSelected = conv._id === selectedConvoId;
    return (
      <motion.div
        key={conv._id}
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
            <span className="block truncate">{conv.title || "Untitled Conversation"}</span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {renamingId === conv._id ? (
            renderRenameButtons(conv)
          ) : (
            <>
              <button onClick={(e) => { e.stopPropagation(); setRenamingId(conv._id); setNewTitle(conv.title); }} title="Rename" className="cursor-pointer hover:text-blue-500" aria-label="Rename Conversation">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setDeleteId(conv._id); }} title="Delete" className="cursor-pointer hover:text-red-500" aria-label="Delete Conversation">
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </motion.div>
    );
  };

  // Mobile and Desktop rendering logic remains the same
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
                        <button onClick={() => setShowSearchModal(true)} className="p-1 cursor-pointer hover:bg-muted rounded" title="Search Conversations" aria-label="Search Conversations">
                          <Search className="w-5 h-5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Search conversations</TooltipContent>
                    </Tooltip>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button onClick={toggleSidebar} className="p-1 cursor-pointer hover:bg-muted rounded" title="Close Sidebar" aria-label="Close Sidebar">
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
                    {isAuthed ? <Inbox className="w-8 h-8 text-muted-foreground" /> : <LogIn className="w-8 h-8 text-muted-foreground" />}
                    <p className="text-center text-sm text-muted-foreground">{isAuthed ? "No conversations" : "Log in to save conversations"}</p>
                  </div>
                ) : (
                  <motion.div layout className="space-y-2" initial={false} animate={false}>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowSearchModal(false)}>
            <motion.div className="bg-card p-6 rounded-lg shadow-xl w-96" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Search className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold">Search Conversations</h3>
                </div>
                <button onClick={() => setShowSearchModal(false)} className="text-primary font-bold cursor-pointer" title="Close Search Modal" aria-label="Close Search Modal"><X className="w-5 h-5" /></button>
              </div>
              <Input placeholder="Enter search term..." value={query} onChange={handleSearchChange} className="mb-4 cursor-text" />
              <div className="max-h-60 overflow-y-auto space-y-2">
                {searchLoading ? <div className="flex items-center justify-center"><Loader2 className="animate-spin w-5 h-5" /></div> : query.trim() === "" ? null : searchResults.length === 0 ? <p className="text-center text-sm text-muted-foreground"></p> : searchResults.map((conv) => (
                  <div key={conv._id} className="p-2 bg-muted rounded cursor-pointer hover:bg-muted-foreground shadow-sm" onClick={() => { onSelect(conv); setShowSearchModal(false); }}>
                    <p className="text-sm truncate text-foreground select-none">{conv.title || "Untitled Conversation"}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
        {deleteId && <DeleteConfirmationDialog open={true} onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />}
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
                  <button onClick={() => setShowSearchModal(true)} className="p-1 cursor-pointer hover:bg-muted rounded" title="Search Conversations" aria-label="Search Conversations">
                    <Search className="w-5 h-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Search conversations</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={toggleSidebar} className="p-1 cursor-pointer hover:bg-muted rounded" title="Close Sidebar" aria-label="Close Sidebar">
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
              {isAuthed ? <Inbox className="w-8 h-8 text-muted-foreground" /> : <LogIn className="w-8 h-8 text-muted-foreground" />}
              <p className="text-center text-sm text-muted-foreground">{isAuthed ? "No conversations" : "Log in to save conversations"}</p>
            </div>
          ) : (
            <motion.div layout className="space-y-2" initial={false} animate={false}>
              {conversations.map((conv) => (
                <ConversationRow key={conv._id} conv={conv} />
              ))}
            </motion.div>
          )}
        </div>
        <AnimatePresence>
          {showSearchModal && (
            <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSearchModal(false)}>
              <motion.div className="bg-card p-6 rounded-lg shadow-xl w-96" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Search className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-bold">Search Conversations</h3>
                  </div>
                  <button onClick={() => setShowSearchModal(false)} className="text-primary font-bold cursor-pointer" title="Close Search Modal" aria-label="Close Search Modal"><X className="w-5 h-5" /></button>
                </div>
                <Input placeholder="Enter search term..." value={query} onChange={handleSearchChange} className="mb-4 cursor-text" />
                <div className="max-h-60 overflow-y-auto space-y-2 p-1">
                  {searchLoading ? <div className="flex items-center justify-center"><Loader2 className="animate-spin w-5 h-5" /></div> : query.trim() === "" ? null : searchResults.length === 0 ? <p className="text-center text-sm text-muted-foreground"></p> : searchResults.map((conv) => (
                    <div key={conv._id} className="p-2 bg-muted rounded cursor-pointer hover:bg-background shadow-sm hover:shadow-2xl" onClick={() => { onSelect(conv); setShowSearchModal(false); }}>
                      <p className="text-sm truncate text-foreground select-none">{conv.title || "Untitled Conversation"}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
          {deleteId && <DeleteConfirmationDialog open={true} onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />}
        </AnimatePresence>
      </motion.aside>
    </div>
  );
};

const DeleteConfirmationDialog: React.FC<{
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ open, onConfirm, onCancel }) => {
  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="[&>button]:hidden border-none">
        <DialogClose asChild><button aria-label="Close" title="Close" className="absolute top-3 right-3 text-foreground hover:opacity-80"><X className="h-4 w-4" /></button></DialogClose>
        <DialogHeader>
          <DialogTitle><span className="text-foreground">Confirm Delete</span></DialogTitle>
          <DialogDescription>Are you sure you want to delete this conversation?</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" className="cursor-pointer text-foreground" onClick={onCancel} aria-label="Cancel Delete" title="Cancel Delete">Cancel</Button>
          <Button className="cursor-pointer" onClick={onConfirm} aria-label="Confirm Delete" title="Confirm Delete">Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

type Post = {
  _id: string;
  title: string;
  content: string;
  author: { username: string };
  createdAt: string;
};

const ForumWindow: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const isAuthed = !!Cookies.get("estatewise_token");

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/forum/posts`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      } else {
        toast.error("Failed to fetch posts");
      }
    } catch (error) {
      toast.error("Error fetching posts");
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("Title and content are required");
      return;
    }

    setLoading(true);
    try {
      const token = Cookies.get("estatewise_token");
      const res = await fetch(`${API_BASE_URL}/api/forum/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, content }),
      });
      if (res.ok) {
        toast.success("Post created successfully");
        setTitle("");
        setContent("");
        fetchPosts();
      } else {
        toast.error("Failed to create post");
      }
    } catch (error) {
      toast.error("Error creating post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="overflow-y-auto p-4" style={{ height: "calc(100vh - 64px)" }}>
      <div className="container mx-auto">
        <h1 className="text-4xl font-bold mb-4">Community Forum</h1>
        {isAuthed && (
          <Card className="mb-4">
            <CardHeader><CardTitle>Create a New Post</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleCreatePost}>
                <div className="mb-4">
                  <Input placeholder="Post Title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={loading} />
                </div>
                <div className="mb-4">
                  <Textarea placeholder="Post Content" value={content} onChange={(e) => setContent(e.target.value)} disabled={loading} />
                </div>
                <Button type="submit" disabled={loading}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {loading ? "Creating..." : "Create Post"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post._id}>
              <CardHeader>
                <CardTitle>
                  <Link href={`/forum/${post._id}`} legacyBehavior>
                    <a className="hover:underline">{post.title}</a>
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>{post.content}</p>
                <div className="text-sm text-muted-foreground mt-2">
                  <span>by {post.author.username}</span> | <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function ForumPage() {
  const isAuthed = !!Cookies.get("estatewise_token");
  const [conversations, setConversations] = useState<any[]>([]);
  const [conversationLoading, setConversationLoading] = useState(false);
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
        <title>EstateWise | Forum</title>
        <meta name="description" content="Community forum for EstateWise users" />
      </Head>
      <ClientOnly>
        <div className="min-h-screen flex dark:bg-background dark:text-foreground relative">
          <style jsx global>{`
            html { scroll-behavior: smooth; }
            html, body { overscroll-behavior: none; }
          `}</style>
          <div className="flex flex-1">
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
            <div className="flex-1 flex flex-col duration-600 ease-in-out">
              <TopBar
                onNewConvo={() => {
                  setSelectedConvo(null);
                  if (!isAuthed) localStorage.removeItem("estateWiseChat");
                }}
                toggleSidebar={toggleSidebar}
                sidebarVisible={sidebarVisible}
              />
              <ForumWindow />
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
