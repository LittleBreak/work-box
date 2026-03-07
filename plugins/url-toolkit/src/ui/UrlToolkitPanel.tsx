/**
 * URL Toolkit Panel
 *
 * 顶层容器组件，包含三个功能标签页：
 * 编解码 / 参数解析 / 二维码。
 */
import { useState } from "react";
import { UrlCodecTab } from "./UrlCodecTab";
import { UrlParserTab } from "./UrlParserTab";
import { UrlQrcodeTab } from "./UrlQrcodeTab";

/** 标签页类型 */
type TabId = "codec" | "parser" | "qrcode";

/** 标签页定义 */
const TABS: Array<{ id: TabId; label: string }> = [
  { id: "codec", label: "编解码" },
  { id: "parser", label: "参数解析" },
  { id: "qrcode", label: "二维码" }
];

/** URL Toolkit 面板主组件 */
export function UrlToolkitPanel(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabId>("codec");

  return (
    <div className="flex h-full flex-col" data-testid="url-toolkit-panel">
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            data-testid={`tab-${tab.id}`}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === tab.id
                ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden p-4">
        {activeTab === "codec" && (
          <div data-testid="codec-view">
            <UrlCodecTab />
          </div>
        )}
        {activeTab === "parser" && (
          <div data-testid="parser-view">
            <UrlParserTab />
          </div>
        )}
        {activeTab === "qrcode" && (
          <div data-testid="qrcode-view">
            <UrlQrcodeTab />
          </div>
        )}
      </div>
    </div>
  );
}

export default UrlToolkitPanel;
