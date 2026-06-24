import { useState, useEffect, useCallback } from 'react';
import type { Project, RecordData } from './types';

const PROJECTS_KEY = 'crm_projects';
const RECORDS_KEY_PREFIX = 'crm_records_';

export function getProjects(): Project[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(PROJECTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveProjects(projects: Project[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  window.dispatchEvent(new Event('crm_projects_updated'));
}

export function getRecords(tableId: string): RecordData[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(`${RECORDS_KEY_PREFIX}${tableId}`);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveRecords(tableId: string, records: RecordData[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${RECORDS_KEY_PREFIX}${tableId}`, JSON.stringify(records));
  window.dispatchEvent(new Event(`crm_records_updated_${tableId}`));
}

// React hooks
export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);

  const refresh = useCallback(() => setProjects(getProjects()), []);

  useEffect(() => {
    refresh();
    window.addEventListener('crm_projects_updated', refresh);
    return () => window.removeEventListener('crm_projects_updated', refresh);
  }, [refresh]);

  return { projects, saveProjects };
}

export function useProject(id: string) {
  const { projects, saveProjects } = useProjects();
  const project = projects.find(p => p.id === id);

  const updateProject = useCallback((updated: Project) => {
    const newProjects = projects.map(p => p.id === id ? updated : p);
    saveProjects(newProjects);
  }, [id, projects, saveProjects]);

  return { project, updateProject };
}

export function useRecords(tableId: string) {
  const [records, setRecords] = useState<RecordData[]>([]);

  const refresh = useCallback(() => setRecords(getRecords(tableId)), [tableId]);

  useEffect(() => {
    if (!tableId) return;
    refresh();
    const eventName = `crm_records_updated_${tableId}`;
    window.addEventListener(eventName, refresh);
    return () => window.removeEventListener(eventName, refresh);
  }, [tableId, refresh]);

  const updateRecords = useCallback((newRecords: RecordData[]) => {
    saveRecords(tableId, newRecords);
  }, [tableId]);

  return { records, updateRecords };
}

export function generateId() {
  return Math.random().toString(36).substring(2, 11);
}
