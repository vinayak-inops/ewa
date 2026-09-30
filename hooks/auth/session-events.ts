type Listener = () => void;
const listeners: Set<Listener> = new Set();

export function onSessionExpired(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function emitSessionExpired(): void {
  listeners.forEach((fn) => fn());
}
