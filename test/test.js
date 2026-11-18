// Local tests on an in-process Ganache chain.
// The test key is a random in-memory key for the LOCAL chain only.
// Never used on mainnet; never the user's key.
// Usage: node test/test.js
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const Ganache = require('ganache');
const { ethers } = require('ethers');

async function main() {
  const badgeJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'build', 'AgentPioneerBadge.json'), 'utf8'));
  const mockJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'build', 'MockAgentID.json'), 'utf8'));

  // Cancun-compiled bytecode uses PUSH0 (Shanghai+); tell Ganache to use it.
  const server = Ganache.server({ logging: { quiet: true }, chain: { hardfork: 'shanghai' } });
  await server.listen(8545, '127.0.0.1');
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  const accounts = await provider.listAccounts();
  const deployer = await provider.getSigner(0);
  const alice = await provider.getSigner(1);
  const bob = await provider.getSigner(2);
  const aliceAddr = await alice.getAddress();
  const bobAddr = await bob.getAddress();

  // Deploy mock Agent ID, give Alice a balance of 1, Bob 0.
  const MockFactory = new ethers.ContractFactory(mockJson.abi, mockJson.bytecode, deployer);
  const mock = await MockFactory.deploy();
  await mock.waitForDeployment();
  await (await mock.setBalance(aliceAddr, 1)).wait();

  // Deploy badge pointing at the mock.
  const BadgeFactory = new ethers.ContractFactory(badgeJson.abi, badgeJson.bytecode, deployer);
  const badge = await BadgeFactory.deploy(await mock.getAddress());
  await badge.waitForDeployment();
  console.log('badge deployed at', await badge.getAddress());

  // 1. Bob (no Agent ID) cannot mint. (staticCall surfaces the revert reason;
  // Ganache's estimateGas path drops revert data.)
  await assert.rejects(
    badge.connect(bob).mint.staticCall(),
    /Agent ID required/,
    'mint without Agent ID must revert'
  );
  console.log('PASS 1: mint without Agent ID reverts');

  // 2. Alice mints: tokenId 1, owner Alice, balance 1, totalMinted 1.
  const tx = await badge.connect(alice).mint();
  const receipt = await tx.wait();
  assert.strictEqual(await badge.totalMinted(), 1n);
  assert.strictEqual(await badge.ownerOf(1), aliceAddr);
  assert.strictEqual(await badge.balanceOf(aliceAddr), 1n);
  assert.strictEqual(await badge.hasMinted(aliceAddr), true);
  console.log('PASS 2: mint by Agent ID holder works, tokenId 1, gas used', receipt.gasUsed.toString());

  // 3. Alice cannot mint twice.
  await assert.rejects(badge.connect(alice).mint.staticCall(), /Already minted/);
  console.log('PASS 3: second mint reverts');

  // 4. tokenURI = on-chain data URI; decode and check name + image.
  const uri = await badge.tokenURI(1);
  assert.ok(uri.startsWith('data:application/json;base64,'), 'tokenURI must be a data URI');
  const meta = JSON.parse(Buffer.from(uri.slice('data:application/json;base64,'.length), 'base64').toString('utf8'));
  assert.strictEqual(meta.name, 'Agent Pioneer Badge #1');
  assert.ok(meta.image.startsWith('data:image/svg+xml;base64,'), 'image must be an SVG data URI');
  const svg = Buffer.from(meta.image.slice('data:image/svg+xml;base64,'.length), 'base64').toString('utf8');
  assert.ok(svg.includes('AGENT') && svg.includes('PIONEER') && svg.includes('#1'), 'SVG must contain badge text');
  assert.ok(meta.description.includes('No rewards or returns are promised'), 'description must disclaim rewards');
  console.log('PASS 4: tokenURI on-chain metadata correct');

  // 5. Transfer works (transferFrom by owner).
  await (await badge.connect(alice).transferFrom(aliceAddr, bobAddr, 1)).wait();
  assert.strictEqual(await badge.ownerOf(1), bobAddr);
  assert.strictEqual(await badge.balanceOf(bobAddr), 1n);
  console.log('PASS 5: transferFrom works');

  // 6. Approval flow: Bob approves Alice, Alice moves it back.
  await (await badge.connect(bob).approve(aliceAddr, 1)).wait();
  assert.strictEqual(await badge.getApproved(1), aliceAddr);
  await (await badge.connect(alice).transferFrom(bobAddr, aliceAddr, 1)).wait();
  assert.strictEqual(await badge.ownerOf(1), aliceAddr);
  console.log('PASS 6: approve + transferFrom by approved works');

  // 7. safeTransferFrom to an EOA works; ERC-721 interface supported.
  await (await badge.connect(alice)['safeTransferFrom(address,address,uint256)'](aliceAddr, bobAddr, 1)).wait();
  assert.strictEqual(await badge.ownerOf(1), bobAddr);
  assert.strictEqual(await badge.supportsInterface('0x80ac58cd'), true);
  console.log('PASS 7: safeTransferFrom + supportsInterface(ERC721) work');

  // 8. name/symbol.
  assert.strictEqual(await badge.name(), 'Agent Pioneer Badge');
  assert.strictEqual(await badge.symbol(), 'APB');
  console.log('PASS 8: name/symbol correct');

  console.log('ALL 8 TESTS PASSED');
  await server.close();
}

main().catch((e) => { console.error('TEST FAILED:', e); process.exit(1); });
