/*
 * The Dukan interlocking-ledger mark (the owner's brand pack, 2026-10-29), inline so it takes the theme's colours
 * (`--mark-left`, `--mark-right`, `--mark-highlight` in tokens.css) in light and dark. Three named layers, as in the
 * pack; never mirrored in Arabic. Decorative here: the product's name always stands beside it.
 */
const LEFT = 'M120 176c0-39 40-65 76-50l278 117c37 16 62 52 62 93v66l83 68c21 17 21 49 0 66l-83 68v193L196 654c-46-19-76-64-76-114V176z';
const RIGHT = 'M904 176c0-39-40-65-76-50L550 243c-37 16-62 52-62 93v66l-83 68c-21 17-21 49 0 66l83 68v193l340-143c46-19 76-64 76-114V176z';

let seq = 0;

export function DukanMark({ className }: { className?: string }) {
  const id = `dukan-mark-${++seq}`;
  return (
    <svg className={className} viewBox="96 96 832 832" aria-hidden="true" focusable="false">
      <defs>
        <mask id={`${id}-l`} maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024">
          <rect width="1024" height="1024" fill="white" />
          <rect x="176" y="314" width="230" height="54" rx="27" transform="rotate(23 176 314)" fill="black" />
          <rect x="176" y="468" width="188" height="54" rx="27" transform="rotate(23 176 468)" fill="black" />
        </mask>
        <mask id={`${id}-r`} maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024">
          <rect width="1024" height="1024" fill="white" />
          <rect x="660" y="314" width="188" height="54" rx="27" transform="rotate(-23 660 314)" fill="black" />
          <rect x="660" y="468" width="188" height="54" rx="27" transform="rotate(-23 660 468)" fill="black" />
        </mask>
      </defs>
      <g id="ledger-left" className="mark-left" mask={`url(#${id}-l)`}>
        <path d={LEFT} />
      </g>
      <g id="ledger-right" className="mark-right" mask={`url(#${id}-r)`}>
        <path d={RIGHT} />
      </g>
      <g id="interlock-highlight" className="mark-highlight" fill="none" strokeWidth="18" strokeLinecap="round">
        <path d="M467 451l45 37 45-37" />
      </g>
    </svg>
  );
}
