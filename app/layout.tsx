import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Footer from "./components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'Unemployed Club — AI-Powered Career Platform',
  description:
    'Build ATS-friendly resumes, generate cover letters, ace interviews and find jobs — all in one place. Leave the club faster with Unemployed Club.',
  keywords:
    'resume builder, ATS checker, cover letter generator, interview prep, job board, AI resume, career tools',
  verification: {
    google: 'n_K5Kf3Vx6D9xDjoXSKibLJsscwWVsB7PQpSxtpA_UI',
  },
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/apple-touch-icon.png',
  },
  metadataBase: new URL('https://unemployedclub.com'),
  openGraph: {
    title: 'Unemployed Club — AI-Powered Career Platform',
    description:
      'Build ATS-friendly resumes, generate cover letters, ace interviews and find jobs — all in one place.',
    url: 'https://unemployedclub.com',
    siteName: 'Unemployed Club',
    images: [{ url: 'https://unemployedclub.com/logo.png', width: 800, height: 600 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Unemployed Club — AI-Powered Career Platform',
    description:
      'Build ATS-friendly resumes, generate cover letters, ace interviews and find jobs — all in one place.',
    images: ['https://unemployedclub.com/logo.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col overflow-x-hidden bg-white text-[#0f172a] antialiased`}
      >
        <div className="flex-1">
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}
