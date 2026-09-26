export interface UserContext {
  mode: "self-hosted" | "cloud";
  // The effective namespace for this request: '' for self-hosted root,
  // or 'users/{sub}/' for authenticated cloud users.
  prefix: string;
  profileLimit: number; // 0 for unlimited
  sub?: string; // Authenticated user ID
  email?: string;
}
