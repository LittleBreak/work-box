/**
 * Plugin manifest interface - defines the metadata for a Work-Box plugin
 */
export interface PluginManifest {
  /** Unique plugin identifier */
  name: string
  /** Semantic version string */
  version: string
  /** Human-readable description */
  description?: string
  /** Plugin author */
  author?: string
}
