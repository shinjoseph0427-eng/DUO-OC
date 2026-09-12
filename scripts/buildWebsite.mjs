import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const appRoot = process.env.WEEKLY_APP_DIR
  ? path.resolve(process.env.WEEKLY_APP_DIR)
  : path.resolve(root, '..', 'weekly-app');

const policiesPath = path.join(appRoot, 'src', 'legal', 'policies.ts');
const heroSource = path.join('C:', 'Users', 'jiseo', 'Downloads', 'pexels-thuan-34412293.jpg');
const peopleSource = path.join('C:', 'Users', 'jiseo', 'Downloads', 'pexels-jeff-vinluan-20921030-7775861.jpg');
const cafeSource = path.join('C:', 'Users', 'jiseo', 'Downloads', 'pexels-pavel-danilyuk-8111317.jpg');
const groupSource = path.join('C:', 'Users', 'jiseo', 'Downloads', 'pexels-picha-6211210.jpg');
const fallbackHeroSource = path.join(appRoot, 'optimized-landing', 'landing-1.jpg');
const heroTarget = path.join(root, 'public', 'optimized-landing', 'landing-1.jpg');
const peopleTarget = path.join(root, 'public', 'optimized-landing', 'landing-2.jpg');
const cafeTarget = path.join(root, 'public', 'optimized-landing', 'landing-3.jpg');
const groupTarget = path.join(root, 'public', 'optimized-landing', 'landing-4.jpg');
const cssSource = path.join(root, 'src', 'index.css');
const cssTarget = path.join(root, 'public', 'site.css');

const domain = 'https://weeklyhangout.com';

// Vercel builds this repository without the adjacent mobile-app checkout. The
// generated static pages are committed under public/, so validate and reuse
// that snapshot when the canonical policy source is unavailable remotely.
if (!fs.existsSync(policiesPath)) {
  const requiredPages = ['', 'support', 'privacy', 'privacy-choices', 'terms', 'community-guidelines', 'delete-account'];
  for (const route of requiredPages) {
    const file = route ? path.join(root, 'public', route, 'index.html') : path.join(root, 'index.html');
    if (!fs.existsSync(file)) throw new Error(`Missing generated website page: ${file}`);
  }
  console.log('Validated committed WEEKLY website snapshot (canonical app checkout unavailable).');
  process.exit(0);
}

const readPolicies = () => {
  const source = fs.readFileSync(policiesPath, 'utf8');
  const js = source
    .replace(/export type LegalBlock[\s\S]*?;\r?\n\r?\n/g, '')
    .replace(/export type LegalLink[\s\S]*?;\r?\n\r?\n/g, '')
    .replace(/export type LegalDocument[\s\S]*?;\r?\n\r?\n/g, '')
    .replace(/ as const/g, '')
    .replace(/export const ([A-Z0-9_]+): LegalDocument =/g, 'const $1 =')
    .replace(/export const /g, 'const ')
    .replace(/export function /g, 'function ')
    .replace(/\((\w+): string\[\]\)/g, '($1)')
    .replace(/\((\w+): string\)/g, '($1)')
    .replace(/\): LegalBlock =>/g, ') =>');

  const context = {};
  vm.createContext(context);
  vm.runInContext(`${js}
    result = {
      PRIVACY_POLICY,
      TERMS_OF_SERVICE,
      COMMUNITY_GUIDELINES,
      APP_PRIVACY_DISCLOSURES,
      LEGAL_CENTER,
      SUPPORT_EMAIL,
      POLICY_LAST_UPDATED,
      POLICY_VERSIONS
    };
  `, context, { filename: policiesPath });

  return context.result;
};

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });

const writeFile = (file, content) => {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, content);
};

const copyAssetIfMissing = (source, target) => {
  ensureDir(path.dirname(target));
  if (fs.existsSync(target) && process.env.WEEKLY_REFRESH_IMAGES !== '1') return;
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, target);
    return;
  }
  fs.copyFileSync(fallbackHeroSource, target);
};

const nav = `
  <nav class="site-nav" aria-label="Primary">
    <div class="nav-links nav-left">
      <a href="/#how">How it works</a>
      <a href="/#identity">Identity</a>
      <a href="/#oc">OC based</a>
    </div>
    <a class="brand" href="/" aria-label="WEEKLY home">WEEKLY</a>
    <div class="nav-links nav-right">
      <a href="/legal">Legal</a>
      <a href="mailto:weeklysupport@gmail.com">Support</a>
    </div>
  </nav>`;

const shell = ({ title, description, canonical, body, bodyClass = '' }) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#050505" />
    <meta name="application-name" content="WEEKLY" />
    <meta name="apple-mobile-web-app-title" content="WEEKLY" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${canonical}" />
    <link rel="icon" href="/favicon.ico" />
    <link rel="icon" type="image/png" href="/icon.png" />
    <link rel="apple-touch-icon" href="/icon.png" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:site_name" content="WEEKLY" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${domain}/og-image.png" />
    <meta property="og:image:alt" content="WEEKLY brand logo" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${domain}/og-image.png" />
    <link rel="stylesheet" href="/site.css" />
  </head>
  <body class="${bodyClass}">
    ${body}
  </body>
