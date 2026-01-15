"use client";

import React, { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  BarChart3,
  Calculator,
  Eye,
  EyeOff,
  GitBranch,
  Loader2,
  Lock,
  Mail,
  MapPin,
  MessageCircleMore,
  Save,
  Settings,
  User as UserIcon,
  Users,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DarkModeToggle } from "@/components/dark-mode-toggle";

const formVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

type ProfileState = {
  username: string;
  email: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const token = useMemo(
    () => Cookies.get("estatewise_token") || Cookies.get("token") || "",
    [],
  );
  const isAuthed = Boolean(token);
  const [authMenuOpen, setAuthMenuOpen] = useState(false);
  const [navMenuOpen, setNavMenuOpen] = useState(false);

  const [profile, setProfile] = useState<ProfileState>({
    username: "",
    email: "",
  });
  const [initialProfile, setInitialProfile] = useState<ProfileState>({
    username: "",
    email: "",
  });
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [confirmUsername, setConfirmUsername] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navLinks = [
    { href: "/chat", label: "Chat", Icon: MessageCircleMore },
    { href: "/charts", label: "Charts", Icon: BarChart3 },
    { href: "/insights", label: "Insights", Icon: GitBranch },
    { href: "/analyzer", label: "Deal Analyzer", Icon: Calculator },
    { href: "/forums", label: "Forums", Icon: Users },
    { href: "/map", label: "Map", Icon: MapPin },
  ];

  useEffect(() => {
    if (!isAuthed) return;
    const storedUsername = localStorage.getItem("username") || "";
    const storedEmail = localStorage.getItem("email") || "";
    if (storedUsername || storedEmail) {
      const nextProfile = {
        username: storedUsername,
        email: storedEmail,
      };
      setProfile(nextProfile);
      setInitialProfile(nextProfile);
      setConfirmUsername("");
      setConfirmEmail("");
    }
  }, [isAuthed]);

  useEffect(() => {
    if (isAuthed) {
      setAuthMenuOpen(false);
    }
  }, [isAuthed]);

  useEffect(() => {
    setAuthMenuOpen(false);
    setNavMenuOpen(false);
  }, [router.asPath]);

  const handleAuthIconClick = () => {
    setNavMenuOpen(false);
    setAuthMenuOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!isAuthed) return;
    const fetchProfile = async () => {
      setLoadingProfile(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to load profile");
        }
        const data = await res.json();
        const nextProfile = {
          username: data.user?.username || "",
          email: data.user?.email || "",
        };
        setProfile(nextProfile);
        setInitialProfile(nextProfile);
        localStorage.setItem("username", nextProfile.username);
        localStorage.setItem("email", nextProfile.email);
        setConfirmUsername("");
        setConfirmEmail("");
      } catch (error: any) {
        toast.error(error.message || "Failed to load profile");
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [isAuthed, token]);

  const normalizedUsername = profile.username.trim();
  const normalizedEmail = profile.email.trim();
  const normalizedConfirmUsername = confirmUsername.trim();
  const normalizedConfirmEmail = confirmEmail.trim();
  const hasUsernameChange = normalizedUsername !== initialProfile.username;
  const hasEmailChange = normalizedEmail !== initialProfile.email;
  const usernameConfirmed =
    normalizedUsername !== "" &&
    normalizedConfirmUsername === normalizedUsername;
  const emailConfirmed =
    normalizedEmail !== "" && normalizedConfirmEmail === normalizedEmail;

  const handleUsernameSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isAuthed) {
      toast.error("Please log in to update your profile.");
      return;
    }
    if (!normalizedUsername) {
      toast.error("Username is required.");
      return;
    }
    if (!hasUsernameChange) {
      toast("No changes to save.");
      return;
    }
    if (!usernameConfirmed) {
      toast.error("Please confirm your username.");
      return;
    }

    setSavingUsername(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: normalizedUsername }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to update profile");
      }
      const data = await res.json();
      const nextProfile = {
        username: data.user?.username || normalizedUsername,
        email: profile.email,
      };
      setProfile(nextProfile);
      setInitialProfile((prev) => ({
        ...prev,
        username: nextProfile.username,
      }));
      localStorage.setItem("username", nextProfile.username);
      setConfirmUsername("");
      toast.success("Username updated successfully.");
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setSavingUsername(false);
    }
  };

  const handleEmailSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isAuthed) {
      toast.error("Please log in to update your profile.");
      return;
    }
    if (!normalizedEmail) {
      toast.error("Email is required.");
      return;
    }
    if (!hasEmailChange) {
      toast("No changes to save.");
      return;
    }
    if (!emailConfirmed) {
      toast.error("Please confirm your email address.");
      return;
    }

    setSavingEmail(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to update profile");
      }
      const data = await res.json();
      const nextProfile = {
        username: profile.username,
        email: data.user?.email || normalizedEmail,
      };
      setProfile(nextProfile);
      setInitialProfile((prev) => ({
        ...prev,
        email: nextProfile.email,
      }));
      localStorage.setItem("email", nextProfile.email);
      setConfirmEmail("");
      toast.success("Email updated successfully.");
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setSavingEmail(false);
    }
  };

  const handlePasswordChange = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isAuthed) {
      toast.error("Please log in to update your password.");
      return;
    }
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("All password fields are required.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to update password");
      }
      toast.success("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <>
      <Head>
        <title>Profile | EstateWise</title>
        <meta name="description" content="Manage your EstateWise account." />
      </Head>
      <div className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/60">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-foreground min-w-0">
                <UserIcon className="w-6 h-6 text-primary" />
                <h1 className="text-xl font-bold truncate">Profile</h1>
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
                      {isAuthed ? (
                        <div
                          className="px-4 py-2 hover:bg-muted cursor-pointer select-none text-red-600"
                          onClick={() => {
                            setAuthMenuOpen(false);
                            Cookies.remove("estatewise_token");
                            Cookies.remove("token");
                            document.cookie =
                              "estatewise_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                            document.cookie =
                              "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                            toast.success("Logged out successfully");
                            window.location.reload();
                          }}
                          title="Log Out"
                          aria-label="Log Out"
                        >
                          Log Out
                        </div>
                      ) : (
                        <>
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

        <motion.main
          className="container mx-auto px-4 py-10 max-w-4xl"
          variants={formVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="flex flex-col gap-8">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
              <p className="text-muted-foreground">
                View and update your account details and security settings.
              </p>
            </div>

            {!isAuthed ? (
              <Card>
                <CardHeader>
                  <CardTitle>Sign in required</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Please log in to view and edit your account information.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button asChild>
                      <Link href="/login">Log In</Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/signup">Create account</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <UserIcon className="w-5 h-5" />
                        Username
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleUsernameSave} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="username">New username</Label>
                          <Input
                            id="username"
                            value={profile.username}
                            onChange={(event) =>
                              setProfile((prev) => ({
                                ...prev,
                                username: event.target.value,
                              }))
                            }
                            disabled={loadingProfile || savingUsername}
                            placeholder="Your username"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirmUsername">
                            Confirm username
                          </Label>
                          <Input
                            id="confirmUsername"
                            value={confirmUsername}
                            onChange={(event) =>
                              setConfirmUsername(event.target.value)
                            }
                            disabled={loadingProfile || savingUsername}
                            placeholder="Re-enter your username"
                          />
                          <p className="text-xs text-muted-foreground">
                            Must match to save changes.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <Button
                            type="submit"
                            disabled={
                              loadingProfile ||
                              savingUsername ||
                              !normalizedUsername ||
                              !hasUsernameChange ||
                              !usernameConfirmed
                            }
                          >
                            {savingUsername ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                            <span className="ml-2">
                              {savingUsername ? "Saving..." : "Save username"}
                            </span>
                          </Button>
                          {loadingProfile && (
                            <span className="text-sm text-muted-foreground">
                              Loading your profile...
                            </span>
                          )}
                        </div>
                      </form>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Mail className="w-5 h-5" />
                        Email
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleEmailSave} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">New email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={profile.email}
                            onChange={(event) =>
                              setProfile((prev) => ({
                                ...prev,
                                email: event.target.value,
                              }))
                            }
                            disabled={loadingProfile || savingEmail}
                            placeholder="you@example.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirmEmail">Confirm email</Label>
                          <Input
                            id="confirmEmail"
                            type="email"
                            value={confirmEmail}
                            onChange={(event) =>
                              setConfirmEmail(event.target.value)
                            }
                            disabled={loadingProfile || savingEmail}
                            placeholder="Re-enter your email"
                          />
                          <p className="text-xs text-muted-foreground">
                            Must match to save changes.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <Button
                            type="submit"
                            disabled={
                              loadingProfile ||
                              savingEmail ||
                              !normalizedEmail ||
                              !hasEmailChange ||
                              !emailConfirmed
                            }
                          >
                            {savingEmail ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                            <span className="ml-2">
                              {savingEmail ? "Saving..." : "Save email"}
                            </span>
                          </Button>
                          {loadingProfile && (
                            <span className="text-sm text-muted-foreground">
                              Loading your profile...
                            </span>
                          )}
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lock className="w-5 h-5" />
                      Change password
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">
                          Current password
                        </Label>
                        <div className="relative">
                          <Input
                            id="currentPassword"
                            type={showCurrentPassword ? "text" : "password"}
                            value={currentPassword}
                            onChange={(event) =>
                              setCurrentPassword(event.target.value)
                            }
                            placeholder="Enter current password"
                            disabled={changingPassword}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowCurrentPassword((prev) => !prev)
                            }
                            className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                            aria-label="Toggle current password visibility"
                          >
                            {showCurrentPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">New password</Label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(event) =>
                              setNewPassword(event.target.value)
                            }
                            placeholder="Create a new password"
                            disabled={changingPassword}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword((prev) => !prev)}
                            className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                            aria-label="Toggle new password visibility"
                          >
                            {showNewPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">
                          Confirm new password
                        </Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(event) =>
                              setConfirmPassword(event.target.value)
                            }
                            placeholder="Confirm new password"
                            disabled={changingPassword}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowConfirmPassword((prev) => !prev)
                            }
                            className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                            aria-label="Toggle confirm password visibility"
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <Button
                        type="submit"
                        disabled={
                          changingPassword ||
                          !currentPassword ||
                          !newPassword ||
                          !confirmPassword
                        }
                      >
                        {changingPassword ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        <span className="ml-2">
                          {changingPassword ? "Updating..." : "Update password"}
                        </span>
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </motion.main>
      </div>
    </>
  );
}
