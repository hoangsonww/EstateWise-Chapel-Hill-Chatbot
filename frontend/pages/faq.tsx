"use client";

import React from "react";
import Head from "next/head";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { ChevronLeft } from "lucide-react";

const faqs = [
  {
    question: "What is EstateWise?",
    answer:
      "EstateWise is an AI-powered platform that helps you explore property listings in Chapel Hill with a conversational chatbot.",
  },
  {
    question: "How do I interact with the chatbot?",
    answer:
      "After creating an account, navigate to the chat page to start a conversation and receive personalized recommendations.",
  },
  {
    question: "Is my data secure?",
    answer:
      "We value your privacy and protect your data as outlined in our Privacy Policy.",
  },
];

const FaqPage = () => {
  return (
    <>
      <Head>
        <title>FAQ | EstateWise App</title>
        <meta
          name="description"
          content="Answers to frequently asked questions about the EstateWise App"
        />
      </Head>
      <motion.div
        className="min-h-screen flex items-center justify-center bg-background py-10 px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="max-w-3xl w-full p-6">
          <h1 className="text-3xl font-bold mb-6 text-center">
            Frequently Asked Questions
          </h1>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((item, index) => (
              <AccordionItem value={`item-${index}`} key={index}>
                <AccordionTrigger>{item.question}</AccordionTrigger>
                <AccordionContent>{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <div className="mt-8 flex justify-end">
            <Link href="/">
              <Button
                variant="outline"
                className="flex items-center gap-2 cursor-pointer"
                aria-label="Back to Home"
                title="Back to Home"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back Home</span>
              </Button>
            </Link>
          </div>
        </Card>
      </motion.div>
    </>
  );
};

export default FaqPage;