</html>
`;

const renderBlocks = (blocks) => blocks.map((block) => {
  if (block.kind === 'p') return `<p>${escapeHtml(block.text)}</p>`;
  if (block.kind === 'bullets') {
    return `<ul>${block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
  }
  return '';
}).join('\n');

const renderDocument = (doc, route) => {
  const canonical = `${domain}${route === '/' ? '' : route}`;
  const description = doc.subtitle || `${doc.title} for WEEKLY.`;
  const links = doc.links?.length
    ? `<div class="legal-link-grid">${doc.links.map((link) => `
        <a class="legal-link-card" href="${link.href}">
          <strong>${escapeHtml(link.label)}</strong>
          <span>${escapeHtml(link.description)}</span>
        </a>`).join('')}
      </div>`
    : '';

  return shell({
    title: `${doc.title} | WEEKLY`,
    description,
    canonical,
    bodyClass: 'legal-page',
    body: `
      ${nav}
      <main class="legal-shell">
        <header class="legal-hero">
          <a class="back-link" href="/legal">Legal Center</a>
          <p class="eyebrow">WEEKLY policy</p>
          <h1>${escapeHtml(doc.title)}</h1>
          ${doc.subtitle ? `<p class="legal-subtitle">${escapeHtml(doc.subtitle)}</p>` : ''}
          <div class="policy-meta">
            <span>Effective ${escapeHtml(doc.effectiveDate)}</span>
            <span>Updated ${escapeHtml(doc.lastUpdated)}</span>
            ${doc.version ? `<span>Version ${escapeHtml(doc.version)}</span>` : ''}
          </div>
        </header>
        ${links}
        <article class="legal-document">
          ${doc.sections.map((section) => `
            <section>
              <h2>${escapeHtml(section.title)}</h2>
              ${renderBlocks(section.blocks)}
            </section>`).join('')}
        </article>
      </main>
      ${footer()}
    `,
  });
};

const footer = () => `
  <footer class="site-footer">
    <div class="footer-grid">
      <section class="footer-brand">
        <h2>WEEKLY</h2>
        <p>Shared interests, weekly availability, and real-life plans.</p>
        <span class="footer-note">&copy; ${new Date().getFullYear()} WEEKLY. All rights reserved.</span>
      </section>
      <section>
        <h3>Product</h3>
        <a href="/#how">How it works</a>
        <a href="/#safety">Safety</a>
      </section>
      <section>
        <h3>Legal</h3>
        <a href="/legal">Legal Center</a>
        <a href="/privacy">Privacy Policy</a>
        <a href="/terms">Terms of Service</a>
        <a href="/community-guidelines">Community Guidelines</a>
        <a href="/app-privacy-disclosures">App Privacy Disclosures</a>
      </section>
      <section>
        <h3>Contact</h3>
        <span>weeklysupport@gmail.com</span>
      </section>
    </div>
  </footer>`;

