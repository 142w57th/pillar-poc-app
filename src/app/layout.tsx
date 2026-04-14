import type { Metadata, Viewport } from "next";
import { ReactNode } from "react";

import { AppShell } from "@/components/shared/app-shell";
import { DesktopInspectorLayout } from "@/components/shared/desktop-inspector-layout";
import { Providers } from "@/lib/providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "Pillar POC App",
  description: "Mobile-first trading web app scaffold.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <DesktopInspectorLayout>
            <AppShell>{children}</AppShell>
          </DesktopInspectorLayout>
        </Providers>
      </body>
    </html>
  );
}
