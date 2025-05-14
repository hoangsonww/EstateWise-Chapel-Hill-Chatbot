"use client";

import React, { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Eye, EyeOff, MessageCircle, Plus, UserPlus } from "lucide-react";

const formVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

export default function SignUpPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    // Validate that password and confirmation match
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(
        "https://estatewise-backend.vercel.app/api/auth/signup",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, email, password }),
        },
      );

      if (res.status === 201) {
        // Automatically log the user in upon successful sign up
        const loginRes = await fetch(
          "https://estatewise-backend.vercel.app/api/auth/login",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          },
        );
        if (loginRes.status === 200) {
          const data = await loginRes.json();
          Cookies.set("estatewise_token", data.token);
          router.push("/chat");
          toast.success("Sign up and login successfully");
        } else {
          setErrorMsg(
            "Sign up succeeded but automatic login failed. Please log in manually.",
          );
          toast.error(
            "Sign up succeeded but automatic login failed. Please log in manually.",
          );
        }
      } else {
        const errData = await res.json();
        setErrorMsg(errData.message || "Sign up failed");
        toast.error(errData.message || "Sign up failed");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("An error occurred. Please try again.");
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Luxera Ai | Sign Up</title>
        <meta name="description" content="Sign up for Luxera Ai" />
      </Head>
      <div className="min-h-screen flex items-center justify-center animated-gradient px-4">
        <style jsx global>{`
          html {
            scroll-behavior: smooth;
          }
          html,
          body {
            overscroll-behavior: none;
          }
          @keyframes gradientAnimation {
            0% {
              background-position: 0% 50%;
            }
            50% {
              background-position: 100% 50%;
            }
            100% {
              background-position: 0% 50%;
            }
          }
          .animated-gradient {
            background: linear-gradient(
              270deg,
              #7928ca,
              #ff0080,
              #fbbc05,
              #12c2e9
            );
            background-size: 800% 800%;
            animation: gradientAnimation 20s ease infinite;
          }
          /* Hover effect for all links */
          a {
            transition:
              color 0.2s,
              text-decoration-color 0.2s;
          }
          a:hover {
            color: #ff0080;
            text-decoration-color: #ff0080;
          }
        `}</style>
        <motion.div
          variants={formVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-md"
        >
          <Card className="p-8 rounded-xl shadow-2xl bg-card m-2">
            <div className="flex justify-center mt-2">
              <UserPlus className="w-8 h-8 text-card-foreground opacity-80" />
            </div>
            <h1 className="text-3xl font-bold text-center text-card-foreground">
              Sign Up
            </h1>
            <p className="text-sm text-center text-card-foreground">
              Welcome! Create an account to save your conversations, settings,
              and more.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-card-foreground">
                  Username
                </label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-card-foreground">
                  Email
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-card-foreground">
                  Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSubmit(e);
                      }
                    }}
                    required
                    className="w-full pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 focus:outline-none"
                    aria-label="Toggle password visibility"
                    title="Toggle password visibility"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5 text-gray-600" />
                    ) : (
                      <Eye className="w-5 h-5 text-gray-600" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-card-foreground">
                  Confirm Password
                </label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSubmit(e);
                      }
                    }}
                    required
                    className="w-full pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 focus:outline-none"
                    aria-label="Toggle confirm password visibility"
                    title="Toggle confirm password visibility"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5 text-gray-600" />
                    ) : (
                      <Eye className="w-5 h-5 text-gray-600" />
                    )}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full py-2 mt-4 cursor-pointer"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      ></path>
                    </svg>
                    Signing up...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 text-white" />
                    <span>Sign Up</span>
                  </>
                )}
              </Button>
            </form>
            <p className="text-sm text-center mt-0 text-card-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-primary underline"
                title="Log In"
              >
                Log In
              </Link>
            </p>
            <p className="text-sm text-center mt-0 text-card-foreground">
              Forgot your password?{" "}
              <Link
                href="/reset-password"
                className="text-primary underline"
                title="Reset Password"
              >
                Reset Password
              </Link>
            </p>
            <Button
              variant="secondary"
              className="w-full mt-0 cursor-pointer"
              onClick={() => router.push("/chat")}
              title="Back to Chat"
              aria-label="Back to Chat"
            >
              <MessageCircle />
              Back to Chat
            </Button>
          </Card>
        </motion.div>
      </div>
    </>
  );
}
