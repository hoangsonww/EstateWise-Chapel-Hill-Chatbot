"use client";

import React, { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DarkModeToggle } from "@/components/dark-mode-toggle";
import {
  BarChart3,
  Calculator,
  FileText,
  GitBranch,
  MapPin,
  MessageCircleMore,
  Settings,
  Shield,
  Users,
} from "lucide-react";

// Privacy Policy content written in Markdown
const privacyContent = `
# Privacy Policy - EstateWise App

_Last Updated: April 18th, 2025_

This Privacy Policy describes how EstateWise ("we", "us", or "our") collects, uses, shares, and safeguards your information when you use our application ("App"). By using our App, you agree to the collection and use of information in accordance with this Privacy Policy.

## 1. Information We Collect
### 1.1 Personal Information
- **Account Information:** When you create an account, we may collect your name, email address, and other information necessary to create and maintain your account.
- **Usage Data:** We may collect information about how you interact with the App, such as your messages, conversation history, and other features you use.

### 1.2 Non-Personal Information
- **Device Information:** We may collect information about your device, including browser type, operating system, and IP address.
- **Cookies & Tracking:** We use cookies and similar tracking technologies to enhance your experience and gather statistical data.

## 2. How We Use Your Information
We use your information to:
- Provide and maintain the App.
- Personalize your experience.
- Improve our services and develop new features.
- Communicate with you regarding account updates or support.
- Monitor usage of the App to ensure compliance with our Terms of Service.

## 3. Sharing Your Information
We do not sell your personal data. However, we may share your information with:
- **Service Providers:** Third-party vendors who perform services on our behalf.
- **Legal Requirements:** Authorities if required by law or in response to legal processes.
- **Business Transfers:** In the event of a merger, acquisition, or sale of all or a portion of our assets.

## 4. Data Security
We implement appropriate security measures to protect your personal information. However, no method of transmission over the Internet or method of electronic storage is 100% secure. You are responsible for keeping your account information secure.

## 5. Data Retention
We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required by law.

## 6. Your Rights
Depending on your jurisdiction, you may have the right to:
- Access, update, or delete your personal information.
- Object to or restrict certain processing of your personal data.
- Withdraw your consent at any time where applicable.

## 7. Third-Party Links
Our App may contain links to third-party websites. We are not responsible for the privacy practices of these websites. We encourage you to review their privacy policies.

## 8. Children's Privacy
Our App is not intended for children under the age of 18. We do not knowingly collect or maintain information from individuals under 18.

## 9. Changes to This Privacy Policy
We reserve the right to update our Privacy Policy at any time. The updated Privacy Policy will be posted on this page with a revised "Last Updated" date. Your continued use of the App after changes are made constitutes your acceptance of the updated policy.

## 10. Contact Us
If you have any questions about this Privacy Policy, please contact us at [hoangson091104@gmail.com](mailto:hoangson091104@gmail.com).
`;

const navLinks = [
  { href: "/chat", label: "Chat", Icon: MessageCircleMore },
  { href: "/insights", label: "Insights", Icon: GitBranch },
  { href: "/map", label: "Map", Icon: MapPin },
  { href: "/analyzer", label: "Deal Analyzer", Icon: Calculator },
  { href: "/forums", label: "Forums", Icon: Users },
  { href: "/charts", label: "Charts", Icon: BarChart3 },
  { href: "/terms", label: "Terms", Icon: FileText },
];

const PrivacyPage = () => {
  const [navMenuOpen, setNavMenuOpen] = useState(false);

  return (
    <>
      <Head>
        <title>Privacy Policy | EstateWise App</title>
        <meta
          name="description"
          content="Read the privacy policy for EstateWise App to learn how we protect your information."
        />
      </Head>
      <div className="min-h-screen bg-background text-foreground">
        <style jsx global>{`
          html {
            scroll-behavior: smooth;
          }

          html,
          body {
            overscroll-behavior: none;
          }
        `}</style>

        <header className="sticky top-0 z-30 w-full backdrop-blur-lg bg-background/90 border-b border-border">
          <div className="max-w-6xl mx-auto h-16 px-4 sm:px-6 flex items-center gap-3 w-full">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Shield className="w-6 h-6 text-primary shrink-0" />
              <span className="font-extrabold tracking-tight text-lg truncate">
                Privacy Policy
              </span>
            </div>
            <nav className="ml-auto flex items-center gap-3">
              <div className="hidden min-[1065px]:flex items-center gap-4">
                {navLinks.map(({ href, label, Icon }) => (
                  <Tooltip key={href}>
                    <TooltipTrigger asChild>
                      <Link
                        href={href}
                        className="inline-flex h-8 w-8 items-center justify-center hover:text-primary transition-colors"
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
                      className="inline-flex h-8 w-8 items-center justify-center hover:text-primary transition-colors cursor-pointer"
                      aria-label="Open navigation menu"
                      onClick={() => setNavMenuOpen((prev) => !prev)}
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Menu</TooltipContent>
                </Tooltip>
                {navMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-card rounded shadow-lg py-2 z-50">
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
            </nav>
          </div>
        </header>

        <motion.main
          className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <section className="grid gap-6 lg:grid-cols-[0.4fr_0.6fr] items-start">
            <Card className="p-6 border-border/60 bg-card/80 backdrop-blur">
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                  <Shield className="h-4 w-4" />
                  Trust center
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-2">
                    Your privacy, clarified.
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Learn what we collect, how we use it, and the controls you
                    have over your data.
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/80 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Last updated
                  </p>
                  <p className="text-sm font-semibold">April 18, 2025</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                    Key topics
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>Account, usage, and device data we collect.</li>
                    <li>How information improves search and insights.</li>
                    <li>Data sharing boundaries and legal disclosures.</li>
                    <li>Your access, deletion, and consent rights.</li>
                  </ul>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/80 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Contact
                  </p>
                  <a
                    className="text-sm font-semibold text-primary hover:underline"
                    href="mailto:hoangson091104@gmail.com"
                  >
                    hoangson091104@gmail.com
                  </a>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-border/60 bg-card/80 backdrop-blur">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  h1: ({ node, ...props }) => (
                    <h1 className="text-3xl font-bold my-4" {...props} />
                  ),
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  h2: ({ node, ...props }) => (
                    <h2 className="text-2xl font-semibold my-3" {...props} />
                  ),
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  h3: ({ node, ...props }) => (
                    <h3 className="text-xl font-semibold my-2" {...props} />
                  ),
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  p: ({ node, ...props }) => (
                    <p className="text-base my-2 leading-relaxed" {...props} />
                  ),
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  ul: ({ node, ...props }) => (
                    <ul
                      className="list-disc pl-6 my-3 space-y-2 text-base"
                      {...props}
                    />
                  ),
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  li: ({ node, ...props }) => (
                    <li className="leading-relaxed" {...props} />
                  ),
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  a: ({ ...props }: any) => (
                    <a
                      className="inline-block bg-blue-100 text-[#be6b4a] px-2 py-1 rounded-full text-sm font-medium hover:bg-blue-200 transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                      {...props}
                    >
                      {props.children}
                    </a>
                  ),
                }}
              >
                {privacyContent}
              </ReactMarkdown>
            </Card>
          </section>
        </motion.main>
      </div>
    </>
  );
};

export default PrivacyPage;
