"use client";

import React from "react";
import Head from "next/head";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, MessageSquare } from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      when: "beforeChildren",
    },
  },
};

const titleVariants = {
  hidden: { y: 0, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.8, ease: "easeOut" },
  },
};

const subtitleVariants = {
  hidden: { y: 0, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.8, ease: "easeOut", delay: 0.4 },
  },
};

const bounceVariants = {
  animate: {
    y: [0, -20, 0],
    transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut" },
  },
};

const buttonVariants = {
  hover: {
    scale: 1.05,
    transition: { duration: 0.3, ease: "easeInOut" },
  },
};

export default function NotFoundPage() {
  return (
    <>
      <Head>
        <title>Luxera Ai | Page Not Found</title>
        <meta
          name="description"
          content="Oops! The page you are looking for was not found. Please return to Luxera Ai to continue your journey."
        />
      </Head>
      <motion.div
        className="min-h-screen flex flex-col items-center justify-center animated-gradient text-white px-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
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
        `}</style>

        <motion.h1
          className="text-6xl md:text-8xl font-extrabold mb-4 text-center drop-shadow-lg"
          variants={titleVariants}
          animate={{ ...titleVariants.visible, scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          404
        </motion.h1>

        <motion.p
          variants={subtitleVariants}
          className="text-xl md:text-2xl mb-8 text-center max-w-xl drop-shadow-sm"
        >
          Oops! We couldn’t find the page you’re looking for.
        </motion.p>

        <motion.div
          variants={bounceVariants}
          animate="animate"
          className="mb-8"
        >
          <AlertTriangle className="w-16 h-16" />
        </motion.div>

        <motion.div variants={buttonVariants} whileHover="hover">
          <Link
            href="/chat"
            className="flex items-center gap-2 px-8 py-4 border border-white rounded-full text-lg font-medium transition-colors hover:bg-white hover:text-purple-600"
          >
            <MessageSquare className="w-5 h-5" />
            Back to Chat
          </Link>
        </motion.div>
      </motion.div>
    </>
  );
}
