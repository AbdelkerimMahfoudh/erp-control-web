import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { PROTECTED_AREAS_BUILT } from '../protected-areas';
import { isProtectedPath } from '../site/routes';

/** Set by a redirect made on arrival (the stored language): the reader has not moved, so neither does the page. */
export interface ArrivalState {
  arrival: true;
}

const isArrival = (state: unknown) => (state as Partial<ArrivalState> | null)?.arrival === true;

/**
 * Where a page starts after a link inside the site (the owner's brief of 2026-10-17, fourth). The router swaps the page
 * without a reload, so the browser kept the previous page's scroll: a footer link opened its destination near the
 * bottom. Now, once the new page is in the document (a layout effect, before it is painted — no delay, no second
 * scroll, never smooth):
 *
 * - a new page (a link, or a language switch) starts at its top, focus on its heading, so the next Tab and a screen
 *   reader start in the content and not in the menu or footer that was used;
 * - an address with a section (`#…`) opens at that section, below the sticky header (`scroll-padding-top`), focus on it;
 * - Back and Forward return each page to where the reader left it. The positions are kept in memory for this visit
 *   only; on leaving the site the browser's own restoration is handed back, so a return from another site still lands
 *   where the reader was.
 *
 * Only the pathname or the section counts: a change of query alone, or the same address again, moves nothing. The
 * protected areas keep their own behaviour. Every link stays a real link, so a new tab and a page without a script are
 * the browser's own navigation, untouched.
 */
export function RouteScroll() {
  const location = useLocation();
  const action = useNavigationType();
  const positions = useRef(new Map<string, number>());
  const current = useRef({ key: location.key, place: location.pathname + location.hash, y: 0 });

  useEffect(() => {
    const manual = () => {
      history.scrollRestoration = 'manual';
    };
    const auto = () => {
      history.scrollRestoration = 'auto';
    };
    const onScroll = () => {
      current.current.y = window.scrollY;
    };
    manual();
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pagehide', auto);
    window.addEventListener('pageshow', manual);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pagehide', auto);
      window.removeEventListener('pageshow', manual);
      auto();
    };
  }, []);

  useLayoutEffect(() => {
    const before = current.current;
    const place = location.pathname + location.hash;
    if (place === before.place) return;
    positions.current.set(before.key, before.y);
    current.current = { key: location.key, place, y: before.y };
    if (PROTECTED_AREAS_BUILT && isProtectedPath(location.pathname)) return;

    // Back or Forward to a page left during this visit. A section link the browser followed itself (a plain `#…`) keeps
    // the same history key as its page and has already been scrolled by the browser.
    const saved = positions.current.get(location.key);
    if (action === 'POP' && location.key !== before.key && saved !== undefined) {
      window.scrollTo(0, saved);
      current.current.y = saved;
      return;
    }
    if (action === 'POP' && location.key === before.key) return;
    const target = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
    if (target) {
      target.scrollIntoView({ block: 'start' });
      focusWithin(target);
      return;
    }
    if (isArrival(location.state)) return;
    window.scrollTo(0, 0);
    current.current.y = 0;
    const heading = document.querySelector<HTMLElement>('#main h1');
    if (heading) focusWithin(heading);
  }, [location, action]);

  return null;
}

/** Focus without moving the page again: an element that takes no focus of its own is made programmatically focusable. */
function focusWithin(el: HTMLElement) {
  if (!el.hasAttribute('tabindex') && el.tabIndex < 0) el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
}
