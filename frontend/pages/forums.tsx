"use client";

import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  MessageSquare,
  ThumbsUp,
  Eye,
  Clock,
  User,
  PlusCircle,
  Search,
  X,
  BarChart3,
  Calculator,
  GitBranch,
  MapPin,
  MessageCircle,
  MessageCircleMore,
  LogOut,
  User as UserIcon,
  Loader2,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { DarkModeToggle } from "@/components/dark-mode-toggle";
import { getPosts, createPost, searchPosts, type Post } from "@/lib/api";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "All",
  "General",
  "Neighborhoods",
  "Advice",
  "Market Analysis",
  "Home Improvement",
  "Lifestyle",
  "Investment",
  "Sustainability",
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "mostUpvoted", label: "Most Upvoted" },
  { value: "mostCommented", label: "Most Commented" },
  { value: "mostViewed", label: "Most Viewed" },
] as const;

type SortOption = (typeof SORT_OPTIONS)[number]["value"];

const resolveSortParams = (sortOption: SortOption) => {
  switch (sortOption) {
    case "oldest":
      return { sortBy: "createdAt", sortOrder: "asc" as const };
    case "mostUpvoted":
      return { sortBy: "upvotes", sortOrder: "desc" as const };
    case "mostCommented":
      return { sortBy: "commentCount", sortOrder: "desc" as const };
    case "mostViewed":
      return { sortBy: "viewCount", sortOrder: "desc" as const };
    case "newest":
    default:
      return { sortBy: "createdAt", sortOrder: "desc" as const };
  }
};

const getStoredToken = () =>
  Cookies.get("estatewise_token") || Cookies.get("token") || null;

