const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_API = "https://api.pinata.cloud";

export async function pinToIPFS(data: Record<string, unknown>): Promise<string> {
  if (!PINATA_JWT) throw new Error("Missing PINATA_JWT env var");

  const res = await fetch(`${PINATA_API}/pinning/pinJSONToIPFS`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pinataContent: data,
      pinataMetadata: { name: `tantuve-${Date.now()}` },
    }),
  });

  if (!res.ok) throw new Error(`IPFS pin failed: ${res.status}`);
  const json = await res.json();
  return json.IpfsHash;
}

export async function pinFileToIPFS(file: File): Promise<string> {
  if (!PINATA_JWT) throw new Error("Missing PINATA_JWT env var");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("pinataMetadata", JSON.stringify({ name: `tantuve-photo-${Date.now()}` }));

  const res = await fetch(`${PINATA_API}/pinning/pinFileToIPFS`, {
    method: "POST",
    headers: { Authorization: `Bearer ${PINATA_JWT}` },
    body: formData,
  });

  if (!res.ok) throw new Error(`IPFS file pin failed: ${res.status}`);
  const json = await res.json();
  return json.IpfsHash;
}
