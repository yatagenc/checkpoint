import { useEffect, useRef } from "react";
import { useLocation } from "react-router";

export function useRouteAccessibility() {
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
    const heading = mainRef.current?.querySelector("h1")?.textContent;
    document.title = `${heading ?? "Page not found"} — Checkpoint`;
  }, [pathname]);
  return mainRef;
}
