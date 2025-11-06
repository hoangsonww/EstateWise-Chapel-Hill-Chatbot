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
  ThumbsDown,
  Eye,
  Clock,
  User,
  ArrowLeft,
  Send,
  Trash2,
  BarChart3,
  GitBranch,
  MapPin,
  MessageCircle,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DarkModeToggle } from "@/components/dark-mode-toggle";
import {
  getPost,
  getCommentsByPost,
  createComment,
  deletePost,
  upvotePost,
  downvotePost,
  upvoteComment,
  downvoteComment,
  deleteComment,
  type Post,
  type Comment,
} from "@/lib/api";

const getStoredToken = () =>
  Cookies.get("estatewise_token") || Cookies.get("token") || null;

const decodeJwtPayload = (jwt: string) => {
  try {
    const [, payload] = jwt.split(".");
    if (!payload || typeof window === "undefined") return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = window.atob(base64);
    const jsonPayload = decodeURIComponent(
      decoded
        .split("")
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(""),
    );
    return JSON.parse(jsonPayload) as { id?: string; email?: string };
  } catch {
    return null;
  }
};

export default function PostDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(
    null,
  );
  const [showDeletePostDialog, setShowDeletePostDialog] = useState(false);
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authMenuOpen, setAuthMenuOpen] = useState(false);

  const isAuthed = Boolean(token ?? getStoredToken());

  useEffect(() => {
    const storedToken = getStoredToken();
    const storedEmail =
      typeof window !== "undefined" ? localStorage.getItem("email") : null;

    setToken(storedToken);
    if (storedEmail) {
      setUserEmail(storedEmail);
    }

    if (storedToken) {
      const payload = decodeJwtPayload(storedToken);
      if (payload?.id) {
        setUserId(payload.id);
      }
      if (payload?.email && !storedEmail) {
        setUserEmail(payload.email);
      }
    }
  }, []);

  useEffect(() => {
    if (isAuthed) {
      setAuthMenuOpen(false);
    }
  }, [isAuthed]);

  useEffect(() => {
    setAuthMenuOpen(false);
  }, [router.asPath]);

  useEffect(() => {
    if (id) {
      fetchPostAndComments();
    }
  }, [id]);

  const fetchPostAndComments = async () => {
    if (!id || typeof id !== "string") return;

    setLoading(true);
    try {
      const [postData, commentsData] = await Promise.all([
        getPost(id),
        getCommentsByPost(id),
      ]);

      setPost(postData);
      setComments(commentsData);
    } catch (error: any) {
      toast.error(error.message || "Failed to load post");
    } finally {
      setLoading(false);
    }
  };

  const handleAuthIconClick = () => {
    setAuthMenuOpen((prev) => !prev);
  };

  const handleVote = async (type: "upvote" | "downvote") => {
    if (!isAuthed) {
      toast.error("Please log in to vote");
      router.push("/login");
      return;
    }

    if (!post) return;

    const authToken = token ?? getStoredToken();
    if (!authToken) return;

    try {
      const updatedPost =
        type === "upvote"
          ? await upvotePost(post._id, authToken)
          : await downvotePost(post._id, authToken);
      setToken(authToken);
      setPost(updatedPost);
    } catch (error: any) {
      toast.error(error.message || "Failed to vote");
    }
  };

  const handleCommentVote = async (
    commentId: string,
    type: "upvote" | "downvote",
  ) => {
    if (!isAuthed) {
      toast.error("Please log in to vote");
      router.push("/login");
      return;
    }

    const authToken = token ?? getStoredToken();
    if (!authToken) return;

    try {
      const updatedComment =
        type === "upvote"
          ? await upvoteComment(commentId, authToken)
          : await downvoteComment(commentId, authToken);

      setComments(
        comments.map((c) => (c._id === commentId ? updatedComment : c)),
      );
      setToken(authToken);
    } catch (error: any) {
      toast.error(error.message || "Failed to vote");
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) {
      toast.error("Comment cannot be empty");
      return;
    }

    if (!isAuthed) {
      toast.error("Please log in to comment");
      router.push("/login");
      return;
    }

    if (!post) return;

    const authToken = token ?? getStoredToken();
    if (!authToken) return;

    setSubmitting(true);
    try {
      const newComment = await createComment(
        { postId: post._id, content: commentText },
        authToken,
      );

      setComments([newComment, ...comments]);
      setCommentText("");
      setPost({ ...post, commentCount: post.commentCount + 1 });
      setToken(authToken);
      toast.success("Comment posted!");
    } catch (error: any) {
      toast.error(error.message || "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const authToken = token ?? getStoredToken();
    if (!authToken) return;

    try {
      await deleteComment(commentId, authToken);
      setComments(comments.filter((c) => c._id !== commentId));
      setPost((prev) =>
        prev ? { ...prev, commentCount: prev.commentCount - 1 } : null,
      );
      setDeletingCommentId(null);
      setToken(authToken);
      toast.success("Comment deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete comment");
    }
  };

  const handleDeletePost = async () => {
    if (!post) return;

    const authToken = token ?? getStoredToken();
    if (!authToken) return;

    try {
      await deletePost(post._id, authToken);
      toast.success("Post deleted successfully");
      router.push("/forums");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete post");
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

  const isPostAuthor = post?.author?.email === userEmail;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Post not found</h2>
          <Link href="/forums">
            <Button
              variant="outline"
              className="text-foreground dark:text-foreground border-border"
            >
              Back to Forums
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{post.title} | EstateWise Forums</title>
        <meta name="description" content={post.content.substring(0, 160)} />
      </Head>

      <div className="min-h-screen bg-background">
        {/* Header with Navigation */}
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link
                  href="/forums"
                  className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="hidden sm:inline">Back to Forums</span>
                </Link>
              </div>

              <div className="flex items-center gap-4 text-foreground overflow-visible">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href="/chat"
                      className="inline-flex h-8 w-8 items-center justify-center text-foreground hover:text-primary transition-colors"
                      aria-label="Chat"
                    >
                      <MessageSquare className="w-5 h-5" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>Chat</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href="/charts"
                      className="inline-flex h-8 w-8 items-center justify-center text-foreground hover:text-primary transition-colors"
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
                      className="inline-flex h-8 w-8 items-center justify-center text-foreground hover:text-primary transition-colors"
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
                      className="inline-flex h-8 w-8 items-center justify-center text-foreground hover:text-primary transition-colors"
                      aria-label="Map"
                    >
                      <MapPin className="w-5 h-5" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>Map</TooltipContent>
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
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Post Card */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                    {post.category}
                  </span>
                </div>
                {isPostAuthor && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeletePostDialog(true)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <CardTitle className="text-3xl mb-4">{post.title}</CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>{post.author?.username || "Anonymous"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{formatTimeAgo(post.createdAt)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  <span>{post.viewCount} views</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose dark:prose-invert max-w-none mb-6">
                {post.content.split("\n").map((paragraph, idx) => (
                  <p key={idx} className="mb-3">
                    {paragraph}
                  </p>
                ))}
              </div>

              <Separator className="my-4" />

              {/* Voting Section */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleVote("upvote")}
                    className={
                      userId && post.upvotes?.includes(userId)
                        ? "text-primary"
                        : ""
                    }
                  >
                    <ThumbsUp className="w-4 h-4 mr-1" />
                    {post.upvotes?.length || 0}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleVote("downvote")}
                    className={
                      userId && post.downvotes?.includes(userId)
                        ? "text-destructive"
                        : ""
                    }
                  >
                    <ThumbsDown className="w-4 h-4 mr-1" />
                    {post.downvotes?.length || 0}
                  </Button>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground dark:text-foreground">
                  <MessageSquare className="w-4 h-4" />
                  <span>{post.commentCount} comments</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comment Input */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Add a Comment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea
                  placeholder={
                    isAuthed
                      ? "Share your thoughts..."
                      : "Please log in to comment"
                  }
                  value={commentText}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setCommentText(e.target.value)
                  }
                  disabled={!isAuthed}
                  rows={4}
                  className="resize-none"
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleSubmitComment}
                    disabled={!isAuthed || submitting || !commentText.trim()}
                    className="gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {submitting ? "Posting..." : "Post Comment"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comments List */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-4 text-foreground">
              Comments ({comments.length})
            </h2>

            {comments.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No comments yet. Be the first to comment!</p>
                </CardContent>
              </Card>
            ) : (
              comments.map((comment) => (
                <motion.div
                  key={comment._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 text-sm">
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            <span className="font-medium">
                              {comment.author?.username || "Anonymous"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            <span>{formatTimeAgo(comment.createdAt)}</span>
                          </div>
                        </div>
                        {comment.author?.email === userEmail && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingCommentId(comment._id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>

                      <p className="mb-4 whitespace-pre-wrap">
                        {comment.content}
                      </p>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleCommentVote(comment._id, "upvote")
                          }
                          className={
                            userId && comment.upvotes?.includes(userId)
                              ? "text-primary"
                              : ""
                          }
                        >
                          <ThumbsUp className="w-4 h-4 mr-1" />
                          {comment.upvotes?.length || 0}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleCommentVote(comment._id, "downvote")
                          }
                          className={
                            userId && comment.downvotes?.includes(userId)
                              ? "text-destructive"
                              : ""
                          }
                        >
                          <ThumbsDown className="w-4 h-4 mr-1" />
                          {comment.downvotes?.length || 0}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </main>

        {/* Delete Post Dialog */}
        <Dialog
          open={showDeletePostDialog}
          onOpenChange={setShowDeletePostDialog}
        >
          <DialogContent className="bg-card text-foreground [&>button]:text-muted-foreground [&>button]:hover:text-foreground">
            <DialogHeader>
              <DialogTitle className="text-foreground">Delete Post</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Are you sure you want to delete this post? This action cannot be
                undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeletePostDialog(false)}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeletePost}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Comment Dialog */}
        <Dialog
          open={!!deletingCommentId}
          onOpenChange={() => setDeletingCommentId(null)}
        >
          <DialogContent className="bg-card text-foreground [&>button]:text-muted-foreground [&>button]:hover:text-foreground">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                Delete Comment
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Are you sure you want to delete this comment? This action cannot
                be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeletingCommentId(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() =>
                  deletingCommentId && handleDeleteComment(deletingCommentId)
                }
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
