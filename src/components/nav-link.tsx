"use client";

// Every in-app link carries the direction of its move, so the page change runs as iOS runs it (owner 2026-11-19,
// "the animation still looks total crap"): deeper is a push, the new screen sliding over the old one while the old
// one drifts back, shallower is a pop, a move between sections is a short crossfade. layout.tsx maps the type to
// the View Transition classes in globals.css.

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

export type NavType = "push" | "pop" | "tab";
const depth = (p: string) => p.split(/[?#]/)[0].split("/").filter(Boolean).length;
const top = (p: string) => p.split("/").filter(Boolean)[0] ?? "";
const family = (s: string) => (s === "clients" ? "search" : s);

export function navType(from: string, to: string): NavType {
  if (depth(to) > depth(from)) return "push";
  if (depth(to) < depth(from)) return family(top(to)) === family(top(from)) || depth(to) === 0 ? "pop" : "tab";
  return "tab";
}

export default function Link({ transitionTypes, ...props }: ComponentProps<typeof NextLink>) {
  const path = usePathname();
  const href = typeof props.href === "string" ? props.href : props.href.pathname ?? "";
  return <NextLink {...props} transitionTypes={transitionTypes ?? [navType(path, href)]} />;
}
