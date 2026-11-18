// Verify the deployed contract on Sourcify v2 (keyless; BscScan shows
// Sourcify-verified source on the contract page, and Sourcify forwards
// matches to external verifiers incl. Etherscan/BscScan).
// Endpoint: POST /v2/verify/metadata/{chainId}/{address} (JSON body)
// Then poll GET /v2/verify/{verificationId}.
// Usage: node scripts/verify-sourcify.js
const fs = require('fs');
const path = require('path');

const CONTRACT = '0x3eAd2FEa444399ca004033c7512F2C4C1eB0B7F3';
const CHAIN_ID = '56';
const BASE = 'https://sourcify.dev/server';
// Creation tx = the DDP factory call that CREATE2-deployed the contract.
const CREATION_TX = '0xcc0d295f88ae989544a1394eba716528bcdccf7148375e602cb2de81a4b533f1';

async function main() {
  const build = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'build', 'AgentPioneerBadge.json'), 'utf8'));
  const metadata = JSON.parse(build.metadata);
  const root = path.join(__dirname, '..');

  const sources = {};
  for (const srcPath of Object.keys(metadata.sources)) {
    let full;
    if (srcPath.startsWith('@')) full = path.join(root, 'node_modules', srcPath);
    else full = path.join(root, 'contracts', srcPath);
    sources[srcPath] = fs.readFileSync(full, 'utf8');
  }
  console.log('sources:', Object.keys(sources).length);

  const url = `${BASE}/v2/verify/metadata/${CHAIN_ID}/${CONTRACT}`;
  console.log('POST', url);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sources, metadata, creationTransactionHash: CREATION_TX }),
  });
  const text = await res.text();
  console.log('HTTP', res.status);
  console.log(text.slice(0, 3000));
  if (res.status !== 200 && res.status !== 201 && res.status !== 202) process.exit(1);
  let verificationId;
  try { verificationId = JSON.parse(text).verificationId; } catch (e) { /* no id */ }
  if (!verificationId) { console.log('no verificationId returned; done'); return; }

  for (let i = 0; i < 24; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const s = await fetch(`${BASE}/v2/verify/${verificationId}`);
    const st = await s.text();
    console.log('poll', i + 1, 'HTTP', s.status, st.slice(0, 1500));
    try {
      const j = JSON.parse(st);
      const status = j.status;
      if (status && !/pending|running|started|queued/i.test(status)) break;
    } catch (e) { /* keep polling */ }
  }
}

main().catch((e) => { console.error('VERIFY FAILED:', e.message); process.exit(1); });
