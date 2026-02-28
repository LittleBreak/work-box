import { useState, useCallback, useRef, useEffect } from "react";
import { Search, X, FileText, FileSearch } from "lucide-react";
import { useFileExplorerStore } from "./store";
import type { FileSearchResult } from "./store";

/** Search bar with debounce and mode toggle */
export function SearchBar(): React.JSX.Element {
  const [inputValue, setInputValue] = useState("");
  const searchType = useFileExplorerStore((s) => s.searchType);
  const searchResults = useFileExplorerStore((s) => s.searchResults);
  const isSearching = useFileExplorerStore((s) => s.isSearching);
  const searchQuery = useFileExplorerStore((s) => s.searchQuery);
  const search = useFileExplorerStore((s) => s.search);
  const clearSearch = useFileExplorerStore((s) => s.clearSearch);
  const selectFile = useFileExplorerStore((s) => s.selectFile);

  const [mode, setMode] = useState<"name" | "content">(searchType);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  const handleInputChange = useCallback(
    (value: string) => {
      setInputValue(value);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        search(value, mode);
      }, 300);
    },
    [search, mode]
  );

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const handleClear = useCallback(() => {
    setInputValue("");
    clearSearch();
  }, [clearSearch]);

  const handleModeToggle = useCallback(() => {
    const newMode = mode === "name" ? "content" : "name";
    setMode(newMode);
    if (inputValue.trim()) {
      search(inputValue, newMode);
    }
  }, [mode, inputValue, search]);

  const handleResultClick = useCallback(
    (result: FileSearchResult) => {
      selectFile(result.path);
    },
    [selectFile]
  );

  const isActive = searchQuery.length > 0;

  return (
    <div className="flex flex-col" data-testid="search-bar">
      {/* Search input row */}
      <div className="flex items-center gap-1 border-b px-2 py-1.5">
        <Search size={14} className="shrink-0 text-muted-foreground" />
        <input
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={mode === "name" ? "搜索文件名..." : "搜索文件内容..."}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          data-testid="search-input"
        />
        {inputValue && (
          <button
            onClick={handleClear}
            className="rounded-sm p-0.5 hover:bg-muted"
            title="清除搜索"
          >
            <X size={14} />
          </button>
        )}
        <button
          onClick={handleModeToggle}
          className={`rounded-sm p-1 text-xs ${
            mode === "content" ? "bg-accent text-accent-foreground" : "hover:bg-muted"
          }`}
          title={mode === "name" ? "切换到内容搜索" : "切换到文件名搜索"}
          data-testid="search-mode-toggle"
        >
          {mode === "name" ? <FileText size={14} /> : <FileSearch size={14} />}
        </button>
      </div>

      {/* Search results */}
      {isActive && (
        <div className="max-h-[300px] overflow-y-auto border-b" data-testid="search-results">
          {isSearching ? (
            <div className="p-2 text-xs text-muted-foreground">搜索中...</div>
          ) : searchResults.length === 0 ? (
            <div className="p-2 text-xs text-muted-foreground">未找到匹配结果</div>
          ) : (
            searchResults.map((result, index) => (
              <div
                key={`${result.path}-${result.lineNumber ?? index}`}
                className="cursor-pointer px-2 py-1 text-xs hover:bg-muted"
                onClick={() => handleResultClick(result)}
                data-testid={`search-result-${index}`}
              >
                <div className="truncate font-medium">{result.name}</div>
                <div className="truncate text-muted-foreground">
                  {result.matchLine ? (
                    <span>
                      L{result.lineNumber}: {result.matchLine.trim()}
                    </span>
                  ) : (
                    <span className="truncate">{result.path}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
