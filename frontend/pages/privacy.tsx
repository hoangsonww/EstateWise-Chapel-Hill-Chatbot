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

// Privacy Policy content written in Markdown
const privacyContent = `
# Privacy Policy - Luxera Ai App

_Last Updated: April 18th, 2025_

This Privacy Policy describes how Luxera Ai ("we", "us", or "our") collects, uses, shares, and safeguards your information when you use our application ("App"). By using our App, you agree to the collection and use of information in accordance with this Privacy Policy.

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

const PrivacyPage = () => {
  return (
    <>
      <Head>
        <title>Privacy Policy | Luxera Ai App</title>
        <meta
          name="description"
          content="Read the privacy policy for Luxera Ai App to learn how we protect your information."
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
            {privacyContent}
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

export default PrivacyPage;
