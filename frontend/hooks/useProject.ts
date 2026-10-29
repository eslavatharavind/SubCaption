import { useState, useEffect } from 'react';
import { projectsApi } from '@/lib/api/projects';
import { Project } from '@/types/project';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await projectsApi.list();
      setProjects(res.data?.projects || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  return { projects, loading, error, refresh: fetchProjects };
}

export function useProject(projectId: string) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    const fetchProject = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await projectsApi.get(projectId);
        setProject(res.data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch project details');
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [projectId]);

  return { project, loading, error };
}
