"use client";

import React, { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Eye, EyeOff, Key, Lock, Mail, MessageCircle } from "lucide-react";

const formVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [errorMsg, setErrorMsg] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [successMsg, setSuccessMsg] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setIsVerifying(true);
    try {
      const res = await fetch(
        "https://api.homesluxera.com/api/auth/verify-email",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        },
      );
      if (res.status === 200) {
        setIsVerified(true);
        setSuccessMsg("Email verified. Please enter your new password.");
        toast.success("Email verified. Please enter your new password.");
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || "Email verification failed");
        toast.error(errData.error || "Email verification failed");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("An error occurred. Please try again.");
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match");
      return;
    }
    setIsResetting(true);
    try {
      const res = await fetch(
        "https://api.homesluxera.com/api/auth/reset-password",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, newPassword }),
        },
      );
      if (res.status === 200) {
        const data = await res.json();
        setSuccessMsg(data.message || "Password reset successfully");
        toast.success("Password reset successfully");
        setTimeout(() => router.push("/login"), 1000);
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || "Failed to reset password");
        toast.error(errData.error || "Failed to reset password");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("An error occurred. Please try again.");
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Luxera Ai | Reset Password</title>
        <meta name="description" content="Reset your password for Luxera Ai" />
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
              <Lock className="w-8 h-8 text-card-foreground opacity-80" />
            </div>
            <h1 className="text-3xl font-bold mb-0 text-center text-card-foreground">
              Reset Password
            </h1>
            <p className="text-sm text-center text-card-foreground">
              Forgot your password? Don&apos;t worry, we got you covered!
            </p>
            {!isVerified ? (
              <form onSubmit={handleVerifyEmail} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-card-foreground">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleVerifyEmail(e);
                      }
                    }}
                    required
                    className="w-full"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full py-2 mt-4 cursor-pointer"
                  disabled={isVerifying}
                  aria-label="Verify Email"
                  title="Verify Email"
                >
                  {isVerifying ? (
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
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Mail className="w-5 h-5 text-white" />
                      <span>Verify Email</span>
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-card-foreground">
                    New Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleResetPassword(e);
                        }
                      }}
                      required
                      className="w-full pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 focus:outline-none"
                      aria-label="Toggle new password visibility"
                      title="Toggle new password visibility"
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-5 h-5 text-gray-600" />
                      ) : (
                        <Eye className="w-5 h-5 text-gray-600" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-card-foreground">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleResetPassword(e);
                        }
                      }}
                      required
                      className="w-full pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 focus:outline-none"
                      aria-label="Toggle confirm new password visibility"
                      title="Toggle confirm new password visibility"
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
                  disabled={isResetting}
                  aria-label="Reset Password"
                  title="Reset Password"
                >
                  {isResetting ? (
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
                      Resetting...
                    </>
                  ) : (
                    <>
                      <Key className="w-5 h-5 text-white" />
                      <span>Reset Password</span>
                    </>
                  )}
                </Button>
              </form>
            )}
            <p className="text-sm text-center mt-0 text-card-foreground">
              Remembered your password?{" "}
              <Link
                href="/login"
                className="text-primary underline"
                title="Log In"
              >
                Log In
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
