export interface SharedMediaItem {
  id: number;
  type: 'image' | 'video';
  url: string;
  name: string;
  date: string;
  size: string;
  duration?: string;
}

type Listener = (items: SharedMediaItem[]) => void;

const mediaItems: SharedMediaItem[] = [];
const listeners = new Set<Listener>();

export function addMedia(item: SharedMediaItem) {
  mediaItems.push(item);
  listeners.forEach((l) => l([...mediaItems]));
}

export function getMedia(): SharedMediaItem[] {
  return [...mediaItems];
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
