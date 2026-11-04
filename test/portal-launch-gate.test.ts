import { describe, expect, it } from 'vitest';
import { portalLaunch } from '../src/config/gates';

/** The portal opens only on its pinned launch configuration (owner, 2026-11-04): a deployed backend, WhatsApp only. */
describe('the portal launch configuration', () => {
  const ok = { VITE_PORTAL_BACKEND_RELEASE: '37856b3ffc35812d3dd5e49591813181012c625b', VITE_PORTAL_LAUNCH_CHANNEL: 'whatsapp', VITE_PORTAL_EMAIL_CHANNEL: 'disabled' };
  it('the exact configuration passes', () => expect(portalLaunch(ok)).toEqual([]));
  it.each([
    ['no backend release', { ...ok, VITE_PORTAL_BACKEND_RELEASE: '' }],
    ['a short commit', { ...ok, VITE_PORTAL_BACKEND_RELEASE: '37856b3' }],
    ['email as the channel', { ...ok, VITE_PORTAL_LAUNCH_CHANNEL: 'email' }],
    ['any channel', { ...ok, VITE_PORTAL_LAUNCH_CHANNEL: 'any' }],
    ['email not disabled', { ...ok, VITE_PORTAL_EMAIL_CHANNEL: 'enabled' }],
  ])('%s keeps it closed', (_l, env) => expect(portalLaunch(env).length).toBeGreaterThan(0));
});
