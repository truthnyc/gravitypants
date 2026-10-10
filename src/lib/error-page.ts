type ErrorPageOptions = { host?: string | null };

function isAimanteHost(host: string | null | undefined): boolean {
  const hostname = (host ?? "").toLowerCase().split(":")[0];
  return hostname === "aimante.co" || hostname === "www.aimante.co";
}

export function renderErrorPage({ host }: ErrorPageOptions = {}): string {
  const aimante = isAimanteHost(host);
  const brand = aimante ? "Aimanté" : "Gravity Pants";
  const copyright = aimante ? "Aimanté.co. All rights reserved." : "Gravity Pants";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>We’ll be right back — ${brand}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="robots" content="noindex" />
    <style>
      :root { color-scheme: light; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", system-ui, sans-serif; color: #1d1d1f; background: #fff; }
      * { box-sizing: border-box; }
      body { min-height: 100vh; margin: 0; display: flex; flex-direction: column; background: #fff; }
      header { border-bottom: 1px solid #e5e5ea; }
      .header-inner, .content, .footer-inner { width: min(1280px, 100%); margin: 0 auto; }
      .header-inner { height: 64px; display: flex; align-items: center; padding: 0 32px; }
      .aimante { font-size: 28px; line-height: 1; font-weight: 600; letter-spacing: -.035em; }
      .gp { display: inline-flex; align-items: center; gap: 9px; font-size: 17px; font-weight: 600; letter-spacing: -.02em; }
      .mark { position: relative; width: 28px; height: 28px; overflow: hidden; border-radius: 7px; background: #0071e3; }
      .mark::before, .mark::after { content: ""; position: absolute; top: 8px; width: 10px; height: 10px; border: 3px solid #fff; border-radius: 50%; }
      .mark::before { left: 4px; } .mark::after { right: 4px; }
      .content { flex: 1; display: flex; align-items: center; padding: 64px 32px; }
      .copy { max-width: 620px; }
      .status { display: flex; align-items: center; gap: 8px; margin: 0 0 32px; color: #57575c; font-size: 13px; font-weight: 500; }
      .dot { width: 8px; height: 8px; border-radius: 50%; background: #b25000; }
      h1 { max-width: 560px; margin: 0; font-size: clamp(42px, 5vw, 58px); line-height: 1.08; letter-spacing: -.035em; font-weight: 600; }
      p { max-width: 520px; margin: 20px 0 0; color: #57575c; font-size: 17px; line-height: 1.6; }
      .actions { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; margin-top: 32px; }
      button, .home { min-height: 50px; padding: 0 28px; border-radius: 8px; font: inherit; font-size: 15px; font-weight: 500; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; }
      button { border: 1px solid #0071e3; color: #fff; background: #0071e3; }
      button:hover { background: #0077ed; }
      .home { border: 1px solid #e5e5ea; color: #1d1d1f; background: #fff; }
      .home:hover { background: #f5f5f7; }
      .service { display: inline-flex; margin-top: 40px; color: #0071e3; font-size: 14px; text-decoration: none; }
      .service:hover { text-decoration: underline; }
      footer { border-top: 1px solid #e5e5ea; color: #6e6e73; font-size: 12px; }
      .footer-inner { padding: 20px 32px; }
      @media (max-width: 639px) { .header-inner, .content, .footer-inner { padding-left: 20px; padding-right: 20px; } .content { padding-top: 48px; padding-bottom: 48px; align-items: flex-start; } h1 { font-size: 42px; } }
    </style>
  </head>
  <body>
    <header><div class="header-inner">${aimante ? '<span class="aimante">Aimanté</span>' : '<span class="gp"><span class="mark" aria-hidden="true"></span>Gravity Pants</span>'}</div></header>
    <main class="content"><div class="copy">
      <div class="status"><span class="dot" aria-hidden="true"></span>Service temporarily unavailable</div>
      <h1>We’ll be right back.</h1>
      <p>We’re having a temporary problem loading this page. Your work is safe. Please try again in a moment.</p>
      <div class="actions">
        <button onclick="location.reload()">Try again</button>
        <a class="home" href="/">Go home</a>
      </div>
      <a class="service" href="https://status.gravitypants.com" target="_blank" rel="noreferrer">Check service status →</a>
    </div></main>
    <footer><div class="footer-inner">© ${new Date().getFullYear()} ${copyright}</div></footer>
  </body>
</html>`;
}
