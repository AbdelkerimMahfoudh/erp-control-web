import { useEffect } from 'react';

/**
 * Cards that appear as the reader reaches them — the Balanced treatment the owner approved on 2026-10-18 (the motion
 * values are `--dur-enter`, `--ease-enter`, `--rise` and `--stagger` in global.css) — and never hide anything.
 *
 * The rules this keeps:
 *  - the prerendered page is complete at rest. Cards are lowered and transparent only once this script has set up its
 *    observer and marked the document `reveal-ready`: without a script, with no IntersectionObserver, or if the set-up
 *    throws, nothing is ever hidden;
 *  - what is already on screen when the page arrives stays as it is (it was painted already, so it does not blink);
 *    what is above the screen is shown at once; the rest appears once, as it enters, and never again on the way back;
 *  - cards that enter together follow one another by `--stagger` (75 ms), in document order, five at most
 *    (`data-reveal-order` 0–4, so 300 ms at the most). The order is an attribute, not an inline style, for the CSP;
 *  - reduced motion — at load or switched on while the page is open — shows every card at rest, without movement
 *    (public.css); printing shows everything.
 */
const STAGGER_STEPS = 4;

export function useReveal(key: string): void {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('js');
    const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]:not(.in)'));
    if (targets.length === 0) return;
    const show = (el: Element, order: number) => {
      el.setAttribute('data-reveal-order', String(Math.min(order, STAGGER_STEPS)));
      el.classList.add('in');
    };
    if (!('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('in'));
      return;
    }
    // A card whose top is above the bottom of the screen has been seen, or is being seen: it is shown as it is.
    const isReached = (rect: DOMRectReadOnly) => rect.top < window.innerHeight;
    let io: IntersectionObserver;
    try {
      const firstPaint = !root.classList.contains('reveal-ready');
      for (const el of targets) if (firstPaint && isReached(el.getBoundingClientRect())) el.classList.add('in');
      io = new IntersectionObserver(
        (entries) => {
          const entering = entries.filter((e) => e.isIntersecting || e.boundingClientRect.bottom <= 0).map((e) => e.target);
          entering.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
          entering.forEach((el, i) => {
            io.unobserve(el);
            show(el, i);
          });
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0 },
      );
      targets.filter((el) => !el.classList.contains('in')).forEach((el) => io.observe(el));
    } catch {
      targets.forEach((el) => el.classList.add('in'));
      return;
    }
    root.classList.add('reveal-ready');
    return () => io.disconnect();
  }, [key]);
}
