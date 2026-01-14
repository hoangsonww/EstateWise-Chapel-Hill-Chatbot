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

const termsContent = `
# Terms of Service - EstateWise App

_Last Updated: April 18th, 2025_

Welcome to EstateWise Chat! These Terms of Service ("Terms") govern your use of our application ("App"). By accessing or using our App, you agree to be bound by these Terms. Please read them carefully.

## 1. Acceptance of Terms
By using the App, you accept these Terms in full. If you disagree with any part of these Terms, you must not use our App.

## 2. Changes to the Terms
EstateWise reserves the right to modify these Terms at any time. Changes will be posted on this page with an updated "Last Updated" date. Your continued use of the App after any modifications constitutes your acceptance of the new Terms.

## 3. Eligibility
You must be at least 18 years of age to use this App. By accessing or using the App, you represent and warrant that you meet the eligibility requirements.

## 4. User Accounts and Security
- **Account Responsibility:** If you create an account, you are responsible for maintaining the confidentiality of your login details.
- **Data Security:** We implement security measures to protect your data, but you are responsible for securing your own device and network.

## 5. User Content
You may submit content, including messages and other data, to the App. While you retain ownership of your content, you grant EstateWise a non-exclusive, irrevocable, royalty-free, worldwide license to use, reproduce, and display your content for purposes of operating and improving the App.

## 6. Prohibited Conduct
You agree not to:
- Violate any applicable laws or regulations;
- Use the App for any fraudulent or malicious purposes;
- Transmit any harmful or unauthorized content;
- Attempt to gain unauthorized access to any part of the App or its related systems.

## 7. Intellectual Property
All content, trademarks, logos, and materials on the App are the property of EstateWise or its licensors and are protected by applicable laws.

## 8. Disclaimer of Warranties
The App is provided "as is" and "as available" without any warranties, whether express or implied. EstateWise disclaims all warranties, including the implied warranties of merchantability, fitness for a particular purpose, and non-infringement.

## 9. Limitation of Liability
In no event shall EstateWise be liable for any indirect, incidental, or consequential damages arising from your use of the App.

## 10. Indemnification
You agree to indemnify and hold harmless EstateWise, its officers, employees, and agents from any claims, losses, or damages arising out of your use of the App or violation of these Terms.

## 11. Governing Law
These Terms are governed by and construed in accordance with the laws of the jurisdiction in which EstateWise operates.

## 12. Termination
EstateWise reserves the right to suspend or terminate your access to the App at any time without notice for conduct that violates these Terms or is deemed harmful.

## 13. Severability
If any provision of these Terms is found to be unenforceable or invalid, the remaining provisions will remain in full force and effect.

## 14. Responsibility
EstateWise provides data, analyses, and recommendations "as is" based on publicly available and user-provided information. You acknowledge that the data may contain inaccuracies or omissions and agree to waive any claims against EstateWise arising from such inaccuracies. You should verify all critical information independently and use the App’s data at your own risk.

## 15. Contact Information
For any questions regarding these Terms, please contact us at [hoangson091104@gmail.com](mailto:hoangson091104@gmail.com).
`;

const navLinks = [
  { href: "/chat", label: "Chat", Icon: MessageCircleMore },
  { href: "/insights", label: "Insights", Icon: GitBranch },
  { href: "/map", label: "Map", Icon: MapPin },
  { href: "/analyzer", label: "Deal Analyzer", Icon: Calculator },
  { href: "/forums", label: "Forums", Icon: Users },
  { href: "/charts", label: "Charts", Icon: BarChart3 },
  { href: "/privacy", label: "Privacy", Icon: Shield },
];

const TermsPage = () => {
  const [navMenuOpen, setNavMenuOpen] = useState(false);

  return (
    <>
      <Head>
        <title>Terms of Service | EstateWise Chat</title>
        <meta
          name="description"
          content="Read the detailed Terms of Service for EstateWise Chat."
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
              <FileText className="w-6 h-6 text-primary shrink-0" />
              <span className="font-extrabold tracking-tight text-lg truncate">
                Terms of Service
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
                  <FileText className="h-4 w-4" />
                  Legal overview
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-2">
                    Clear terms for using EstateWise.
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    These terms outline the responsibilities, limitations, and
                    expectations for using our app and insights.
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
                    Key sections
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>
                      Eligibility, account responsibilities, and security.
                    </li>
                    <li>Acceptable use and prohibited conduct.</li>
                    <li>IP ownership, warranties, and liability limits.</li>
                    <li>Termination terms and governing law.</li>
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
                {termsContent}
              </ReactMarkdown>
            </Card>
          </section>
        </motion.main>
      </div>
    </>
  );
};

export default TermsPage;
