"use client";

import { ReactNode, useEffect, useState } from "react";

import { ApiSequencePanel } from "@/components/api-inspector/api-sequence-panel";

const DESKTOP_QUERY = "(min-width: 1024px)";

type DesktopInspectorLayoutProps = {
  children: ReactNode;
};

export function DesktopInspectorLayout({ children }: DesktopInspectorLayoutProps) {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY);
    setIsDesktop(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  if (!isDesktop) {
    return <>{children}</>;
  }

  return (
    <div className="desktop-inspector-wrapper flex h-svh w-full items-stretch overflow-hidden">
      <div className="flex shrink-0 items-center justify-center p-6 pl-8">
        <div
          className="mobile-frame relative flex h-[calc(100svh-48px)] w-[430px] flex-col overflow-hidden rounded-[2.5rem] border-[3px] shadow-2xl"
          style={{ transform: "translateZ(0)" }}
        >
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {children}
          </div>
        </div>
      </div>

      <div className="inspector-panel-wrapper flex min-w-0 flex-1 flex-col">
        <ApiSequencePanel />
      </div>
    </div>
  );
}
