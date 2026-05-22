import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase-server";
import { BottomNav } from "@/components/layout/BottomNav";
import { WC_TOURNAMENT_ID } from "@/lib/wc2026-groups";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "predictr",
  description: "Predict. Compete. Brag.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let firstLeagueId: string | null = null
  if (user) {
    const { data } = await supabase
      .from('league_members')
      .select('league_id')
      .eq('user_id', user.id)
      .limit(1)
      .single()
    firstLeagueId = data?.league_id ?? null
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col overflow-x-hidden">
        <div className={user ? 'pb-16' : ''}>
          {children}
        </div>
        {user && (
          <BottomNav
            tournamentId={WC_TOURNAMENT_ID}
            firstLeagueId={firstLeagueId}
          />
        )}
      </body>
    </html>
  );
}
