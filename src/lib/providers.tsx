"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";

import { ApiLogProvider } from "@/lib/api-log";
import { createQueryClient } from "@/lib/query-client";
import { ThemeProvider } from "@/lib/theme";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <ApiLogProvider>{children}</ApiLogProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
