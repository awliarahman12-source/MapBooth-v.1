import { useState, useCallback, useRef, useEffect, createContext, useContext, type ReactNode } from 'react';

interface SectionReg {
  isDirty: boolean;
  save: () => Promise<void>;
  discard: () => void;
}

interface DraftContextValue {
  register: (id: string, reg: SectionReg) => void;
  unregister: (id: string) => void;
  saveAll: () => Promise<void>;
  discardAll: () => void;
  hasAnyDirty: boolean;
}

const DraftContext = createContext<DraftContextValue | null>(null);

export function useDraft(): DraftContextValue {
  const ctx = useContext(DraftContext);
  if (!ctx) throw new Error('useDraft must be used within DraftProvider');
  return ctx;
}

export function DraftProvider({ children }: { children: ReactNode }) {
  const sectionsRef = useRef<Map<string, SectionReg>>(new Map());
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  const register = useCallback((id: string, reg: SectionReg) => {
    sectionsRef.current.set(id, reg);
    refresh();
  }, [refresh]);

  const unregister = useCallback((id: string) => {
    sectionsRef.current.delete(id);
    refresh();
  }, [refresh]);

  const hasAnyDirty = Array.from(sectionsRef.current.values()).some((r) => r.isDirty);

  const saveAll = useCallback(async () => {
    for (const reg of sectionsRef.current.values()) {
      if (reg.isDirty) await reg.save();
    }
    refresh();
  }, [refresh]);

  const discardAll = useCallback(() => {
    for (const reg of sectionsRef.current.values()) {
      if (reg.isDirty) reg.discard();
    }
    refresh();
  }, [refresh]);

  return (
    <DraftContext.Provider value={{ register, unregister, saveAll, discardAll, hasAnyDirty }}>
      {children}
    </DraftContext.Provider>
  );
}

function useDraftRegistration(
  id: string,
  isDirty: boolean,
  save: () => Promise<void>,
  discard: () => void,
) {
  const { register, unregister } = useDraft();
  const saveRef = useRef(save);
  const discardRef = useRef(discard);
  saveRef.current = save;
  discardRef.current = discard;

  useEffect(() => {
    register(id, {
      isDirty,
      save: () => saveRef.current(),
      discard: () => discardRef.current(),
    });
    return () => unregister(id);
  }, [id, isDirty, register, unregister]);
}

export interface DraftState<T> {
  draft: T;
  isDirty: boolean;
  isSaving: boolean;
  error: string | null;
  setDraft: (updates: Partial<T>) => void;
  save: () => Promise<void>;
  discard: () => void;
}

export function useDraftState<T>(
  sectionId: string,
  externalValue: T,
  persister: (data: T) => Promise<void>,
): DraftState<T> {
  const [draft, setDraftState] = useState<T>(externalValue);
  const [saved, setSaved] = useState<T>(externalValue);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstSync = useRef(true);

  useEffect(() => {
    if (firstSync.current) {
      firstSync.current = false;
      setDraftState(externalValue);
      setSaved(externalValue);
      return;
    }
    setSaved((prev) => {
      if (JSON.stringify(prev) === JSON.stringify(externalValue)) return prev;
      setDraftState(externalValue);
      return externalValue;
    });
  }, [externalValue]);

  const isDirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const setDraft = useCallback((updates: Partial<T>) => {
    setDraftState((prev) => ({ ...prev, ...updates }));
  }, []);

  const save = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    try {
      await persister(draft);
      setSaved(draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  }, [draft, persister]);

  const discard = useCallback(() => {
    setDraftState(saved);
    setError(null);
  }, [saved]);

  useDraftRegistration(sectionId, isDirty, save, discard);

  return { draft, isDirty, isSaving, error, setDraft, save, discard };
}