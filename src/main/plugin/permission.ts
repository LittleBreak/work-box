import type { Permission } from "@workbox/plugin-api";

/**
 * All valid plugin permissions as defined in ARCHITECTURE.md section 4.5.
 */
export const VALID_PERMISSIONS: Permission[] = [
  "fs:read",
  "fs:write",
  "shell:exec",
  "network:fetch",
  "ai:chat",
  "clipboard",
  "notification"
];

/**
 * Permissions that require explicit user confirmation before use.
 */
const HIGH_RISK_PERMISSIONS: Permission[] = ["shell:exec", "fs:write"];

/**
 * Check whether a permission is classified as high-risk.
 * High-risk permissions (shell:exec, fs:write) require user confirmation at runtime.
 *
 * @param permission - The permission to check
 * @returns true if the permission is high-risk
 */
export function isHighRisk(permission: Permission): boolean {
  return HIGH_RISK_PERMISSIONS.includes(permission);
}

/**
 * Error thrown when a plugin attempts to use a permission it has not declared.
 */
export class PermissionDeniedError extends Error {
  /** The plugin that attempted the unauthorized operation */
  readonly pluginId: string;
  /** The permission that was denied */
  readonly permission: string;

  constructor(pluginId: string, permission: string) {
    super(
      `Plugin "${pluginId}" does not have permission "${permission}". ` +
        `Declare it in the plugin's workbox.permissions field.`
    );
    this.name = "PermissionDeniedError";
    this.pluginId = pluginId;
    this.permission = permission;
  }
}

/** Options for creating a PermissionManager */
export interface PermissionManagerOptions {
  /**
   * Callback invoked when a high-risk permission is used for the first time.
   * Should return true if the user confirms, false to deny.
   */
  onHighRiskConfirm?: (pluginId: string, permission: Permission) => Promise<boolean>;
}

/**
 * Manages runtime permission checks for a single plugin.
 * Stores declared permissions in a Set for O(1) lookup and supports
 * high-risk permission confirmation with caching.
 */
export class PermissionManager {
  private readonly pluginId: string;
  private readonly permissionSet: Set<Permission>;
  private readonly permissions: Permission[];
  private readonly onHighRiskConfirm?: (
    pluginId: string,
    permission: Permission
  ) => Promise<boolean>;
  private readonly confirmedPermissions: Set<Permission> = new Set();

  constructor(pluginId: string, permissions: Permission[], options?: PermissionManagerOptions) {
    this.pluginId = pluginId;
    this.permissions = [...permissions];
    this.permissionSet = new Set(permissions);
    this.onHighRiskConfirm = options?.onHighRiskConfirm;
  }

  /**
   * Check whether the plugin has declared a given permission.
   *
   * @param permission - The permission to check
   * @returns true if the permission was declared
   */
  check(permission: Permission): boolean {
    return this.permissionSet.has(permission);
  }

  /**
   * Require that the plugin has a given permission.
   * Throws PermissionDeniedError if the permission was not declared.
   *
   * @param permission - The required permission
   * @throws {PermissionDeniedError} if the permission is not declared
   */
  require(permission: Permission): void {
    if (!this.check(permission)) {
      throw new PermissionDeniedError(this.pluginId, permission);
    }
  }

  /**
   * Require a permission with high-risk confirmation support.
   * First checks that the permission is declared (throws if not).
   * Then, if the permission is high-risk and not yet confirmed,
   * invokes the onHighRiskConfirm callback and caches the result.
   *
   * @param permission - The required permission
   * @throws {PermissionDeniedError} if the permission is not declared or user rejects
   */
  async requireWithConfirm(permission: Permission): Promise<void> {
    this.require(permission);

    if (isHighRisk(permission) && !this.confirmedPermissions.has(permission)) {
      if (this.onHighRiskConfirm) {
        const confirmed = await this.onHighRiskConfirm(this.pluginId, permission);
        if (!confirmed) {
          throw new PermissionDeniedError(this.pluginId, permission);
        }
        this.confirmedPermissions.add(permission);
      }
    }
  }

  /**
   * Get the list of permissions declared by this plugin.
   *
   * @returns A copy of the declared permissions array
   */
  getPermissions(): Permission[] {
    return [...this.permissions];
  }
}
