"use client";

import React, { useState, useRef } from "react";
import Head from "next/head";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Chart from "chart.js/auto";

const MortgageCalculatorPage = () => {
  const [homePrice, setHomePrice] = useState(300000);
  const [downPayment, setDownPayment] = useState(60000);
  const [rate, setRate] = useState(6);
  const [years, setYears] = useState(30);
  const [monthly, setMonthly] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  const calculate = () => {
    const principal = homePrice - downPayment;
    const monthlyRate = rate / 100 / 12;
    const n = years * 12;
    const monthlyPayment =
      (principal * (monthlyRate * Math.pow(1 + monthlyRate, n))) /
      (Math.pow(1 + monthlyRate, n) - 1);
    setMonthly(monthlyPayment);

    const schedule: { year: number; interest: number; principal: number }[] =
      [];
    let balance = principal;
    for (let y = 1; y <= years; y++) {
      let interestPaid = 0;
      let principalPaid = 0;
      for (let m = 0; m < 12; m++) {
        const interest = balance * monthlyRate;
        const principalPart = monthlyPayment - interest;
        interestPaid += interest;
        principalPaid += principalPart;
        balance -= principalPart;
      }
      schedule.push({
        year: y,
        interest: interestPaid,
        principal: principalPaid,
      });
    }

    if (chartRef.current) {
      chartRef.current.destroy();
    }
    if (canvasRef.current) {
      chartRef.current = new Chart(canvasRef.current, {
        type: "bar",
        data: {
          labels: schedule.map((s) => `Year ${s.year}`),
          datasets: [
            {
              label: "Principal",
              data: schedule.map((s) => s.principal),
              backgroundColor: "#4ade80",
            },
            {
              label: "Interest",
              data: schedule.map((s) => s.interest),
              backgroundColor: "#f87171",
            },
          ],
        },
        options: {
          responsive: true,
          scales: {
            x: { stacked: true },
            y: { stacked: true },
          },
        },
      });
    }
  };

  return (
    <>
      <Head>
        <title>Mortgage Calculator | EstateWise</title>
        <meta
          name="description"
          content="Interactive mortgage payment calculator with amortization chart"
        />
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-background py-10 px-4">
        <Card className="max-w-3xl w-full p-6">
          <CardHeader>
            <CardTitle>Mortgage Calculator</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Home Price</Label>
                <Input
                  id="price"
                  type="number"
                  value={homePrice}
                  onChange={(e) => setHomePrice(Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="down">Down Payment</Label>
                <Input
                  id="down"
                  type="number"
                  value={downPayment}
                  onChange={(e) => setDownPayment(Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="rate">Interest Rate (%)</Label>
                <Input
                  id="rate"
                  type="number"
                  step="0.01"
                  value={rate}
                  onChange={(e) => setRate(Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="years">Term (Years)</Label>
                <Input
                  id="years"
                  type="number"
                  value={years}
                  onChange={(e) => setYears(Number(e.target.value))}
                />
              </div>
            </div>
            <Button onClick={calculate} className="mt-2">
              Calculate
            </Button>
            {monthly && (
              <p className="text-xl font-semibold">
                Monthly Payment: ${monthly.toFixed(2)}
              </p>
            )}
            <canvas ref={canvasRef} className="mt-4 h-64" />
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default MortgageCalculatorPage;
