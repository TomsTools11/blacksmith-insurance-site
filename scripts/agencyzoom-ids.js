#!/usr/bin/env node
// One-time setup helper: prints the AgencyZoom ids that api/quote.js needs
// (pipeline, stage, lead source, producer) so they can be set as environment
// variables in Vercel. Read-only — it creates and changes nothing.
//
// Usage (Node 18+):
//   AGENCYZOOM_USERNAME=you@agency.com AGENCYZOOM_PASSWORD='…' node scripts/agencyzoom-ids.js

const AZ_BASE = 'https://api.agencyzoom.com';

async function main() {
  const username = process.env.AGENCYZOOM_USERNAME;
  const password = process.env.AGENCYZOOM_PASSWORD;
  if (!username || !password) {
    console.error('Set AGENCYZOOM_USERNAME and AGENCYZOOM_PASSWORD first — see the usage line at the top of this file.');
    process.exit(1);
  }

  const loginRes = await fetch(`${AZ_BASE}/v1/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!loginRes.ok) {
    console.error(`Login failed: HTTP ${loginRes.status} ${await loginRes.text().catch(() => '')}`);
    process.exit(1);
  }
  const { jwt } = await loginRes.json();

  const get = async (path) => {
    const res = await fetch(`${AZ_BASE}${path}`, { headers: { Authorization: `Bearer ${jwt}` } });
    if (!res.ok) throw new Error(`GET ${path} failed: HTTP ${res.status}`);
    return res.json();
  };

  const [pipelines, leadSources, employees] = await Promise.all([
    get('/v1/api/pipelines-and-stages?type=lead'),
    get('/v1/api/lead-sources'),
    get('/v1/api/employees'),
  ]);

  console.log('\nPipelines and stages — pick one of each');
  console.log('(AGENCYZOOM_PIPELINE_ID / AGENCYZOOM_STAGE_ID; the stage must belong to the pipeline):');
  for (const p of pipelines) {
    console.log(`  [${p.id}] ${p.name}`);
    for (const s of p.stages || []) console.log(`      stage [${s.id}] ${s.name}`);
  }

  console.log('\nLead sources (AGENCYZOOM_LEAD_SOURCE_ID):');
  for (const s of leadSources) console.log(`  [${s.id}] ${s.name}`);

  console.log('\nEmployees (AGENCYZOOM_ASSIGN_TO — pick a producer):');
  for (const e of employees) {
    const flag = e.isProducer ? ' (producer)' : '';
    console.log(`  [${e.id}] ${[e.firstname, e.lastname].filter(Boolean).join(' ')} ${e.email || ''}${flag}`);
  }
  console.log();
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
