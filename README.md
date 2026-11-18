# Agent Pioneer Badge

A free (gas-only) ERC-721 badge for Agent ID holders — one badge per
Agent ID, no mint fee, no rewards, no returns promised.

Built for the **Binance Agent ID Hackathon** (submission period
18 Nov – 9 Dec 2026). The project is an independent community entry;
it is not affiliated with or endorsed by Binance.

## How it works

- The contract is deployed on **BNB Chain (BSC)**.
- `mint()` is free: the caller only pays gas.
- The caller must hold an **Agent ID** (the SPACE ID Agent ID ERC-721,
  `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F` on BSC) — checked with
  `balanceOf(msg.sender) > 0` at mint time.
- One badge per address. No owner, no pause, no fees, no privileged
  functions at all — the contract cannot mint for anyone, cannot freeze
  anything, and holds no funds.
- Metadata (name, description, SVG image) is fully on-chain as data
  URIs — no external host is needed to render a badge.

## Contract

- Network: BNB Smart Chain (chain id 56)
- Contract: `0x3eAd2FEa444399ca004033c7512F2C4C1eB0B7F3`
- Deploy tx: `0xcc0d295f88ae989544a1394eba716528bcdccf7148375e602cb2de81a4b533f1`
  (gas used 1,495,725; cost ~0.000139 BNB)
- BscScan: https://bscscan.com/address/0x3eAd2FEa444399ca004033c7512F2C4C1eB0B7F3
- Source verification: **Sourcify exact match** (creation + runtime),
  verified 2026-11-18 12:21:05 UTC
  (https://repo.sourcify.dev/contracts/56/0x3eAd2FEa444399ca004033c7512F2C4C1eB0B7F3).
  Note: Sourcify's automatic forward to Etherscan/BscScan hit the shared
  daily limit (500 submissions/day) on 18 Nov, so the source is not yet
  mirrored on BscScan's own Contract tab — direct BscScan verification
  (needs a BscScan API key) or a re-forward is still pending.
- Agent ID contract: `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`

## Mint

Open the mint page, connect a wallet that holds an Agent ID
(Binance Wallet / MetaMask, injected provider — no QR login),
and confirm the mint transaction yourself in your wallet.
You only pay gas.

Mint page: https://metawo14.github.io/agent-pioneer-badge/

## Build & test

```sh
npm install
node scripts/compile.js   # solc-js, OpenZeppelin ERC721, evmVersion paris
node test/test.js          # local Ganache chain, 8 tests
```

## Deploy

The contract is deployed through the deterministic deployment proxy
(EIP-2470 style CREATE2 factory) at
`0x4e59b44847b379578588920ca78fbf26c0b4956c` with a single contract
call, because the deploying wallet (Binance Agentic Wallet) signs
contract calls only — it has no raw deployment flow. The call data is
`salt ++ initCode` (salt = `keccak256("agent-pioneer-badge-v1")`).

## License

MIT. See [LICENSE](LICENSE).
