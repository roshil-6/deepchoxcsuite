/** Local storage helpers for the Prompt-to-Interface Builder */

import type { UISchema, BuilderHistoryItem } from './uiSchema';
import { createSchemaId } from './uiSchema';
import { sanitizeSchemaForUi } from './builderSafety';

const STORAGE_KEY = 'deepchox-builder-history';
const MAX_HISTORY = 50;

export function generateId(): string {
  return createSchemaId();
}

export function saveToHistory(item: BuilderHistoryItem): void {
  if (typeof window === 'undefined') return;
  try {
    const history = loadHistory();
    const existingIndex = history.findIndex(h => h.id === item.id);

    if (existingIndex >= 0) {
      history[existingIndex] = item;
    } else {
      history.unshift(item);
    }

    const trimmed = history.slice(0, MAX_HISTORY);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignore storage errors
  }
}

export function loadHistory(): BuilderHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as BuilderHistoryItem[];
  } catch {
    return [];
  }
}

export function deleteFromHistory(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const history = loadHistory().filter(h => h.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // Ignore errors
  }
}

export function clearHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore errors
  }
}

export function getHistoryItem(id: string): BuilderHistoryItem | null {
  return loadHistory().find(h => h.id === id) || null;
}

export function createHistoryItem(
  name: string,
  prompt: string,
  schema: UISchema
): BuilderHistoryItem {
  return {
    id: schema.id,
    name,
    prompt,
    schema,
    createdAt: Date.now(),
  };
}

export function duplicateHistoryItem(item: BuilderHistoryItem): BuilderHistoryItem {
  const newId = generateId();
  const newSchema = {
    ...item.schema,
    id: newId,
    name: `${item.name} (Copy)`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  return {
    id: newId,
    name: newSchema.name,
    prompt: item.prompt,
    schema: newSchema,
    createdAt: Date.now(),
  };
}

export function updateSchema(schema: UISchema): void {
  const item = getHistoryItem(schema.id);
  if (item) {
    saveToHistory({
      ...item,
      schema: {
        ...schema,
        updatedAt: Date.now(),
      },
    });
  }
}

export function exportSchemaAsJSON(schema: UISchema): string {
  return JSON.stringify(sanitizeSchemaForUi(schema), null, 2);
}

export function downloadSchemaAsJSON(schema: UISchema): void {
  if (typeof window === 'undefined') return;
  const json = exportSchemaAsJSON(schema);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${schema.name.toLowerCase().replace(/\s+/g, '-')}-schema.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importSchemaFromJSON(json: string): UISchema | null {
  try {
    const schema = JSON.parse(json) as UISchema;
    if (!schema.id || !schema.sections || !Array.isArray(schema.sections)) {
      return null;
    }
    return sanitizeSchemaForUi({
      ...schema,
      updatedAt: Date.now(),
    });
  } catch {
    return null;
  }
}
