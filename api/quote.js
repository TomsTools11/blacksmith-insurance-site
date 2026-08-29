// POST /api/quote — receives the quote form and creates a lead in AgencyZoom.
//
// Vercel picks up this file as a serverless function automatically; the rest
// of the repo stays a static site. Credentials never reach the browser.
//
// AgencyZoom API (spec: https://app.agencyzoom.com/openapi/agencyzoom.yaml):
//   POST /v1/api/auth/login    { username, password } -> { jwt }
//   POST /v1/api/leads/create  Bearer <jwt>; requires firstname, email,
//                              leadSourceId, assignTo, country, pipelineId, stageId
//
// Environment variables (Vercel → Project → Settings → Environment Variables):
//   AGENCYZOOM_USERNAME        login email of the AgencyZoom user leads are created as
//   AGENCYZOOM_PASSWORD        that user's password
//   AGENCYZOOM_PIPELINE_ID     \
//   AGENCYZOOM_STAGE_ID        |  numeric ids — list yours with
//   AGENCYZOOM_LEAD_SOURCE_ID  |  `node scripts/agencyzoom-ids.js`
//   AGENCYZOOM_ASSIGN_TO       /
//   AGENCYZOOM_TAGS            optional tag names, e.g. "website;quote-form"
//   AGENCYZOOM_COUNTRY         optional, defaults to "USA"

const AZ_BASE = 'https://api.agencyzoom.com';
const TIMEOUT_MS = 10000;

// One JWT per warm function instance; AgencyZoom logins are rate-limited, so
// don't log in per submission.
let jwtCache = { token: null, expiresAt: 0 };

function jwtExpiry(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    if (typeof payload.exp === 'number') return payload.exp * 1000 - 60000;
  } catch (_) { /* opaque token — fall through */ }
  return Date.now() + 10 * 60 * 1000;
}

async function azFetch(path, options) {
  const res = await fetch(AZ_BASE + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return res;
}

async function login() {
  const res = await azFetch('/v1/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: process.env.AGENCYZOOM_USERNAME,
      password: process.env.AGENCYZOOM_PASSWORD,
    }),
  });
  if (!res.ok) {
    throw new Error(`AgencyZoom login failed: HTTP ${res.status} ${await res.text().catch(() => '')}`);
  }
  const body = await res.json();
  if (!body.jwt) throw new Error('AgencyZoom login response had no jwt');
  jwtCache = { token: body.jwt, expiresAt: jwtExpiry(body.jwt) };
  return body.jwt;
}

async function getJwt(force) {
  if (!force && jwtCache.token && Date.now() < jwtCache.expiresAt) return jwtCache.token;
  return login();
}

async function createLead(lead) {
  let token = await getJwt(false);
  let res = await azFetch('/v1/api/leads/create', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(lead),
  });
  if (res.status === 401) {
    // Cached token went stale server-side — log in again and retry once.
    token = await getJwt(true);
    res = await azFetch('/v1/api/leads/create', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(lead),
    });
  }
  if (!res.ok) {
    throw new Error(`AgencyZoom lead create failed: HTTP ${res.status} ${await res.text().catch(() => '')}`);
  }
}

function clean(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  let data = req.body;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch (_) { data = null; }
  }
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ ok: false, error: 'Invalid request body.' });
  }

  // Honeypot: the hidden "website" field is empty for people. A filled value
  // is a bot — report success and create nothing.
  if (clean(data.website, 10)) return res.status(200).json({ ok: true });

  const name = clean(data.name, 120);
  const email = clean(data.email, 200);
  const phone = clean(data.phone, 40);
  const coverage = clean(data.coverage, 80);
  const details = clean(data.details, 2000);

  if (!name) return res.status(400).json({ ok: false, error: 'Please enter your name.' });
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ ok: false, error: 'Please enter a valid email address.' });
  if (!coverage) return res.status(400).json({ ok: false, error: 'Please select the coverage you need.' });

  const required = [
    'AGENCYZOOM_USERNAME', 'AGENCYZOOM_PASSWORD', 'AGENCYZOOM_PIPELINE_ID',
    'AGENCYZOOM_STAGE_ID', 'AGENCYZOOM_LEAD_SOURCE_ID', 'AGENCYZOOM_ASSIGN_TO',
  ];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    console.error(`api/quote: missing environment variables: ${missing.join(', ')}`);
    return res.status(500).json({ ok: false, error: 'The form is not configured yet.' });
  }

  const [firstname, ...rest] = name.split(/\s+/);
  const lead = {
    firstname,
    lastname: rest.join(' '),
    email,
    country: process.env.AGENCYZOOM_COUNTRY || 'USA',
    pipelineId: Number(process.env.AGENCYZOOM_PIPELINE_ID),
    stageId: Number(process.env.AGENCYZOOM_STAGE_ID),
    leadSourceId: Number(process.env.AGENCYZOOM_LEAD_SOURCE_ID),
    assignTo: Number(process.env.AGENCYZOOM_ASSIGN_TO),
    notes: `Website quote request\nCoverage: ${coverage}` + (details ? `\nDetails: ${details}` : ''),
  };
  if (phone) lead.phone = phone;
  if (process.env.AGENCYZOOM_TAGS) lead.tagNames = process.env.AGENCYZOOM_TAGS;

  try {
    await createLead(lead);
    return res.status(200).json({ ok: true });
  } catch (err) {
    // Full detail goes to the function log; the visitor gets the phone number.
    console.error('api/quote:', err);
    return res.status(502).json({ ok: false, error: 'We could not send your request.' });
  }
};
