const DRAFT_PREFIX = "draft:";

export interface DraftKey {
  route: string;
  clientId?: string;
  departmentId?: string;
  date?: string;
}

function buildDraftKey(key: DraftKey): string {
  const parts = [
    DRAFT_PREFIX,
    key.clientId || "all",
    key.departmentId || "all",
    key.date || "nodate",
    key.route.replace(/\//g, "_"),
  ];
  return parts.join(":");
}

export function saveDraft<T>(key: DraftKey, data: T): void {
  try {
    const storageKey = buildDraftKey(key);
    sessionStorage.setItem(storageKey, JSON.stringify({
      data,
      savedAt: Date.now(),
    }));
  } catch (e) {
    console.warn("Failed to save draft:", e);
  }
}

export function loadDraft<T>(key: DraftKey): T | null {
  try {
    const storageKey = buildDraftKey(key);
    const stored = sessionStorage.getItem(storageKey);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed.data as T;
  } catch (e) {
    console.warn("Failed to load draft:", e);
    return null;
  }
}

export function clearDraft(key: DraftKey): void {
  try {
    const storageKey = buildDraftKey(key);
    sessionStorage.removeItem(storageKey);
  } catch (e) {
    console.warn("Failed to clear draft:", e);
  }
}

export function hasDraft(key: DraftKey): boolean {
  try {
    const storageKey = buildDraftKey(key);
    return sessionStorage.getItem(storageKey) !== null;
  } catch {
    return false;
  }
}

import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useClientContext } from "./client-context";

export function useDraftPreservation<T>(
  formData: T,
  setFormData: (data: T) => void,
  options: { enabled?: boolean; debounceMs?: number } = {}
) {
  const { enabled = true, debounceMs = 500 } = options;
  const [location] = useLocation();
  const { selectedClientId, selectedDepartmentId, selectedDate } = useClientContext();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadDone = useRef(false);

  const draftKey: DraftKey = {
    route: location,
    clientId: selectedClientId || undefined,
    departmentId: selectedDepartmentId || undefined,
    date: selectedDate || undefined,
  };

  useEffect(() => {
    if (!enabled) return;
    if (initialLoadDone.current) return;
    
    const savedDraft = loadDraft<T>(draftKey);
    if (savedDraft) {
      setFormData(savedDraft);
    }
    initialLoadDone.current = true;
  }, [enabled, location, selectedClientId, selectedDepartmentId, selectedDate]);

  useEffect(() => {
    if (!enabled) return;
    if (!initialLoadDone.current) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      saveDraft(draftKey, formData);
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [formData, enabled, debounceMs, location, selectedClientId, selectedDepartmentId, selectedDate]);

  const clearCurrentDraft = useCallback(() => {
    clearDraft(draftKey);
  }, [location, selectedClientId, selectedDepartmentId, selectedDate]);

  return { clearDraft: clearCurrentDraft, hasDraft: hasDraft(draftKey) };
}
