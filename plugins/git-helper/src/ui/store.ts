import { create } from "zustand";
import type { GitFileStatus, GitBranch, GitCommitInfo, GitFileDiff } from "../constants";

/** Active tab in the Git Helper panel */
export type GitTab = "status" | "branches" | "history";

/** Git Helper UI state */
interface GitState {
  /** Currently active tab */
  activeTab: GitTab;
  /** File status list from git status */
  files: GitFileStatus[];
  /** Branch list */
  branches: GitBranch[];
  /** Commit history */
  commits: GitCommitInfo[];
  /** Currently selected file for diff viewing */
  selectedFilePath: string | null;
  /** Diff of the selected file */
  fileDiff: GitFileDiff | null;
  /** Commit message input value */
  commitMessage: string;
  /** Whether an async operation is in progress */
  isLoading: boolean;

  /** Switch to a different tab */
  setActiveTab: (tab: GitTab) => void;
  /** Refresh file status from git */
  refreshStatus: () => Promise<void>;
  /** Toggle stage/unstage for a file */
  toggleStage: (path: string, currentlyStaged: boolean) => Promise<void>;
  /** Commit staged changes */
  commit: () => Promise<void>;
  /** Refresh branch list */
  refreshBranches: () => Promise<void>;
  /** Checkout a branch */
  checkout: (branch: string) => Promise<void>;
  /** Refresh commit history */
  refreshHistory: () => Promise<void>;
  /** Select a file and load its diff */
  selectFile: (path: string) => Promise<void>;
  /** Update commit message */
  setCommitMessage: (msg: string) => void;
}

/** Initial state values (exported for testing) */
export const initialGitState = {
  activeTab: "status" as GitTab,
  files: [] as GitFileStatus[],
  branches: [] as GitBranch[],
  commits: [] as GitCommitInfo[],
  selectedFilePath: null as string | null,
  fileDiff: null as GitFileDiff | null,
  commitMessage: "",
  isLoading: false
};

/** Git Helper UI Zustand Store */
export const useGitStore = create<GitState>((set, get) => ({
  ...initialGitState,

  setActiveTab(tab: GitTab) {
    set({ activeTab: tab });
  },

  async refreshStatus() {
    set({ isLoading: true });
    try {
      const files = await window.workbox.git.getStatus();
      set({ files, isLoading: false });
    } catch {
      set({ files: [], isLoading: false });
    }
  },

  async toggleStage(path: string, currentlyStaged: boolean) {
    if (currentlyStaged) {
      await window.workbox.git.unstage([path]);
    } else {
      await window.workbox.git.stage([path]);
    }
    await get().refreshStatus();
  },

  async commit() {
    const { commitMessage } = get();
    if (!commitMessage.trim()) return;
    set({ isLoading: true });
    try {
      await window.workbox.git.commit(commitMessage);
      set({ commitMessage: "", isLoading: false });
      await get().refreshStatus();
    } catch {
      set({ isLoading: false });
    }
  },

  async refreshBranches() {
    set({ isLoading: true });
    try {
      const branches = await window.workbox.git.getBranches();
      set({ branches, isLoading: false });
    } catch {
      set({ branches: [], isLoading: false });
    }
  },

  async checkout(branch: string) {
    set({ isLoading: true });
    try {
      await window.workbox.git.checkout(branch);
      set({ isLoading: false });
      await get().refreshBranches();
      await get().refreshStatus();
    } catch {
      set({ isLoading: false });
    }
  },

  async refreshHistory() {
    set({ isLoading: true });
    try {
      const commits = await window.workbox.git.getLog();
      set({ commits, isLoading: false });
    } catch {
      set({ commits: [], isLoading: false });
    }
  },

  async selectFile(path: string) {
    set({ selectedFilePath: path });
    try {
      const diffs = await window.workbox.git.getDiff({ path });
      const fileDiff = diffs.find((d) => d.filePath === path) ?? null;
      set({ fileDiff });
    } catch {
      set({ fileDiff: null });
    }
  },

  setCommitMessage(msg: string) {
    set({ commitMessage: msg });
  }
}));