export default function ForumsPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostCategory, setNewPostCategory] = useState("General");
  const [creating, setCreating] = useState(false);
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [authMenuOpen, setAuthMenuOpen] = useState(false);

  const isAuthed = Boolean(token);
  const navLinks = [
    { href: "/chat", label: "Chat", Icon: MessageCircleMore },
    { href: "/charts", label: "Charts", Icon: BarChart3 },
    { href: "/insights", label: "Insights", Icon: GitBranch },
    { href: "/analyzer", label: "Deal Analyzer", Icon: Calculator },
    { href: "/map", label: "Map", Icon: MapPin },
  ];
  const [navMenuOpen, setNavMenuOpen] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) {
      fetchPosts();
    }
  }, [selectedCategory, sortOption]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch();
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, selectedCategory, sortOption]);

  useEffect(() => {
    if (isAuthed) {
      setAuthMenuOpen(false);
    }
  }, [isAuthed]);

  useEffect(() => {
    setAuthMenuOpen(false);
  }, [router.asPath]);

  const handleAuthIconClick = () => {
    setNavMenuOpen(false);
    setAuthMenuOpen((prev) => !prev);
  };

  const fetchPosts = async () => {
    setLoading(true);
    setPosts([]);
    try {
      const { sortBy, sortOrder } = resolveSortParams(sortOption);
      const params =
        selectedCategory !== "All"
          ? { category: selectedCategory, sortBy, sortOrder }
          : { sortBy, sortOrder };
      const data = await getPosts(params);
      setPosts(data.posts || data);
    } catch (error: any) {
      toast.error(error.message || "Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchPosts();
      return;
    }

    setLoading(true);
    setPosts([]);
    try {
      const { sortBy, sortOrder } = resolveSortParams(sortOption);
      const results = await searchPosts(
        searchQuery,
        selectedCategory !== "All" ? selectedCategory : undefined,
        sortBy,
        sortOrder,
      );
      setPosts(results);
    } catch (error: any) {
      toast.error(error.message || "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      toast.error("Title and content are required");
      return;
    }

    const authToken = token ?? getStoredToken();
    if (!authToken) {
      toast.error("Please log in to create a post");
      return;
    }

    setCreating(true);
    try {
      const newPost = await createPost(
        {
          title: newPostTitle,
          content: newPostContent,
          category: newPostCategory,
        },
        authToken,
      );

      setToken(authToken);
      setShowCreateModal(false);
      setNewPostTitle("");
      setNewPostContent("");
      setNewPostCategory("General");
      const shouldRefetch =
        searchQuery.trim() ||
        sortOption !== "newest" ||
        (selectedCategory !== "All" && selectedCategory !== newPost.category);
      if (shouldRefetch) {
        if (searchQuery.trim()) {
          await handleSearch();
        } else {
          await fetchPosts();
        }
      } else {
        setPosts((prev) => [newPost, ...prev]);
      }
      toast.success("Post created successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to create post");
    } finally {
      setCreating(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      <Head>
        <title>Community Forums | EstateWise</title>
        <meta
          name="description"
          content="Join the EstateWise community to discuss real estate, share experiences, and connect with fellow property enthusiasts"
        />
      </Head>

      <div className="min-h-screen bg-background">
        {/* Header with Navigation */}
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/60">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-foreground min-w-0">
                <MessageCircle className="w-6 h-6 text-primary" />
                <h1 className="text-xl font-bold truncate">
                  <span className="md:hidden">Forums</span>
                  <span className="hidden md:inline">Community Forums</span>
                </h1>
              </div>

              <div className="flex items-center gap-3 text-foreground">
                <div className="hidden md:flex items-center gap-4">
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
                <div className="md:hidden relative">
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
                    <div className="absolute right-0 mt-2 w-40 bg-card rounded shadow-lg py-2 z-50">
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
                {isAuthed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          Cookies.remove("estatewise_token");
                          Cookies.remove("token");
                          document.cookie =
                            "estatewise_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                          document.cookie =
                            "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
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
                ) : (
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
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          {/* Search and Create Section */}
          <div className="mb-8 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex-1 w-full max-w-2xl">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search posts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                {searchQuery && (
                  <Button
                    onClick={() => {
                      setSearchQuery("");
                    }}
                    variant="ghost"
                    size="icon"
                    className="text-foreground hover:text-primary"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            <Button
              onClick={() => {
                if (!isAuthed) {
                  toast.error("Please log in to create a post");
                  router.push("/login");
                  return;
                }
                setShowCreateModal(true);
              }}
              className="gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              New Post
            </Button>
          </div>

          {/* Category Filter + Sort */}
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    selectedCategory === cat
                      ? "shadow-sm"
                      : "bg-muted/60 text-foreground hover:bg-muted/80 dark:bg-muted/30 dark:text-foreground dark:hover:bg-muted/50",
                  )}
                >
                  {cat}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Label
                htmlFor="sort-posts"
                className="text-sm text-muted-foreground"
              >
                Sort by
              </Label>
              <select
                id="sort-posts"
                value={sortOption}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setSortOption(e.target.value as SortOption)
                }
                className="min-w-[170px] rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/30"
              >
                {SORT_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    className="bg-background text-foreground"
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Separator className="mb-6" />

          {/* Posts List */}
          {loading ? (
            <div className="flex flex-col justify-center items-center py-20">
              <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
              <div className="text-muted-foreground">Loading posts...</div>
            </div>
          ) : posts.length === 0 ? (
            <Card className="py-20">
              <CardContent className="flex flex-col items-center justify-center text-center">
                <MessageCircle className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No posts found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery
                    ? "Try adjusting your search terms"
                    : "Be the first to start a discussion!"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <motion.div
                  key={post._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Link href={`/forums/${post._id}`} className="block">
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                {post.category}
                              </span>
                            </div>
                            <CardTitle className="text-xl mb-2 hover:text-primary transition-colors">
                              {post.title}
                            </CardTitle>
                            <CardDescription className="line-clamp-2">
                              {post.content.substring(0, 200)}
                              {post.content.length > 200 ? "..." : ""}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col gap-3 text-sm text-muted-foreground dark:text-foreground md:flex-row md:items-center md:justify-between">
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              <span>
                                {post.author?.username || "Anonymous"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>{formatTimeAgo(post.createdAt)}</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1">
                              <ThumbsUp className="w-4 h-4" />
                              <span>{post.upvotes?.length || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageSquare className="w-4 h-4" />
                              <span>{post.commentCount || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Eye className="w-4 h-4" />
                              <span>{post.viewCount || 0}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
          <div className="mt-10 pt-6 border-t border-border/60 text-xs text-muted-foreground text-center">
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
          </div>
        </main>

        {/* Create Post Dialog */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-2xl text-foreground">
            <DialogHeader>
              <DialogTitle>Create a New Post</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Enter post title..."
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  maxLength={200}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  className="w-full rounded-md border border-input bg-background text-foreground px-3 py-2 mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/30"
                  value={newPostCategory}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setNewPostCategory(e.target.value)
                  }
                >
                  {CATEGORIES.filter((c) => c !== "All").map((cat) => (
                    <option
                      key={cat}
                      value={cat}
                      className="bg-background text-foreground"
                    >
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  placeholder="Share your thoughts, questions, or experiences..."
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  rows={8}
                  className="resize-none mt-2"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button onClick={handleCreatePost} disabled={creating}>
                {creating ? "Creating..." : "Create Post"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
