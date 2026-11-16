import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Sans } from "next/font/google";
import "@xyflow/react/dist/style.css";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

const instrumentSansHeading = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Microservices Architecture Playground & Observability Laboratory",
  description:
    "Interactive distributed systems simulator with NGINX reverse proxy, live request animation, load generator, and chaos engineering",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        instrumentSansHeading.variable
      )}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
