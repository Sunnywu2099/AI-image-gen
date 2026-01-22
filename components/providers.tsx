"use client";

import { ThemeProvider } from "next-themes";
import { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import type { AbstractIntlMessages } from "next-intl";
import { Toaster } from "@/components/ui/toaster";

export function ThemeProviders({ children, messages, locale = 'en' }: { children: ReactNode; messages: AbstractIntlMessages; locale?: string }) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        {children}
        <Toaster />
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
