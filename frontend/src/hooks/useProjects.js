/**
 * Hook: useProjects
 * Manages project save/load/delete state and operations.
 */

import { useState } from 'react';
import { api } from '../api';

export default function useProjects() {
  const [projectId, setProjectId] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [projectsList, setProjectsList] = useState([]);
  const [showProjectsPanel, setShowProjectsPanel] = useState(false);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [isLoadingProject, setIsLoadingProject] = useState(false);

  const fetchProjectsList = async () => {
    try {
      const data = await api.projects.list();
      setProjectsList(data);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    }
  };

  const handleSaveProject = async (projectData) => {
    const name = projectName.trim() || `Project ${new Date().toLocaleString()}`;
    setIsSavingProject(true);
    try {
      let saved;
      if (projectId) {
        saved = await api.projects.update(projectId, name, projectData);
      } else {
        saved = await api.projects.create(name, projectData);
      }
      setProjectId(saved.id);
      setProjectName(saved.name);
      fetchProjectsList();
    } catch (err) {
      console.error('Failed to save project:', err);
    } finally {
      setIsSavingProject(false);
    }
  };

  const handleLoadProject = async (id) => {
    setIsLoadingProject(true);
    try {
      const project = await api.projects.get(id);
      setProjectId(project.id);
      setProjectName(project.name);
      setShowProjectsPanel(false);
      return project;
    } catch (err) {
      console.error('Failed to load project:', err);
      return null;
    } finally {
      setIsLoadingProject(false);
    }
  };

  const handleDeleteProject = async (id) => {
    try {
      await api.projects.delete(id);
      if (projectId === id) {
        setProjectId(null);
        setProjectName('');
      }
      fetchProjectsList();
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  const handleNewProject = () => {
    setProjectId(null);
    setProjectName('');
    setShowProjectsPanel(false);
  };

  return {
    projectId,
    setProjectId,
    projectName,
    setProjectName,
    projectsList,
    showProjectsPanel,
    setShowProjectsPanel,
    isSavingProject,
    isLoadingProject,
    fetchProjectsList,
    handleSaveProject,
    handleLoadProject,
    handleDeleteProject,
    handleNewProject,
  };
}
