const origin = process.env.WEEKLY_WEBSITE_ORIGIN || 'https://weeklyhangout.com';
const routes = ['/', '/support', '/privacy', '/privacy-choices', '/terms', '/community-guidelines', '/delete-account'];
const prohibited = [
  /meet people who are free/i,
  /casual connections?/i,
  /casual hangout energy/i,
  /see people nearby/i,
  /chat once you match/i,
  /turn a match into a real hangout/i,
];

let failed = false;
for (const route of routes) {
  const response = await fetch(new URL(route, origin), { redirect: 'follow' });
  const body = await response.text();
  const hits = prohibited.filter((pattern) => pattern.test(body)).map(String);
  const hasContent = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().length > 150;
  const ok = response.status === 200 && hasContent && hits.length === 0;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${route} HTTP ${response.status} prohibited=${hits.length}`);
  failed ||= !ok;
}

if (failed) process.exit(1);
console.log(`PASS ${routes.length}/${routes.length} production website routes`);
