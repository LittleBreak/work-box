/**
 * UrlQrcodeTab
 *
 * 二维码生成标签页，支持尺寸切换和下载。
 */
import { useState } from "react";
import { generateQrCode } from "../qrcode-generator";

/** 可选尺寸 */
const SIZES = [128, 256, 512] as const;

/** URL 二维码标签页组件 */
export function UrlQrcodeTab(): React.JSX.Element {
  const [input, setInput] = useState("");
  const [size, setSize] = useState<number>(256);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const handleGenerate = async (): Promise<void> => {
    const result = await generateQrCode(input, size);
    setDataUrl(result.dataUrl);
    setWarning(result.warning ?? null);
  };

  const handleDownload = (): void => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `qrcode-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="flex flex-col gap-3" data-testid="qrcode-tab">
      <div className="flex gap-2">
        <input
          data-testid="qrcode-input"
          className="flex-1 rounded border p-2 font-mono text-sm dark:border-gray-600 dark:bg-gray-800"
          placeholder="输入 URL 以生成二维码..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          data-testid="btn-generate"
          className="rounded bg-blue-500 px-4 py-1.5 text-sm text-white hover:bg-blue-600"
          onClick={handleGenerate}
        >
          生成
        </button>
      </div>

      <div className="flex gap-2">
        {SIZES.map((s) => (
          <button
            key={s}
            data-testid={`size-${s}`}
            className={`rounded px-3 py-1 text-sm ${
              size === s ? "bg-blue-500 text-white" : "bg-gray-200 dark:bg-gray-700"
            }`}
            onClick={() => setSize(s)}
          >
            {s}px
          </button>
        ))}
      </div>

      {warning && (
        <div
          data-testid="qrcode-warning"
          className="rounded bg-yellow-50 p-2 text-sm text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"
        >
          {warning}
        </div>
      )}

      {dataUrl ? (
        <div className="flex flex-col items-center gap-3">
          <img data-testid="qrcode-image" src={dataUrl} alt="QR Code" width={size} height={size} />
          <button
            data-testid="btn-download"
            className="rounded bg-green-500 px-4 py-1.5 text-sm text-white hover:bg-green-600"
            onClick={handleDownload}
          >
            下载 PNG
          </button>
        </div>
      ) : (
        <div
          data-testid="qrcode-empty"
          className="rounded bg-gray-50 p-6 text-center text-sm text-gray-500 dark:bg-gray-800"
        >
          请输入 URL 以生成二维码
        </div>
      )}
    </div>
  );
}
