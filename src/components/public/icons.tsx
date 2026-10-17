/**
 * The public site's icons (2026-10-17): one small set of line icons, drawn here as inline SVG so the Content-Security-
 * Policy needs no image host and the colour follows the text. Every icon is decorative — the words beside it carry the
 * meaning — so each is hidden from assistive technology.
 */
export type IconName =
  | 'scan'
  | 'check-circle'
  | 'store'
  | 'notebook'
  | 'messages'
  | 'box'
  | 'coins'
  | 'lock'
  | 'users'
  | 'receipt'
  | 'undo'
  | 'wallet'
  | 'file'
  | 'phone'
  | 'swap'
  | 'globe'
  | 'shield'
  | 'help'
  | 'arrow';

const PATHS: Record<IconName, string> = {
  scan: 'M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M11 8v8M15 8v8',
  'check-circle': 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8.5 12.5l2.5 2.5 4.5-5',
  store: 'M3 10l1.5-5h15L21 10M3 10v10h18V10M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M9 20v-6h6v6',
  notebook: 'M5 4h12a2 2 0 0 1 2 2v14H5zM5 8h2M5 12h2M5 16h2M9 4v16M13 9h3',
  messages: 'M4 5h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-4 3V7a2 2 0 0 1 2-2zM20 9v6a2 2 0 0 1-2 2h-1',
  box: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 3v9M4 7.5l8 4.5 8-4.5',
  coins: 'M8 8a5 2.5 0 1 0 10 0 5 2.5 0 1 0-10 0zM8 8v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V8M3 13a5 2.5 0 0 0 5 2.5M3 13v4c0 1.4 2.2 2.5 5 2.5 1.2 0 2.3-.2 3.2-.6',
  lock: 'M6 11V8a6 6 0 0 1 12 0v3M5 11h14v10H5zM12 15v3',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM17 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20a6 6 0 0 1 12 0M15 20a5 5 0 0 1 6-4.9',
  receipt: 'M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 21zM9 8h6M9 12h6M9 16h4',
  undo: 'M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  wallet: 'M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7a2 2 0 0 1 2-2h11v2M16 13h5v4h-5a2 2 0 0 1 0-4z',
  file: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h5M10 17h5',
  phone: 'M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2',
  swap: 'M7 7h13l-3-3M17 17H4l3 3',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18',
  shield: 'M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6zM9 12l2 2 4-4',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 0 1 5 .3c0 1.6-2.5 2-2.5 3.7M12 17h.01',
  arrow: 'M5 12h14M13 6l6 6-6 6',
};

export function Icon({ name, size = 22, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={className ? `icon ${className}` : 'icon'}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
