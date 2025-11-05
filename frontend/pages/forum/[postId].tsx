"use client";

import React, { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PlusCircle } from "lucide-react";
import Cookies from "js-cookie";
import { toast } from "sonner";

const API_BASE_URL = "https://estatewise-backend.vercel.app";

type Comment = {
  _id: string;
  content: string;
  author: {
    username: string;
  };
  createdAt: string;
};

type Post = {
  _id: string;
  title: string;
  content: string;
  author: {
    username: string;
  };
  comments: Comment[];
  createdAt: string;
};

export default function PostPage() {
  const [post, setPost] = useState<Post | null>(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { postId } = router.query;
  const isAuthed = !!Cookies.get("estatewise_token");

  useEffect(() => {
    if (postId) {
      fetchPost();
    }
  }, [postId]);

  const fetchPost = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/forum/posts/${postId}`);
      if (res.ok) {
        const data = await res.json();
        setPost(data);
      } else {
        toast.error("Failed to fetch post");
      }
    } catch (error) {
      toast.error("Error fetching post");
    }
  };

  const handleCreateComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      toast.error("Comment content is required");
      return;
    }

    setLoading(true);
    try {
      const token = Cookies.get("estatewise_token");
      const res = await fetch(
        `${API_BASE_URL}/api/forum/posts/${postId}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content: comment }),
        },
      );

      if (res.ok) {
        toast.success("Comment created successfully");
        setComment("");
        fetchPost();
      } else {
        toast.error("Failed to create comment");
      }
    } catch (error) {
      toast.error("Error creating comment");
    } finally {
      setLoading(false);
    }
  };

  if (!post) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Head>
        <title>{post.title} | EstateWise Forum</title>
        <meta name="description" content={post.content} />
      </Head>
      <div className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto p-4">
          <Card>
            <CardHeader>
              <CardTitle>{post.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{post.content}</p>
              <div className="text-sm text-muted-foreground mt-2">
                <span>by {post.author.username}</span> |{" "}
                <span>{new Date(post.createdAt).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>

          <div className="mt-4">
            <h2 className="text-2xl font-bold mb-2">Comments</h2>
            {isAuthed && (
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle>Add a Comment</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateComment}>
                    <div className="mb-4">
                      <Textarea
                        placeholder="Your comment"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <Button type="submit" disabled={loading}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      {loading ? "Adding..." : "Add Comment"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
            <div className="space-y-4">
              {post.comments.map((comment) => (
                <Card key={comment._id}>
                  <CardContent>
                    <p>{comment.content}</p>
                    <div className="text-sm text-muted-foreground mt-2">
                      <span>by {comment.author.username}</span> |{" "}
                      <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
