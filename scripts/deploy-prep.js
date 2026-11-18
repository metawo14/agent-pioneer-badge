// Prepare a CREATE2 deployment through the deterministic deployment proxy
// (Arachnid DDP, 0x4e59b44847b379578588920ca78fbf26c0b4956c).
// The proxy takes calldata = salt (32 bytes) ++ initCode, and CREATE2s it.
// Outputs init code, salt, predicted address, calldata, and a BSC gas
// estimate (read-only eth_estimateGas). Writes deploy/deploy.json.
// Usage: node scripts/deploy-prep.js
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

const FACTORY = '0x4e59b44847b379578588920ca78fbf26c0b4956c';
const AGENT_ID = '0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F';
const DEPLOYER = '0xE43f552E2CF83645c37A40f784c4F5028cceb6Dc';
const RPC = 'https://bsc-dataseed.binance.org';

async function main() {
  const badgeJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'build', 'AgentPioneerBadge.json'), 'utf8'));
  const iface = new ethers.Interface(badgeJson.abi);
  const initCode = ethers.solidityPacked(
    ['bytes', 'bytes'],
    [badgeJson.bytecode, iface.encodeDeploy([AGENT_ID])]
  );
  const salt = ethers.keccak256(ethers.toUtf8Bytes('agent-pioneer-badge-v1'));
  const predicted = ethers.getCreate2Address(FACTORY, salt, ethers.keccak256(initCode));
  const calldata = ethers.solidityPacked(['bytes32', 'bytes'], [salt, initCode]);

  console.log('initCode bytes:', (initCode.length - 2) / 2);
  console.log('salt:', salt);
  console.log('predicted address:', predicted);
  console.log('calldata bytes:', (calldata.length - 2) / 2);

  // Read-only gas estimate for the factory call.
  const provider = new ethers.JsonRpcProvider(RPC);
  const est = await provider.estimateGas({ from: DEPLOYER, to: FACTORY, data: calldata, value: 0 });
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? 50000000n;
  const costWei = est * gasPrice;
  console.log('estimated gas:', est.toString());
  console.log('gas price (gwei):', (Number(gasPrice) / 1e9).toString());
  console.log('estimated cost BNB:', ethers.formatEther(costWei));
  const bal = await provider.getBalance(DEPLOYER);
  console.log('deployer balance BNB:', ethers.formatEther(bal));

  fs.mkdirSync(path.join(__dirname, '..', 'deploy'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, '..', 'deploy', 'deploy.json'), JSON.stringify({
    factory: FACTORY,
    agentId: AGENT_ID,
    deployer: DEPLOYER,
    salt,
    initCode,
    calldata,
    predictedAddress: predicted,
    estimatedGas: est.toString(),
    gasPriceWei: gasPrice.toString(),
    estimatedCostBNB: ethers.formatEther(costWei),
  }, null, 2));
  console.log('wrote deploy/deploy.json');
}

main().catch((e) => { console.error('DEPLOY-PREP FAILED:', e.message); process.exit(1); });
