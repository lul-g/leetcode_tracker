"use client";

import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListChecks,
  Target,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

/** Pages grouped by what they answer: the pick-your-own overview, the problem log, how you're doing, and what you need next. */
export const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/problems", label: "Problems", icon: ListChecks },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/targets", label: "Targets", icon: Target },
];

export function useActive() {
  const path = usePathname();
  return (href: string) =>
    href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
}
