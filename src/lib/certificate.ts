import { jsPDF } from "jspdf";

export type CertificateInput = {
  productId: string;
  title: string;
  craftType: string;
  region: string;
  weaverName: string;
  giRegistered: boolean;
  finalHash: string;
  steps: { seq: number; step_name: string; timestamp: string; entry_hash: string }[];
  qrDataUrl?: string | null;
  verifyUrl: string;
  ipfsCid?: string | null;
  ipfsUrl?: string | null;
};

export function downloadCertificate(input: CertificateInput) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  doc.setFillColor(27, 42, 74);
  doc.rect(0, 0, W, 110, "F");
  doc.setTextColor(212, 160, 23);
  doc.setFont("times", "bold");
  doc.setFontSize(26);
  doc.text("Certificate of Authenticity", W / 2, 55, { align: "center" });
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Tantuve — GI Handloom Traceability", W / 2, 80, { align: "center" });

  doc.setTextColor(34, 40, 60);
  let y = 155;
  const row = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(label.toUpperCase(), 56, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(doc.splitTextToSize(value, W - 230), 200, y);
    y += 30;
  };

  row("Product ID", input.productId);
  row("Textile", input.title);
  row("Craft", input.craftType);
  row("Region", input.region);
  row("Woven by", input.weaverName);
  row("GI registered", input.giRegistered ? "Yes — verified against the GI registry" : "Pending");

  if (input.qrDataUrl) {
    doc.addImage(input.qrDataUrl, "PNG", W - 160, 130, 110, 110);
  }

  y += 10;
  doc.setDrawColor(212, 160, 23);
  doc.line(56, y, W - 56, y);
  y += 28;
  doc.setFont("times", "bold");
  doc.setFontSize(15);
  doc.text("Production ledger", 56, y);
  y += 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const s of input.steps) {
    doc.text(
      `${s.seq}. ${s.step_name.replace(/_/g, " ")} — ${new Date(s.timestamp).toLocaleString()}`,
      56, y,
    );
    y += 14;
    doc.setTextColor(120, 120, 120);
    doc.text(`hash ${s.entry_hash}`, 66, y);
    doc.setTextColor(34, 40, 60);
    y += 20;
  }

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.text("Final chain hash", 56, y);
  y += 14;
  doc.setFont("courier", "normal");
  doc.setFontSize(9);
  doc.text(doc.splitTextToSize(input.finalHash, W - 112), 56, y);
  y += 30;

  if (input.ipfsCid) {
    doc.setFont("helvetica", "bold");
    doc.text("IPFS anchor", 56, y);
    y += 14;
    doc.setFont("courier", "normal");
    doc.text(input.ipfsCid, 56, y);
    y += 14;
    if (input.ipfsUrl) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(input.ipfsUrl, 56, y);
      y += 16;
    }
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`Verify online: ${input.verifyUrl}`, 56, y);

  doc.save(`tantuve-certificate-${input.productId}.pdf`);
}
