export const CONSENT_KEY = 'gp:advertising-consent:v1';
export const NOTICE_VERSION = '2026-11-01';
export const AD_NOTICE = 'Meta Pixel shares page visits, cookie identifiers and technical connection data with Meta for advertising measurement. No account details, uploaded content or purchase events are sent. Accept or reject advertising tracking; change your choice in Cookie settings.';
export type Choice = { advertising: boolean; at: string; noticeVersion: string; notice: string; region: string | null };
export type ConsentRecord = { visitor: string; choices: Choice[] };
const consentRegions = new Set('AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE IS LI NO GB CH BR KR ZA TR JP IN TH ID MY MX AR CL CO PE'.split(' '));
export function requiresConsent(region: string | null) {
  return !region || !/^[A-Z]{2}$/.test(region) || region === 'XX' || region === 'T1' || consentRegions.has(region);
}
export function advertisingAllowed(region: string | null, choice: Choice | undefined, optOut: boolean) {
  if (optOut || choice?.advertising === false) return false;
  return choice?.advertising === true || !requiresConsent(region);
}
/** Public Gravity Pants marketing pages only: never the app, staff tools, Aimanté or embedded players. */
export function measurementPageAllowed(host: string, path: string) {
  return ['gravitypants.com', 'www.gravitypants.com'].includes(host) && !/^\/(app|admin|shopify|embed|api|signin|signup|reset|auth|directory|aimante)(\/|$)/.test(path);
}
export function pixelPageAllowed(host: string, path: string) {
  return measurementPageAllowed(host, path);
}
export function parseConsent(raw: string | null): ConsentRecord | null {
  try {
    const value = JSON.parse(raw ?? 'null');
    if (!value || typeof value.visitor !== 'string' || !Array.isArray(value.choices) || !value.choices.length) return null;
    if (!value.choices.every((c: Choice) => typeof c.advertising === 'boolean' && typeof c.at === 'string' && c.noticeVersion === NOTICE_VERSION && c.notice === AD_NOTICE && (c.region === null || typeof c.region === 'string'))) return null;
    return value;
  } catch { return null; }
}
export function appendChoice(record: ConsentRecord | null, advertising: boolean, region: string | null): ConsentRecord {
  return { visitor: record?.visitor ?? crypto.randomUUID(), choices: [...(record?.choices ?? []), { advertising, region, at: new Date().toISOString(), noticeVersion: NOTICE_VERSION, notice: AD_NOTICE }] };
}
let regionLookup: Promise<string | null> | undefined;
export function lookupAdRegion(): Promise<string | null> {
  regionLookup ??= fetchAdRegion();
  return regionLookup;
}
async function fetchAdRegion(): Promise<string | null> {
  try {
    const response = await fetch('/cdn-cgi/trace', { signal: AbortSignal.timeout(2000), credentials: 'same-origin' });
    if (!response.ok) return null;
    const fields = Object.fromEntries((await response.text()).split('\n').map(line => line.split('=')));
    if (fields.h !== window.location.hostname) return null;
    return /^[A-Z]{2}$/.test(fields.loc ?? '') ? fields.loc ?? null : null;
  } catch { return null; }
}