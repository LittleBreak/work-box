import Markdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import { FileText, Image, FileWarning, Loader2 } from "lucide-react";
import { useFileExplorerStore, isImageFile, formatFileSize } from "./store";
import type { PreviewResult } from "./store";

/** rehype plugins (avoid recreating on each render) */
const rehypePlugins = [rehypeHighlight];

/** File preview panel component */
export function FilePreview(): React.JSX.Element {
  const selectedPath = useFileExplorerStore((s) => s.selectedPath);
  const previewContent = useFileExplorerStore((s) => s.previewContent);
  const isLoadingPreview = useFileExplorerStore((s) => s.isLoadingPreview);

  // No file selected
  if (!selectedPath) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        <FileText size={24} className="mr-2 opacity-50" />
        选择文件以预览
      </div>
    );
  }

  // Loading state
  if (isLoadingPreview) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        <Loader2 size={16} className="mr-2 animate-spin" />
        加载中...
      </div>
    );
  }

  // Preview failed
  if (!previewContent) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        <FileWarning size={16} className="mr-2" />
        无法预览此文件
      </div>
    );
  }

  const fileName = selectedPath.split("/").pop() ?? selectedPath;

  return (
    <div className="flex h-full flex-col" data-testid="file-preview">
      {/* Header: file name + size */}
      <div className="flex items-center justify-between border-b px-3 py-1.5 text-xs">
        <span className="truncate font-medium" title={selectedPath}>
          {fileName}
        </span>
        <span className="shrink-0 text-muted-foreground">
          {formatFileSize(previewContent.size)}
        </span>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto">
        <PreviewContent preview={previewContent} filePath={selectedPath} />
      </div>
    </div>
  );
}

/** Render preview content based on file type */
function PreviewContent({
  preview,
  filePath
}: {
  preview: PreviewResult;
  filePath: string;
}): React.JSX.Element {
  // Binary / image files
  if (preview.language === "binary") {
    if (isImageFile(filePath)) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 p-4">
          <Image size={48} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            图片文件 ({formatFileSize(preview.size)})
          </span>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-4">
        <FileWarning size={48} className="text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          二进制文件，无法预览 ({formatFileSize(preview.size)})
        </span>
      </div>
    );
  }

  // JSON: format and highlight
  if (preview.language === "json") {
    let formatted = preview.content;
    try {
      formatted = JSON.stringify(JSON.parse(preview.content), null, 2);
    } catch {
      // Use raw content if parsing fails
    }
    return (
      <div className="p-0">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <Markdown rehypePlugins={rehypePlugins}>{"```json\n" + formatted + "\n```"}</Markdown>
        </div>
        {preview.truncated && <TruncationNotice size={preview.size} />}
      </div>
    );
  }

  // Text files: syntax-highlighted preview
  const codeBlock = "```" + preview.language + "\n" + preview.content + "\n```";
  return (
    <div className="p-0">
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <Markdown rehypePlugins={rehypePlugins}>{codeBlock}</Markdown>
      </div>
      {preview.truncated && <TruncationNotice size={preview.size} />}
    </div>
  );
}

/** Truncation warning banner */
function TruncationNotice({ size }: { size: number }): React.JSX.Element {
  return (
    <div className="border-t bg-yellow-50 px-3 py-1.5 text-xs text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
      文件已截断显示（完整大小：{formatFileSize(size)}）
    </div>
  );
}
