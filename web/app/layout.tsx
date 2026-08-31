import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { AppDiagnosticsInit } from "@/components/app-diagnostics/AppDiagnosticsInit";
import { SITE_NAME, SITE_URL } from "@/lib/seo/site";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: "Interactive English learning for kids — lessons, activities, and teaching tools.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${nunito.variable} h-full`}>
      <body className="min-h-full font-sans antialiased">
        <AppDiagnosticsInit />
        {children}
      </body>
    </html>
  );
}
