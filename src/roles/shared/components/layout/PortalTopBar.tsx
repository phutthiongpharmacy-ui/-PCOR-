import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const portalTopBarClassName =
  "portal-top-bar width-before-scroll-bar fixed left-14 right-2 top-4 z-40 flex h-14 items-center justify-between rounded-2xl border border-border bg-card px-4 shadow-sm";

export function PortalTopBar({ className, ...props }: ComponentProps<"header">) {
  return <header className={cn(portalTopBarClassName, className)} {...props} />;
}
