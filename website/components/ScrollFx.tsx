"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/*
 * Restrained below-fold reveal: sections start visible by default (no JS, no
 * motion preference → nothing hidden); only sections below the first viewport
 * get the rise-and-fade on entry.
 */
export default function ScrollFx() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("main section")
    );
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("fx-in");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.08 }
    );

    for (const section of sections) {
      if (section.getBoundingClientRect().top > window.innerHeight * 0.85) {
        section.classList.add("fx-pending");
        observer.observe(section);
      }
    }

    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
