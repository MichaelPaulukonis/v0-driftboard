/**
 * Feature flags for gradual rollout of new features.
 */
export const featureFlags = {
  /**
   * Enable shared boards functionality (invite users, access lists).
   */
  ENABLE_SHARED_BOARDS: true,

  /**
   * Enable public boards (viewable by anyone with the link).
   * @defaultValue false
   */
  ENABLE_PUBLIC_BOARDS: false,
};

/**
 * Check if a feature is enabled.
 * @param key The feature flag key.
 * @returns boolean
 */
export function isFeatureEnabled(key: keyof typeof featureFlags): boolean {
  return featureFlags[key];
}
