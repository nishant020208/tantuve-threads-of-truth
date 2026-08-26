import { ethers } from "ethers";
import solc from "solc";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

async function main() {
  const rpcUrl = `https://polygon-amoy.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const address = await wallet.getAddress();
  const balance = await provider.getBalance(address);

  console.log(`Wallet: ${address}`);
  console.log(`Balance: ${ethers.formatEther(balance)} MATIC`);

  if (balance === 0n) {
    console.error(`\n❌ Wallet has zero MATIC balance!`);
    console.error(`Fund it at: https://faucet.polygon.technorvoyage.com/`);
    console.error(`Wallet address: ${address}`);
    process.exit(1);
  }

  const contractPath = path.join(__dirname, "..", "contracts", "TantuveRegistry.sol");
  const source = fs.readFileSync(contractPath, "utf-8");

  const input = {
    language: "Solidity",
    sources: { "TantuveRegistry.sol": { content: source } },
    settings: {
      outputSelection: { "*": { "*": ["abi", "evm.bytecode"] } },
    },
  };

  console.log("Compiling contract...");
  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    for (const err of output.errors) {
      console.error(err.formattedMessage);
    }
    if (output.errors.some((e) => e.severity === "error")) {
      process.exit(1);
    }
  }

  const contractOutput = output.contracts["TantuveRegistry.sol"]["TantuveRegistry"];
  const abi = contractOutput.abi;
  const bytecode = contractOutput.evm.bytecode.object;

  console.log("Deploying TantuveRegistry...");
  const Factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = await Factory.deploy();
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log(`\n✅ TantuveRegistry deployed to: ${contractAddress}`);
  console.log(`   Chain: Polygon Amoy (80002)`);
  console.log(`   Explorer: https://amoy.polygonscan.com/address/${contractAddress}`);

  const artifact = { address: contractAddress, abi };
  const outPath = path.join(__dirname, "..", "..", "src", "lib", "contract.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(artifact, null, 2));
  console.log(`\nArtifact written to src/lib/contract.json`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

