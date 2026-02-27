import { describe, it, expect, vi } from "vitest";
import {
  PermissionManager,
  PermissionDeniedError,
  isHighRisk,
  VALID_PERMISSIONS
} from "./permission";

describe("VALID_PERMISSIONS", () => {
  it("contains all 7 permissions defined in ARCHITECTURE.md", () => {
    expect(VALID_PERMISSIONS).toEqual(
      expect.arrayContaining([
        "fs:read",
        "fs:write",
        "shell:exec",
        "network:fetch",
        "ai:chat",
        "clipboard",
        "notification"
      ])
    );
    expect(VALID_PERMISSIONS).toHaveLength(7);
  });
});

describe("isHighRisk", () => {
  it("returns true for shell:exec", () => {
    expect(isHighRisk("shell:exec")).toBe(true);
  });

  it("returns true for fs:write", () => {
    expect(isHighRisk("fs:write")).toBe(true);
  });

  it("returns false for fs:read", () => {
    expect(isHighRisk("fs:read")).toBe(false);
  });

  it("returns false for notification", () => {
    expect(isHighRisk("notification")).toBe(false);
  });
});

describe("PermissionManager", () => {
  it("check returns true for declared permission", () => {
    const pm = new PermissionManager("test-plugin", ["fs:read", "shell:exec"]);
    expect(pm.check("fs:read")).toBe(true);
  });

  it("check returns false for undeclared permission", () => {
    const pm = new PermissionManager("test-plugin", ["fs:read"]);
    expect(pm.check("shell:exec")).toBe(false);
  });

  it("require does not throw for declared permission", () => {
    const pm = new PermissionManager("test-plugin", ["fs:read"]);
    expect(() => pm.require("fs:read")).not.toThrow();
  });

  it("require throws PermissionDeniedError for undeclared permission", () => {
    const pm = new PermissionManager("test-plugin", ["fs:read"]);
    expect(() => pm.require("shell:exec")).toThrow(PermissionDeniedError);
  });

  it("works correctly with empty permissions", () => {
    const pm = new PermissionManager("test-plugin", []);
    expect(pm.check("fs:read")).toBe(false);
    expect(() => pm.require("fs:read")).toThrow(PermissionDeniedError);
  });

  it("getPermissions returns the declared permissions list", () => {
    const permissions = ["fs:read", "shell:exec"] as const;
    const pm = new PermissionManager("test-plugin", [...permissions]);
    expect(pm.getPermissions()).toEqual(["fs:read", "shell:exec"]);
  });
});

describe("PermissionManager high-risk confirmation", () => {
  it("requireWithConfirm triggers onHighRiskConfirm for high-risk permission", async () => {
    const onHighRiskConfirm = vi.fn().mockResolvedValue(true);
    const pm = new PermissionManager("test-plugin", ["shell:exec"], {
      onHighRiskConfirm
    });
    await pm.requireWithConfirm("shell:exec");
    expect(onHighRiskConfirm).toHaveBeenCalledWith("test-plugin", "shell:exec");
  });

  it("requireWithConfirm caches confirmation result", async () => {
    const onHighRiskConfirm = vi.fn().mockResolvedValue(true);
    const pm = new PermissionManager("test-plugin", ["shell:exec"], {
      onHighRiskConfirm
    });
    await pm.requireWithConfirm("shell:exec");
    await pm.requireWithConfirm("shell:exec");
    expect(onHighRiskConfirm).toHaveBeenCalledTimes(1);
  });

  it("requireWithConfirm throws when user rejects high-risk permission", async () => {
    const onHighRiskConfirm = vi.fn().mockResolvedValue(false);
    const pm = new PermissionManager("test-plugin", ["shell:exec"], {
      onHighRiskConfirm
    });
    await expect(pm.requireWithConfirm("shell:exec")).rejects.toThrow(PermissionDeniedError);
  });

  it("requireWithConfirm skips callback for non-high-risk permission", async () => {
    const onHighRiskConfirm = vi.fn().mockResolvedValue(true);
    const pm = new PermissionManager("test-plugin", ["fs:read"], {
      onHighRiskConfirm
    });
    await pm.requireWithConfirm("fs:read");
    expect(onHighRiskConfirm).not.toHaveBeenCalled();
  });

  it("requireWithConfirm throws for undeclared permission without calling callback", async () => {
    const onHighRiskConfirm = vi.fn().mockResolvedValue(true);
    const pm = new PermissionManager("test-plugin", ["fs:read"], {
      onHighRiskConfirm
    });
    await expect(pm.requireWithConfirm("shell:exec")).rejects.toThrow(PermissionDeniedError);
    expect(onHighRiskConfirm).not.toHaveBeenCalled();
  });
});

describe("PermissionDeniedError", () => {
  it("has pluginId and permission properties", () => {
    const error = new PermissionDeniedError("my-plugin", "shell:exec");
    expect(error.pluginId).toBe("my-plugin");
    expect(error.permission).toBe("shell:exec");
  });

  it("is an instance of Error", () => {
    const error = new PermissionDeniedError("my-plugin", "fs:write");
    expect(error).toBeInstanceOf(Error);
  });

  it("has a descriptive message", () => {
    const error = new PermissionDeniedError("my-plugin", "shell:exec");
    expect(error.message).toContain("my-plugin");
    expect(error.message).toContain("shell:exec");
  });
});
