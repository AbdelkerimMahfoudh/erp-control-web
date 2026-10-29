import { render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ProductMark } from '../src/components/public/blocks';
import { webManifest } from '../src/site/generated';

/*
 * The Dukan ledger mark on the web (the owner's brand pack, 2026-10-29): the product's placements wear it, in the
 * theme's colours; the portal's tab and home-screen icons are Dukan's; the company site keeps the company's own.
 */
const root = join(__dirname, '..');

describe('the product mark', () => {
  it('is the ledger with its three named layers, and no letter tile', () => {
    const { container } = render(<ProductMark />);
    const svg = container.querySelector('svg.product-mark-symbol')!;
    expect(svg).toBeTruthy();
    for (const id of ['ledger-left', 'ledger-right', 'interlock-highlight']) expect(svg.querySelector(`#${id}`)).toBeTruthy();
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(container.textContent).toBe('Dukan ERP');
  });

  it('takes its colours from the theme tokens, light and dark', () => {
    const tokens = readFileSync(join(root, 'src/theme/tokens.css'), 'utf8');
    const light = tokens.slice(tokens.indexOf(':root {'), tokens.indexOf(":root[data-theme='dark']"));
    const dark = tokens.slice(tokens.indexOf(":root[data-theme='dark']"));
    expect(light).toMatch(/--mark-left: #172033;/);
    expect(light).toMatch(/--mark-right: #5146d9;/);
    expect(dark).toMatch(/--mark-left: #e7ecf5;/);
    expect(dark).toMatch(/--mark-right: #8b82ef;/);
    const css = readFileSync(join(root, 'src/theme/public.css'), 'utf8');
    expect(css).toMatch(/\.product-mark-symbol \.mark-left \{\s*fill: var\(--mark-left\);/);
  });
});

describe('icons', () => {
  it('the portal manifest is Dukan’s; the company site keeps its own', () => {
    const portal = JSON.parse(webManifest({ displayName: 'TSX-MR', siteSurface: 'portal' } as never, '#000', '#fff'));
    expect(portal.icons.map((i: { src: string }) => i.src)).toEqual(['/icons/dukan-icon.svg', '/icons/dukan-icon-192.png', '/icons/dukan-icon-512.png']);
    const site = JSON.parse(webManifest({ displayName: 'TSX-MR', siteSurface: 'public' } as never, '#000', '#fff'));
    expect(site.icons[0].src).toBe('/icons/icon.svg');
  });

  it('the Dukan touch and manifest icons are opaque: RGB, no alpha channel', () => {
    for (const f of ['dukan-apple-touch-icon.png', 'dukan-icon-192.png', 'dukan-icon-512.png']) {
      expect(readFileSync(join(root, 'public/icons', f))[25], f).toBe(2);
    }
    expect(readFileSync(join(root, 'public/icons/dukan-icon.svg'), 'utf8')).not.toMatch(/<text/);
  });

  it('a portal build points its page at the Dukan icons', () => {
    const config = readFileSync(join(root, 'vite.config.ts'), 'utf8');
    expect(config).toMatch(/portalIcons\(mode\)/);
    expect(config).toMatch(/'\/icons\/icon\.svg', '\/icons\/dukan-icon\.svg'/);
  });
});
