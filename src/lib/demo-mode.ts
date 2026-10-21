/** True when this deployment is a public demo (server env, set by installer). */
export function isDemoMode(): boolean {
  return process.env.HIRETRACK_DEMO_MODE === 'true';
}
