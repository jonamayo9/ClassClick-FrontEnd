import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const root = resolve('.');
const contentPath = resolve(root, 'src/content/terms-of-use.html');
const metaPath = resolve(root, 'src/content/terms-of-use-meta.json');
const targetPath = resolve(root, 'public/terminos.html');

const contentHtml = readFileSync(contentPath, 'utf8').trim();
const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
const updatedAt = new Date(meta.updatedAt);

if (Number.isNaN(updatedAt.getTime())) {
  throw new Error('La fecha de actualización de los términos y condiciones no es válida.');
}

const updatedLabel = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
}).format(updatedAt);

const page = `<!doctype html>
<html lang="es-AR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${meta.title} | ClassClick</title>
    <meta name="description" content="${meta.description}" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${meta.canonical}" />
    <meta name="theme-color" content="#030B1B" />
    <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon.png" />
    <style>
      @font-face {
        font-family: 'Inter';
        src: url('/fonts/inter-latin-var.woff2') format('woff2');
        font-weight: 100 900;
        font-style: normal;
        font-display: swap;
      }
      :root {
        color-scheme: dark;
        --bg: #030b1b;
        --surface: #0b1426;
        --surface-soft: #111d33;
        --text: #e8eefc;
        --muted: #a9b8d1;
        --faint: #7f91ad;
        --blue: #3478ff;
        --blue-light: #6ea0ff;
        --border: rgba(255, 255, 255, 0.13);
      }
      * { box-sizing: border-box; }
      html { scroll-behavior: smooth; }
      body {
        margin: 0;
        min-height: 100vh;
        background:
          radial-gradient(circle at 10% 0%, rgba(52, 120, 255, 0.18), transparent 34rem),
          radial-gradient(circle at 100% 20%, rgba(52, 120, 255, 0.10), transparent 28rem),
          var(--bg);
        color: var(--text);
        font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        line-height: 1.65;
        -webkit-font-smoothing: antialiased;
      }
      a { color: var(--blue-light); text-underline-offset: 0.18em; }
      a:hover { color: #a9c6ff; }
      .page {
        width: min(100% - 2rem, 980px);
        margin: 0 auto;
        padding: 2rem 0 4rem;
      }
      .topbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.75rem;
        padding: 0.9rem 0 1.4rem;
      }
      .brand {
        display: inline-flex;
        align-items: center;
        gap: 0.7rem;
        color: var(--text);
        text-decoration: none;
        font-weight: 800;
        letter-spacing: -0.02em;
      }
      .brand img {
        width: 42px;
        height: 42px;
        border-radius: 12px;
        border: 1px solid var(--border);
        background: #fff;
        padding: 3px;
      }
      .topbar nav {
        margin-left: auto;
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .topbar nav a {
        display: inline-flex;
        min-height: 40px;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 0 0.8rem;
        color: var(--text);
        font-size: 0.8rem;
        font-weight: 700;
        text-decoration: none;
        background: rgba(255, 255, 255, 0.03);
      }
      .topbar nav a:hover { background: rgba(255, 255, 255, 0.08); }
      .hero {
        border: 1px solid var(--border);
        border-radius: 24px;
        background: linear-gradient(135deg, rgba(17, 29, 51, 0.92), rgba(11, 20, 38, 0.92));
        padding: clamp(1.3rem, 4vw, 2.5rem);
        box-shadow: 0 24px 70px rgba(0, 0, 0, 0.35);
      }
      .eyebrow {
        margin: 0;
        color: var(--blue-light);
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }
      h1 {
        margin: 0.55rem 0 0;
        font-size: clamp(2rem, 7vw, 3.6rem);
        line-height: 1.05;
        letter-spacing: -0.045em;
      }
      .hero p {
        max-width: 48rem;
        margin: 1rem 0 0;
        color: var(--muted);
        font-size: clamp(0.98rem, 2.5vw, 1.12rem);
      }
      .meta {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 1.2rem;
      }
      .meta span {
        border: 1px solid var(--border);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.04);
        padding: 0.35rem 0.75rem;
        color: var(--muted);
        font-size: 0.74rem;
        font-weight: 700;
      }
      .article {
        margin-top: 1.1rem;
        border: 1px solid var(--border);
        border-radius: 24px;
        background: rgba(11, 20, 38, 0.92);
        padding: clamp(1.25rem, 4vw, 2.75rem);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.28);
      }
      .legal-lead {
        margin-top: 0;
        color: var(--text);
        font-size: 1.02rem;
      }
      h2 {
        margin: 2.2rem 0 0.75rem;
        padding-top: 1.2rem;
        border-top: 1px solid var(--border);
        font-size: clamp(1.12rem, 3.4vw, 1.45rem);
        line-height: 1.25;
        letter-spacing: -0.02em;
      }
      h2:first-of-type { border-top: 0; padding-top: 0; margin-top: 1.4rem; }
      p { margin: 0.75rem 0; }
      ul { margin: 0.8rem 0 1rem; padding-left: 1.25rem; }
      li { margin: 0.45rem 0; padding-left: 0.2rem; }
      strong { color: #fff; }
      .legal-note {
        margin: 1.2rem 0;
        border: 1px solid rgba(52, 120, 255, 0.35);
        border-left: 4px solid var(--blue);
        border-radius: 12px;
        background: rgba(52, 120, 255, 0.08);
        padding: 0.95rem 1rem;
        color: var(--text);
      }
      .footer {
        margin-top: 1.2rem;
        border: 1px solid var(--border);
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.03);
        padding: 1rem 1.1rem;
        color: var(--faint);
        font-size: 0.78rem;
        line-height: 1.7;
      }
      .footer a { font-weight: 700; }
      @media (max-width: 620px) {
        .page { width: min(100% - 1.2rem, 980px); padding-top: 0.75rem; }
        .topbar nav { width: 100%; margin-left: 0; }
        .topbar nav a { flex: 1; }
        .article { border-radius: 18px; }
      }
      @media print {
        :root { color-scheme: light; --bg: #fff; --surface: #fff; --text: #111; --muted: #333; --faint: #555; --border: #ddd; }
        body { background: #fff; }
        .hero, .article, .footer { box-shadow: none; background: #fff; }
        .topbar nav { display: none; }
      }
    </style>
  </head>
  <body>
    <div class="page">
      <header class="topbar">
        <a class="brand" href="https://classclick.com.ar">
          <img src="/icons/icon-512.png" alt="ClassClick" />
          <span>ClassClick</span>
        </a>
        <nav aria-label="Navegación legal">
          <a href="https://classclick.com.ar">Volver al inicio</a>
          <a href="/privacidad">Política de Privacidad</a>
          <a href="/terminos">Términos y Condiciones</a>
        </nav>
      </header>

      <section class="hero">
        <p class="eyebrow">Documentos legales</p>
        <h1>${meta.title}</h1>
        <p>${meta.description}</p>
        <div class="meta">
          <span>Última actualización: ${updatedLabel}</span>
          <span>Versión ${meta.version}</span>
          <span>Vigente para Web, PWA y Android</span>
        </div>
      </section>

      <main class="article legal-prose">
        ${contentHtml}
      </main>

      <footer class="footer">
        <p>
          Consultas de privacidad:
          <a href="mailto:soporte@classclick.com.ar">soporte@classclick.com.ar</a>.
          También podés comunicarte por el WhatsApp publicado en
          <a href="https://classclick.com.ar">classclick.com.ar</a>.
        </p>
        <p>
          Versión ${meta.version} · Última actualización: ${updatedLabel}.
          <a href="/privacidad">Política de Privacidad</a> · <a href="/terminos">Términos y Condiciones</a>.
        </p>
      </footer>
    </div>
  </body>
</html>
`;

mkdirSync(dirname(targetPath), { recursive: true });
writeFileSync(targetPath, page, 'utf8');

console.log(`Términos y condiciones estáticos generados en ${targetPath}`);
