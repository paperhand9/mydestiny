// src/components/ClientFontWrapper.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function ClientFontWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      {children}
    </div>
  );
}


