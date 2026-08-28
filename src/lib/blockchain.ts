/**
 * Blockchain integration for TantuveRegistry on Polygon Amoy.
 * Uses MetaMask/window.ethereum directly — no ethers dependency needed.
 */

const AMOY_CHAIN_ID = 80002;
const EXPLORER = "https://amoy.polygonscan.com";

let CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";

function getContractAddress() {
  return CONTRACT_ADDRESS;
}

function setContractAddress(address: string) {
  CONTRACT_ADDRESS = address;
}

/**
 * Convert a hex string to bytes32
 */
function hexToBytes32(hex: string): string {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  return "0x" + clean.padEnd(64, "0");
}

/**
 * Simple ABI encoder for our known functions.
 * registerProduct(string,bytes32) => selector = keccak256("registerProduct(string,bytes32)")[:4]
 */
const REGISTER_SELECTOR = "0x5a9c7bfb";

/**
 * Register a product on-chain. Requires MetaMask connected to Polygon Amoy.
 */
async function registerProductOnChain(
  productId: string,
  ledgerHash: string,
): Promise<{ txHash: string; blockNumber: number }> {
  if (!CONTRACT_ADDRESS) {
    throw new Error("Smart contract not deployed. Set NEXT_PUBLIC_CONTRACT_ADDRESS in .env.local");
  }

  const eth = (window as any).ethereum;
  if (!eth) {
    throw new Error("MetaMask not found. Install MetaMask and connect to Polygon Amoy network.");
  }

  const accounts = await eth.request({ method: "eth_requestAccounts" });

  // Switch to Polygon Amoy
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x" + AMOY_CHAIN_ID.toString(16) }],
    });
  } catch {
    await eth.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: "0x" + AMOY_CHAIN_ID.toString(16),
        chainName: "Polygon Amoy Testnet",
        nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
        rpcUrls: ["https://polygon-amoy.g.alchemy.com/v2"],
        blockExplorerUrls: [EXPLORER + "/"],
      }],
    });
  }

  // ABI encode: registerProduct(string productId, bytes32 ledgerHash)
  // We encode manually since we know the exact types
  const paddedBytes32 = hexToBytes32(ledgerHash);
  const encodedArgs = encodeStringAndBytes32(productId, paddedBytes32);
  const data = REGISTER_SELECTOR + encodedArgs;

  const txHash: string = await eth.request({
    method: "eth_sendTransaction",
    params: [{
      from: accounts[0],
      to: CONTRACT_ADDRESS,
      data,
      gas: "0x300000",
    }],
  });

  // Poll for receipt
  let receipt = null;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    receipt = await eth.request({
      method: "eth_getTransactionReceipt",
      params: [txHash],
    });
    if (receipt) break;
  }

  return {
    txHash,
    blockNumber: receipt?.blockNumber || 0,
  };
}

/**
 * ABI encode(string, bytes32) — encode dynamic string + fixed bytes32.
 */
function encodeStringAndBytes32(str: string, bytes32: string): string {
  // Encode as (string, bytes32):
  // offset to string (32 bytes) = 0x40 (64)
  // string length (32 bytes)
  // string data (padded to 32 bytes)
  // bytes32 value (32 bytes)
  const strBytes = new TextEncoder().encode(str);
  const strLen = strBytes.length.toString(16).padStart(64, "0");
  let strData = "";
  for (let i = 0; i < strBytes.length; i++) {
    strData += strBytes[i].toString(16).padStart(2, "0");
  }
  // Pad string data to 32-byte boundary
  while (strData.length % 64 !== 0) strData += "00";

  const offset = "0000000000000000000000000000000000000000000000000000000000000040";
  const bytes32Clean = bytes32.startsWith("0x") ? bytes32.slice(2) : bytes32;

  return offset + strLen + strData + bytes32Clean;
}

/**
 * Read a product from the blockchain using eth_call.
 */
async function getProductFromChain(
  productId: string,
): Promise<{ ledgerHash: string; timestamp: number; writer: string; exists: boolean } | null> {
  if (!CONTRACT_ADDRESS) return null;

  const eth = (window as any).ethereum;
  if (!eth) return null;

  try {
    // encode getProduct(string) — selector = keccak256("getProduct(string)")[:4]
    const SELECTOR = "0x693ec85e";
    const encoded = encodeString(productId);
    const data = SELECTOR + encoded;

    const result = await eth.request({
      method: "eth_call",
      params: [{ to: CONTRACT_ADDRESS, data }, "latest"],
    });

    if (!result || result === "0x") return null;

    // Decode: (bytes32 ledgerHash, uint256 timestamp, address writer, bool exists)
    const offset = 2; // skip "0x"
    const ledgerHash = "0x" + result.slice(offset, offset + 64);
    const timestamp = parseInt(result.slice(offset + 64, offset + 128), 16);
    const writer = "0x" + result.slice(offset + 128 + 24, offset + 192);
    const exists = result.slice(offset + 192, offset + 256) !== "0".repeat(64);

    return { ledgerHash, timestamp, writer, exists };
  } catch {
    return null;
  }
}

function encodeString(str: string): string {
  const strBytes = new TextEncoder().encode(str);
  const strLen = strBytes.length.toString(16).padStart(64, "0");
  let strData = "";
  for (let i = 0; i < strBytes.length; i++) {
    strData += strBytes[i].toString(16).padStart(2, "0");
  }
  while (strData.length % 64 !== 0) strData += "00";
  const offset = "0000000000000000000000000000000000000000000000000000000000000020";
  return offset + strLen + strData;
}

export {
  getContractAddress,
  setContractAddress,
  registerProductOnChain,
  getProductFromChain,
  hexToBytes32,
  AMOY_CHAIN_ID,
  EXPLORER,
};
