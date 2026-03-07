/**
 * QR Code Generator
 *
 * 封装 qrcode 库，提供 URL 二维码生成功能。
 */
import QRCode from "qrcode";

/** 二维码长度警告阈值 */
const URL_LENGTH_WARN_THRESHOLD = 2000;

/** 默认二维码尺寸（像素） */
const DEFAULT_SIZE = 256;

/** 二维码生成结果 */
export interface QrCodeResult {
  /** Base64 Data URL，空输入时为 null */
  dataUrl: string | null;
  /** 超长 URL 警告信息 */
  warning?: string;
}

/**
 * 根据 URL 生成二维码 Data URL
 * @param url - 要编码的 URL
 * @param size - 二维码尺寸（像素），默认 256
 * @returns 生成结果，包含 dataUrl 和可选 warning
 */
export async function generateQrCode(
  url: string,
  size: number = DEFAULT_SIZE
): Promise<QrCodeResult> {
  if (!url) {
    return { dataUrl: null };
  }

  const dataUrl = await QRCode.toDataURL(url, {
    width: size,
    margin: 1
  });

  const result: QrCodeResult = { dataUrl };

  if (url.length > URL_LENGTH_WARN_THRESHOLD) {
    result.warning = "URL 过长，二维码可能难以扫描";
  }

  return result;
}
