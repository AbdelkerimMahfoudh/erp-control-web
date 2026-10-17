import { useEffect } from 'react';

/**
 * Sections that rise into view as the reader reaches them (2026-10-17) — and never hide anything.
 *
 * The rules this keeps:
 *  - the prerendered page is complete at rest: the resting state is the styled state, and the muted start applies
 *    only once a script runs (`html.js`);
 *  - nothing stays faint: whatever the observer has not reached is shown after a short grace period, so a slow
 *    device, a background tab or a screenshot tool sees the whole page;
 *  - reduced motion turns the whole thing off in the stylesheet (public.css).
 */
const SHOW_ALL_AFTER_MS = 700;

export function useReveal(key: string): void {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('js');
    const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]:not(.in)'));
    if (targets.length === 0) return;
    const show = (el: Element) => el.classList.add('in');
    if (!('IntersectionObserver' in window)) {
      targets.forEach(show);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            show(e.target);
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
    );
    targets.forEach((el) => io.observe(el));
    const timer = window.setTimeout(() => {
      targets.forEach(show);
      io.disconnect();
    }, SHOW_ALL_AFTER_MS);
    return () => {
      window.clearTimeout(timer);
      io.disconnect();
    };
  }, [key]);
}
