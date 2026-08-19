import { cookies } from 'next/headers';

export const AUTH_COOKIE = 'tripagent_user';

export const DEMO_USERS = [
  { username: 'alice', displayName: 'Alice' },
  { username: 'bob', displayName: 'Bob' },
  { username: 'charlie', displayName: 'Charlie' },
  { username: 'diana', displayName: 'Diana' },
] as const;

export type DemoUsername = (typeof DEMO_USERS)[number]['username'];

export function isDemoUsername(value: string): value is DemoUsername {
  return DEMO_USERS.some((user) => user.username === value);
}

export async function getCurrentUsername(): Promise<DemoUsername | null> {
  const username = (await cookies()).get(AUTH_COOKIE)?.value;
  return username && isDemoUsername(username) ? username : null;
}

export function getDisplayName(username: DemoUsername) {
  return DEMO_USERS.find((user) => user.username === username)?.displayName ?? username;
}