const renderLanding = () => shell({
  title: 'WEEKLY | Make a plan for this week',
  description: 'WEEKLY helps people make real-life plans around shared interests and activities.',
  canonical: domain,
  bodyClass: 'home-page',
  body: `
    ${nav}
    <main>
      <section class="landing-hero">
        <figure class="hero-photo">
          <img src="/optimized-landing/landing-4.jpg" alt="Friends hanging out together under string lights" />
        </figure>
        <div class="hero-copy">
          <p class="eyebrow">18+ only / Orange County</p>
          <h1>Make a plan for this week.</h1>
          <p class="hero-subhead">Choose activities and share your weekly availability. Send a request, connect after acceptance, and coordinate a plan.</p>
          <div class="hero-actions">
            <a class="primary-button" href="/privacy">Privacy Policy</a>
            <a class="secondary-button" href="mailto:weeklysupport@gmail.com">Contact support</a>
          </div>
        </div>
      </section>

      <section id="identity" class="identity-strip" aria-label="WEEKLY identity">
        <span>Shared activities</span>
        <span>Build connections</span>
        <span>OC based</span>
        <span>This week, not someday</span>
      </section>

      <section class="editorial-section">
        <figure>
          <img src="/optimized-landing/landing-1.jpg" alt="A quiet cafe courtyard with people hanging out" />
        </figure>
        <div>
          <p class="eyebrow">Activities for your week</p>
          <h2>Plans feel better when they start from the week you are already living.</h2>
          <p>Choose the days you are free, explore activities and interests, and coordinate a plan after connecting.</p>
        </div>
      </section>

      <section id="how" class="how-section" aria-labelledby="how-title">
        <p class="eyebrow">How it works</p>
        <h2 id="how-title">Four steps from open night to actual plan.</h2>
        <div class="step-grid">
          <article><span>01 DROP</span><p>Mark the days you are free this week and what you would be up for.</p></article>
          <article><span>02 EXPLORE</span><p>Explore people by shared interests and overlapping weekly availability.</p></article>
          <article><span>03 LIVE</span><p>Turn on Live when you are free right now. Explore moves people who are also Live toward the top, and everyone else is still there.</p></article>
          <article><span>04 PLAN</span><p>Send a request, chat once it is accepted, and agree on a day and a public place.</p></article>
        </div>
        <p class="step-aside">You can also share a Moment &mdash; a photo or short post that disappears after 24 hours &mdash; with people you have connected with.</p>
      </section>

      <section id="oc" class="photo-story" aria-label="OC based hangouts">
        <img src="/optimized-landing/landing-2.jpg" alt="Friends relaxing outside on a sunny day" />
        <div>
          <p class="eyebrow">OC based</p>
          <h2>Built for coffee runs, beach-adjacent nights, low-key dinners, and whatever your week can hold.</h2>
          <p>The app stays local, simple, and grounded in real timing.</p>
        </div>
      </section>

      <section class="connection-section">
        <div>
          <p class="eyebrow">Build connections</p>
          <h2>Less endless browsing. More mutual free time.</h2>
          <p>WEEKLY is for adults who want to make real-life plans around shared interests and activities.</p>
        </div>
        <figure>
          <img src="/optimized-landing/landing-3.jpg" alt="Two people talking over coffee" />
        </figure>
      </section>

      <section id="safety" class="safety-callout">
        <p class="eyebrow">Safety</p>
        <p>WEEKLY is for adults 18 and over. WEEKLY does not verify identity &mdash; meet in public, and use your own judgment. You can report or block anyone from their profile or a chat, and you can delete your account and all of its data at any time from Settings.</p>
      </section>

      <section class="review-links" aria-labelledby="review-title">
        <img src="/optimized-landing/landing-4.jpg" alt="A group of friends smiling during a casual hangout" />
        <div>
          <p class="eyebrow">App Review ready</p>
          <h2 id="review-title">The policy pages are real HTML.</h2>
          <p>Reviewers can open each route directly and read the policy text without relying on client-side JavaScript.</p>
        </div>
        <div class="legal-link-grid">
          <a class="legal-link-card" href="/privacy"><strong>Privacy Policy</strong><span>Data collection, sharing, deletion, and rights.</span></a>
          <a class="legal-link-card" href="/terms"><strong>Terms of Service</strong><span>Rules for accounts, content, and offline hangouts.</span></a>
          <a class="legal-link-card" href="/community-guidelines"><strong>Community Guidelines</strong><span>Safety standards and prohibited behavior.</span></a>
          <a class="legal-link-card" href="/app-privacy-disclosures"><strong>App Privacy Disclosures</strong><span>App Store data category summary.</span></a>
        </div>
      </section>
    </main>
    ${footer()}
  `,
});

const writeRoute = (route, html) => {
  if (route === '/') {
    writeFile(path.join(root, 'index.html'), html);
    return;
  }
  writeFile(path.join(root, 'public', route.slice(1), 'index.html'), html);
};

const policies = readPolicies();

copyAssetIfMissing(heroSource, heroTarget);
copyAssetIfMissing(peopleSource, peopleTarget);
copyAssetIfMissing(cafeSource, cafeTarget);
copyAssetIfMissing(groupSource, groupTarget);
fs.copyFileSync(cssSource, cssTarget);

writeRoute('/', renderLanding());
writeRoute('/privacy', renderDocument(policies.PRIVACY_POLICY, '/privacy'));
writeRoute('/terms', renderDocument(policies.TERMS_OF_SERVICE, '/terms'));
writeRoute('/community-guidelines', renderDocument(policies.COMMUNITY_GUIDELINES, '/community-guidelines'));
writeRoute('/app-privacy-disclosures', renderDocument(policies.APP_PRIVACY_DISCLOSURES, '/app-privacy-disclosures'));
writeRoute('/legal', renderDocument(policies.LEGAL_CENTER, '/legal'));

writeFile(path.join(root, 'public', 'robots.txt'), `User-agent: *
Allow: /

Sitemap: ${domain}/sitemap.xml
`);

writeFile(path.join(root, 'public', 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${['/', '/privacy', '/terms', '/community-guidelines', '/app-privacy-disclosures', '/legal'].map((route) => `  <url><loc>${domain}${route === '/' ? '' : route}</loc></url>`).join('\n')}
</urlset>
`);

console.log('Built static WEEKLY website from', policiesPath);

// These routes are generated from the same app policy source and explicit controls.
for (const route of ['support', 'privacy-choices', 'delete-account']) {
 const source = path.join(appRoot, 'website', route, 'index.html');
 if (!fs.existsSync(source)) throw new Error('Run npm run build:website in weekly-app first.');
 fs.mkdirSync(path.join(root, 'public', route), { recursive: true });
 fs.copyFileSync(source, path.join(root, 'public', route, 'index.html'));
}
