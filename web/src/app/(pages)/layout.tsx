import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Caveat } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains",
});

const caveat = Caveat({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-hand",
});

export const metadata: Metadata = {
  title: "Squad Draw",
  description: "Collaborative drawing platform",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} ${caveat.variable} font-sans antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster
            richColors
            position="top-right"
            duration={3000}
            expand={false}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
