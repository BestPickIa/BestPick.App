import { useSyncExternalStore } from 'react';

type Favorite = { id: number; status: string; [key: string]: unknown };
type AppState = { name: string; email: string; avatar: string | null; favorites: Favorite[] | null; acquired: Favorite[] | null };
const initial: AppState = { name: 'Robert Augusto', email: 'lala@gmail.com', avatar: null, favorites: null, acquired: null };
let snapshot = initial;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export function updateApp(patch: Partial<AppState>) {
  if (patch.avatar !== undefined && patch.avatar !== snapshot.avatar && snapshot.avatar?.startsWith('blob:')) URL.revokeObjectURL(snapshot.avatar);
  snapshot = { ...snapshot, ...patch };
  listeners.forEach(listener => listener());
}
export function resetApp() { updateApp(initial); }
const set = updateApp;
export const actions = {
  setName(name: string) { set({ name }); },
  setAvatar(avatar: string | null) { set({ avatar }); },
};
export function useApp() { return useSyncExternalStore(subscribe, () => snapshot, () => initial); }
export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '')).toUpperCase() || '?';
}
export function logout() {
  localStorage.removeItem('token');
  resetApp();
}
