"use client";

import React from "react";
import Head from "next/head";
import Link from "next/link";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

const termsContent = `
# Terms of Service - Luxera Ai App

_Last Updated: April 18th, 2025_

Welcome to Luxera Ai Chat! These Terms of Service ("Terms") govern your use of our application ("App"). By accessing or using our App, you agree to be bound by these Terms. Please read them carefully.

## 1. Acceptance of Terms
By using the App, you accept these Terms in full. If you disagree with any part of these Terms, you must not use our App.

## 2. Changes to the Terms
Luxera Ai reserves the right to modify these Terms at any time. Changes will be posted on this page with an updated "Last Updated" date. Your continued use of the App after any modifications constitutes your acceptance of the new Terms.

## 3. Eligibility
You must be at least 18 years of age to use this App. By accessing or using the App, you represent and warrant that you meet the eligibility requirements.

## 4. User Accounts and Security
- **Account Responsibility:** If you create an account, you are responsible for maintaining the confidentiality of your login details.
- **Data Security:** We implement security measures to protect your data, but you are responsible for securing your own device and network.

## 5. User Content
You may submit content, including messages and other data, to the App. While you retain ownership of your content, you grant Luxera Ai a non-exclusive, irrevocable, royalty-free, worldwide license to use, reproduce, and display your content for purposes of operating and improving the App.

## 6. Prohibited Conduct
You agree not to:
- Violate any applicable laws or regulations;
- Use the App for any fraudulent or malicious purposes;
- Transmit any harmful or unauthorized content;
- Attempt to gain unauthorized access to any part of the App or its related systems.

## 7. Intellectual Property
All content, trademarks, logos, and materials on the App are the property of Luxera Ai or its licensors and are protected by applicable laws.

## 8. Disclaimer of Warranties
The App is provided "as is" and "as available" without any warranties, whether express or implied. Luxera Ai disclaims all warranties, including the implied warranties of merchantability, fitness for a particular purpose, and non-infringement.

## 9. Limitation of Liability
In no event shall Luxera Ai be liable for any indirect, incidental, or consequential damages arising from your use of the App.

## 10. Indemnification
You agree to indemnify and hold harmless Luxera Ai, its officers, employees, and agents from any claims, losses, or damages arising out of your use of the App or violation of these Terms.

## 11. Governing Law
These Terms are governed by and construed in accordance with the laws of the jurisdiction in which Luxera Ai operates.

## 12. Termination
Luxera Ai reserves the right to suspend or terminate your access to the App at any time without notice for conduct that violates these Terms or is deemed harmful.

## 13. Severability
If any provision of these Terms is found to be unenforceable or invalid, the remaining provisions will remain in full force and effect.

## 14. Responsibility
Luxera Ai provides data, analyses, and recommendations "as is" based on publicly available and user-provided information. You acknowledge that the data may contain inaccuracies or omissions and agree to waive any claims against Luxera Ai arising from such inaccuracies. You should verify all critical information independently and use the App’s data at your own risk.

## 15. Contact Information
For any questions regarding these Terms, please contact us at [hoangson091104@gmail.com](mailto:hoangson091104@gmail.com).
`;

const TermsPage = () => {
  return (
    <>
      <Head>
        <title>Terms of Service | Luxera Ai Chat</title>
        <meta
          name="description"
          content="Read the detailed Terms of Service for Luxera Ai Chat."
        />
      </Head>
      <motion.div
        className="min-h-screen flex items-center justify-center bg-background py-10 px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <style jsx global>{`
          html {
            scroll-behavior: smooth;
          }

          html,
          body {
            overscroll-behavior: none;
          }
        `}</style>
        <Card className="max-w-3xl w-full p-6">
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
          <div className="mt-8 flex justify-end">
            <Link href="/chat">
              <Button
                variant="outline"
                className="flex items-center gap-2 cursor-pointer"
                aria-label="Back to Chat"
                title="Back to Chat"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back to Chat</span>
              </Button>
            </Link>
          </div>
        </Card>
      </motion.div>
    </>
  );
};

export default TermsPage;
