#!/usr/bin/env node
// Turns a raw n8n workflow export into a version that is safe to publish.
// It removes instance-specific and personal values but keeps the logic intact.
// The same sanitize() function is pasted into the "Sanitize" Code node of the
// backup workflow, so local and automatic exports stay identical.
//
// Usage: node scripts/sanitize.js raw.json > workflows/sunday-coach.json

function sanitize(wf) {
  const PLACEHOLDERS = {
    chatId: 'YOUR_TELEGRAM_CHAT_ID',
    athleteId: 'YOUR_ATHLETE_ID',
    voiceId: 'YOUR_ELEVENLABS_VOICE_ID',
  };
  // Supabase project refs map to stable, readable placeholders
  const projectNames = {};
  const projectPlaceholder = (ref) =>
    (projectNames[ref] ??= `YOUR_SUPABASE_PROJECT_${Object.keys(projectNames).length + 1}`);

  const out = {
    name: wf.name,
    nodes: [],
    connections: wf.connections,
    settings: { executionOrder: wf.settings?.executionOrder ?? 'v1', timezone: wf.settings?.timezone },
    tags: wf.tags ?? [],
  };

  for (const node of wf.nodes) {
    const n = JSON.parse(JSON.stringify(node));
    delete n.webhookId;
    // Credentials are referenced by name only; IDs are instance-specific
    if (n.credentials) {
      for (const k of Object.keys(n.credentials)) n.credentials[k] = { name: n.credentials[k].name };
    }
    const p = n.parameters || {};
    if (p.projectRef) p.projectRef = projectPlaceholder(p.projectRef);
    if (p.chatId) p.chatId = PLACEHOLDERS.chatId;
    if (typeof p.url === 'string') {
      p.url = p.url.replace(/(api\.elevenlabs\.io\/v1\/text-to-speech\/)[A-Za-z0-9]+/, `$1${PLACEHOLDERS.voiceId}`);
    }
    for (const c of p.filters?.conditions ?? []) {
      if (c.keyName === 'athlete_id') c.keyValue = PLACEHOLDERS.athleteId;
    }
    out.nodes.push(n);
  }
  return out;
}

if (typeof module !== 'undefined' && require.main === module) {
  const fs = require('fs');
  const raw = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  process.stdout.write(JSON.stringify(sanitize(raw), null, 2) + '\n');
}
if (typeof module !== 'undefined') module.exports = { sanitize };
