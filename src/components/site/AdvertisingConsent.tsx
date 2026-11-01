import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { AD_NOTICE, CONSENT_KEY, advertisingAllowed, appendChoice, lookupAdRegion, parseConsent, pixelPageAllowed, requiresConsent } from '@/lib/site/ad-consent';
import { revokePixel, trackPixelPage } from '@/lib/site/meta-pixel';

export function AdvertisingConsent({ pathname }: { pathname: string }) {
  const [ready, setReady] = useState(false);
  const [region, setRegion] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState(false);
  const [eligible, setEligible] = useState(false);
  useEffect(() => {
    const allowed = pixelPageAllowed(window.location.hostname, pathname);
    setEligible(allowed);
    if (!allowed) { revokePixel(); return; }
    let active = true;
    void lookupAdRegion().then(value => { if (active) { setRegion(value); setReady(true); } });
    return () => { active = false; };
  }, [pathname]);
  useEffect(() => {
    const onStorage = (event: StorageEvent) => { if (event.key === CONSENT_KEY) setRevision(n => n + 1); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  useEffect(() => {
    if (!ready || !eligible) return;
    let record;
    try { record = parseConsent(localStorage.getItem(CONSENT_KEY)); } catch { revokePixel(); setOpen(true); return; }
    const choice = record?.choices.at(-1);
    const optOut = (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true || navigator.doNotTrack === '1';
    if (advertisingAllowed(region, choice, optOut)) trackPixelPage(pathname); else revokePixel();
    if (!choice && requiresConsent(region)) setOpen(true);
  }, [ready, eligible, region, revision, pathname]);
  function choose(accept: boolean) {
    try {
      const record = appendChoice(parseConsent(localStorage.getItem(CONSENT_KEY)), accept, region);
      localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
      if (!accept) revokePixel();
      setError(false); setOpen(false); setRevision(n => n + 1);
    } catch { revokePixel(); setError(true); }
  }
  if (!ready || !eligible) return null;
  return <>
    <Button variant="plain" size="sm" data-cta="cookie-settings" className="fixed bottom-3 left-3 z-[130] shadow-card" onClick={() => setOpen(true)}>Cookie settings</Button>
    {open && <section role="dialog" aria-label="Advertising privacy" aria-modal="false" className="fixed inset-x-3 bottom-14 z-[130] mx-auto max-w-xl rounded-md border border-border bg-card p-5 text-foreground shadow-popover">
      <h2 className="text-lg font-semibold">Advertising privacy</h2>
      <p className="mt-2 text-sm leading-relaxed text-secondary-text">{AD_NOTICE}</p>
      <Link to="/privacy" data-cta="advertising-privacy-policy" className="mt-2 inline-block text-sm text-link underline">Privacy policy</Link>
      {error && <p role="alert" className="mt-2 text-sm text-destructive">Your choice could not be saved. Advertising tracking remains off.</p>}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button variant="plain" data-cta="advertising-reject" onClick={() => choose(false)}>Reject</Button>
        <Button variant="plain" data-cta="advertising-accept" onClick={() => choose(true)}>Accept</Button>
      </div>
      <Button variant="link" size="sm" className="mt-2" data-cta="advertising-close" onClick={() => setOpen(false)}>Close</Button>
    </section>}
  </>;
}