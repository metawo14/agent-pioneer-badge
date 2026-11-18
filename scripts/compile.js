// Compile contracts with solc-js. Resolves @openzeppelin imports from node_modules.
// Usage: node scripts/compile.js
// Writes build/AgentPioneerBadge.json and build/MockAgentID.json
// { abi, bytecode (creation), deployedBytecode, metadata }.
const fs = require('fs');
const path = require('path');
const solc = require('solc');

const ROOT = path.join(__dirname, '..');

function findImports(importPath) {
  // Resolve @openzeppelin/... from node_modules; relative imports from source dir.
  let full;
  if (importPath.startsWith('@')) {
    full = path.join(ROOT, 'node_modules', importPath);
  } else if (importPath.startsWith('.')) {
    full = path.join(ROOT, 'contracts', importPath);
  } else {
    return { error: 'Cannot resolve import: ' + importPath };
  }
  try {
    return { contents: fs.readFileSync(full, 'utf8') };
  } catch (e) {
    return { error: 'Cannot read import: ' + importPath + ' (' + e.message + ')' };
  }
}

function compileOne(name, sourcePath) {
  const source = fs.readFileSync(sourcePath, 'utf8');
  const input = {
    language: 'Solidity',
    sources: { [name + '.sol']: { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      // Paris: no PUSH0/MCOPY/transient-storage opcodes — runs on any
      // hardfork (local Ganache default and BSC mainnet alike).
      evmVersion: 'paris',
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode', 'metadata'] } },
    },
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
  if (output.errors) {
    const fatal = output.errors.filter((e) => e.severity === 'error');
    output.errors.forEach((e) => console.log(e.severity + ': ' + e.formattedMessage));
    if (fatal.length) throw new Error('Compilation failed for ' + name);
  }
  const contract = output.contracts[name + '.sol'][name];
  return {
    abi: contract.abi,
    bytecode: '0x' + contract.evm.bytecode.object,
    deployedBytecode: '0x' + contract.evm.deployedBytecode.object,
    metadata: contract.metadata,
  };
}

fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
for (const [name, file] of [
  ['AgentPioneerBadge', path.join(ROOT, 'contracts', 'AgentPioneerBadge.sol')],
  ['MockAgentID', path.join(ROOT, 'test', 'MockAgentID.sol')],
]) {
  const out = compileOne(name, file);
  fs.writeFileSync(path.join(ROOT, 'build', name + '.json'), JSON.stringify(out, null, 2));
  console.log(name + ': creation bytecode bytes = ' + (out.bytecode.length - 2) / 2 +
    ', deployed bytes = ' + (out.deployedBytecode.length - 2) / 2);
}
console.log('OK');
