"use client";

import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Eye,
  EyeOff,
  Fingerprint,
  Key,
  MessageCircle,
  User,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import {
  passkeysAvailable,
  signInWithPasskey,
  browserSupportsWebAuthnAutofill,
} from "@/lib/passkeys";

const formVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);
  const [showPasskeys, setShowPasskeys] = useState(false);
  const router = useRouter();

  const finishLogin = (data: {
    token: string;
    user: { username: string; email: string };
  }) => {
    Cookies.set("estatewise_token", data.token);
    localStorage.setItem("username", data.user.username);
    localStorage.setItem("email", data.user.email);
  };

  const handlePasskeySignIn = async (opts?: {
    email?: string;
    useBrowserAutofill?: boolean;
  }) => {
    if (isPasskeyLoading) return;
    if (!opts?.useBrowserAutofill) setIsPasskeyLoading(true);
    try {
      const data = await signInWithPasskey(opts);
      finishLogin(data);
      toast.success("Signed in with passkey.");
      router.push("/chat");
    } catch (err: unknown) {
      // Browser DOMException: AbortError / NotAllowedError = user cancelled.
      // Don't yell at them. Anything else is a real error.
      const e = err as { name?: string; message?: string };
      if (e?.name === "AbortError" || e?.name === "NotAllowedError") {
        if (!opts?.useBrowserAutofill) {
          toast.error("Passkey sign-in cancelled.");
        }
      } else {
        console.error(err);
        toast.error(e?.message || "Passkey sign-in failed.");
      }
    } finally {
      setIsPasskeyLoading(false);
    }
  };

  // Show passkey UI only when supported, and start conditional UI (autofill)
  // so the email field surfaces saved passkeys inline.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!passkeysAvailable()) return;
      setShowPasskeys(true);
      try {
        const supportsAutofill = await browserSupportsWebAuthnAutofill();
        if (!supportsAutofill || cancelled) return;
        // Fire-and-forget; resolves only when user picks a passkey from the
        // autofill dropdown. Errors are silenced unless they're real failures.
        handlePasskeySignIn({ useBrowserAutofill: true });
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const applyPreference = (value: string | null) => {
      if (value === null) return;
      const enabled = value === "true";
      const root = document.documentElement;
      root.classList.toggle("dark", enabled);
      document
        .querySelector("meta[name='theme-color']")
        ?.setAttribute("content", enabled ? "#262626" : "#faf9f2");
    };

    applyPreference(localStorage.getItem("dark-mode"));
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== "dark-mode") return;
      applyPreference(event.newValue);
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.status === 200) {
        const data = await res.json();
        finishLogin(data);
        toast.success("You have successfully logged in.");
        router.push("/chat");
      } else {
        const errData = await res.json();
        setErrorMsg(errData.message || "Login failed - invalid credentials");
        toast.error(errData.message || "Login failed - invalid credentials");
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
        <title>Login | EstateWise</title>
        <meta name="description" content="Login to EstateWise" />
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

          /* Hover effect for all <a> links */
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
              <User className="w-8 h-8 text-card-foreground opacity-80" />
            </div>
            <h1 className="text-3xl mt-0 font-bold text-center text-card-foreground">
              Log In
            </h1>
            <p className="text-sm text-center text-card-foreground">
              Welcome back! Please enter your details.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                      handleSubmit(e);
                    }
                  }}
                  required
                  // "username webauthn" enables conditional UI: the password
                  // manager surfaces saved passkeys directly in this field.
                  autoComplete="username webauthn"
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
              <Button
                type="submit"
                className="w-full mt-4 cursor-pointer"
                disabled={isLoading}
                title="Log In"
                aria-label="Log In"
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
                    Logging in...
                  </>
                ) : (
                  <>
                    <Key className="w-5 h-5 text-white" />
                    <span>Log In</span>
                  </>
                )}
              </Button>
            </form>
            {showPasskeys && (
              <>
                <div className="flex items-center gap-3 mt-4">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full mt-4 cursor-pointer"
                  disabled={isPasskeyLoading}
                  onClick={() =>
                    handlePasskeySignIn(email ? { email } : undefined)
                  }
                  title="Sign in with a passkey"
                  aria-label="Sign in with a passkey"
                >
                  {isPasskeyLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
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
                      <span>Verifying…</span>
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-5 h-5" />
                      <span>Sign in with a passkey</span>
                    </>
                  )}
                </Button>
              </>
            )}
            <div className="space-y-3">
              <p className="text-sm text-center text-card-foreground">
                Don&apos;t have an account?{" "}
                <Link
                  href="/signup"
                  className="text-primary underline"
                  title="Sign Up"
                >
                  Sign Up
                </Link>
              </p>
              <p className="text-sm text-center text-card-foreground">
                Forgot your password?{" "}
                <Link
                  href="/reset-password"
                  className="text-primary underline"
                  title="Reset Password"
                >
                  Reset Password
                </Link>
              </p>
            </div>
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
            <p className="text-xs text-center mt-0.5 leading-relaxed text-muted-foreground">
              By continuing, you agree to our{" "}
              <Link
                href="/terms"
                className="font-semibold text-foreground/90 underline underline-offset-4 decoration-foreground/30 transition-colors hover:text-primary hover:decoration-primary"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="font-semibold text-foreground/90 underline underline-offset-4 decoration-foreground/30 transition-colors hover:text-primary hover:decoration-primary"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </Card>
        </motion.div>
      </div>
    </>
  );
}
