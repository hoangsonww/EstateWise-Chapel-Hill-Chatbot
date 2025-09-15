import Head from "next/head";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What is EstateWise?",
    answer:
      "EstateWise is an AI-powered assistant that helps you discover properties in Chapel Hill.",
  },
  {
    question: "How do I start chatting?",
    answer:
      "Create an account, then head over to the chat page to begin asking about properties.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Yes, we take privacy seriously and only use your data to personalize your experience.",
  },
];

export default function FAQPage() {
  return (
    <>
      <Head>
        <title>FAQ - EstateWise</title>
      </Head>
      <main className="max-w-3xl mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">Frequently Asked Questions</h1>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent>{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </main>
    </>
  );
}

