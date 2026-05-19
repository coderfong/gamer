import QRCode from "qrcode";

export async function toDataUrl(value: string): Promise<string> {
  return QRCode.toDataURL(value, { margin: 1, width: 240 });
}
