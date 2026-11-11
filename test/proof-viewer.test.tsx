import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProofViewer } from '../src/components/ProofViewer';
import { I18nProvider } from '../src/i18n';
import { en } from '../src/i18n/en';
import { contentSecurityPolicy } from '../src/site/generated';

/*
 * 0136 (owner, 2026-11-11): the administrator sees the proof before deciding: an image inline with zoom and a full-size
 * view, a PDF in the browser's viewer, any other type named with a download; always the latest revision; fetched with
 * the session's credentials and shown from memory.
 */
let served: { status: number; type: string; body: BlobPart } = { status: 200, type: 'image/png', body: new Uint8Array([0x89, 0x50]) };
const asked: { url: string; init?: RequestInit }[] = [];

beforeEach(() => {
  asked.length = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      asked.push({ url: String(input), init });
      if (served.status !== 200) return new Response(JSON.stringify({ message: 'Unknown proof' }), { status: served.status, headers: { 'Content-Type': 'application/json' } });
      return new Response(served.body as BodyInit, { status: 200, headers: { 'Content-Type': served.type } });
    }),
  );
  Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:proof-1'), revokeObjectURL: vi.fn() });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const view = (revision = 1) =>
  render(
    <I18nProvider fixed="en">
      <ProofViewer path="platform/payment-proofs/p-1/file" revision={revision} fileName="Screenshot 06.43.png" downloadHref="https://api.example/platform/payment-proofs/p-1/file" />
    </I18nProvider>,
  );

describe('a payment proof in the console', () => {
  it('an image: inline, fitted, zoomed on a press, a full-size view and a separate download — fetched with credentials', async () => {
    served = { status: 200, type: 'image/png', body: new Uint8Array([0x89, 0x50]) };
    view();
    const img = (await screen.findByRole('img', { name: en['admin.proofs.imageAlt'] })) as HTMLImageElement;
    expect(img.src).toBe('blob:proof-1');
    expect(asked[0]!.url).toMatch(/platform\/payment-proofs\/p-1\/file\?r=1$/);
    expect(asked[0]!.init?.credentials).toBe('include');
    const zoom = screen.getByRole('button', { name: en['admin.proofs.zoomIn'] });
    fireEvent.click(zoom);
    expect(screen.getByRole('button', { name: en['admin.proofs.zoomOut'] }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('link', { name: en['admin.proofs.fullSize'] }).getAttribute('href')).toBe('blob:proof-1');
    expect(screen.getByRole('link', { name: en['admin.proofs.download'] }).getAttribute('href')).toBe('https://api.example/platform/payment-proofs/p-1/file');
    expect(screen.getByText('Screenshot 06.43.png')).toBeTruthy();
  });

  it('a PDF: in the browser’s viewer', async () => {
    served = { status: 200, type: 'application/pdf', body: '%PDF-1.7' };
    view();
    const frame = await screen.findByTitle(en['admin.proofs.pdfTitle']);
    expect(frame.tagName).toBe('IFRAME');
    expect(frame.getAttribute('src')).toBe('blob:proof-1');
  });

  it('another type: named, with a download — never shown', async () => {
    served = { status: 200, type: 'application/octet-stream', body: 'GIF89a' };
    view();
    expect(await screen.findByText(en['admin.proofs.unsupported'].replace('{type}', 'application/octet-stream'))).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByRole('link', { name: en['admin.proofs.download'] })).toBeTruthy();
  });

  it('a correction: the latest revision is fetched again; a refusal is shown, with the download kept', async () => {
    served = { status: 200, type: 'image/png', body: new Uint8Array([0x89]) };
    const r = view(1);
    await screen.findByRole('img');
    r.rerender(
      <I18nProvider fixed="en">
        <ProofViewer path="platform/payment-proofs/p-1/file" revision={2} fileName="new.png" downloadHref="x" />
      </I18nProvider>,
    );
    await waitFor(() => expect(asked.some((a) => a.url.endsWith('?r=2'))).toBe(true));
    cleanup();
    served = { status: 404, type: '', body: '' };
    view(3);
    expect(await screen.findByText('Unknown proof')).toBeTruthy();
    expect(screen.getByRole('link', { name: en['admin.proofs.download'] })).toBeTruthy();
  });

  it('the signed-in builds allow a proof from memory (blob:) as an image or a frame; the public site does not', () => {
    const admin = contentSecurityPolicy({ apiBase: 'https://api.tsxmr.com/api/v1', siteSurface: 'admin' } as never);
    expect(admin).toContain("img-src 'self' data: blob:");
    expect(admin).toContain("frame-src 'self' blob:");
    expect(admin).toContain("frame-ancestors 'none'");
    const site = contentSecurityPolicy({ apiBase: '', siteSurface: 'public' } as never);
    expect(site).not.toContain('blob:');
    expect(readFileSync('src/pages/admin/Proofs.tsx', 'utf8')).toMatch(/<ProofViewer/);
  });
});
