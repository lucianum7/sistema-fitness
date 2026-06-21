import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sistema Fitness | Treinos, dieta e evolução",
  description:
    "Sistema Fitness organiza treinos, alimentação, hidratação, sono e evolução corporal em uma experiência rápida e responsiva.",
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Sistema Fitness", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png" }],
  },
  openGraph: {
    title: "Sistema Fitness",
    description: "Sistema para rotina fitness, planos de treino, alimentação e acompanhamento corporal.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f8f6a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <ThemeProvider>{children}</ThemeProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
