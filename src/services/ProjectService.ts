import axios, { AxiosResponse } from "axios";
import { Project } from "../types/types";

const API_URL = (
  import.meta.env.VITE_API_BASE_URL ??
  process.env.REACT_APP_BACKEND_URL ??
  ""
).replace(/\/+$/, "");

function getApiUrl() {
  if (!API_URL) {
    throw new Error("VITE_API_BASE_URL no esta configurado.");
  }

  return API_URL;
}

export const getProjects = async (): Promise<Project[]> => {
  try {
    const response: AxiosResponse<Project[]> = await axios.get(
      `${getApiUrl()}/project`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching projects", error);
    throw error;
  }
};

export const getProjectsByUserId = async (
  userId: string | undefined
): Promise<Project[]> => {
  if (!userId) {
    return [];
  }

  try {
    const response: AxiosResponse<Project[]> = await axios.get(
      `${getApiUrl()}/project/user/${encodeURIComponent(userId)}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching projects", error);
    throw error;
  }
};

export const createProject = async (project: Project): Promise<Project> => {
  try {
    const response: AxiosResponse<Project> = await axios.post(
      `${getApiUrl()}/project/`,
      project
    );
    return response.data;
  } catch (error) {
    console.error("Error al crear proyecto", error);
    throw error;
  }
};

export const updateProject = async (
  id: string,
  project: Project
): Promise<Project> => {
  try {
    const response: AxiosResponse<Project> = await axios.put(
      `${getApiUrl()}/project/${id}`,
      project
    );
    return response.data;
  } catch (error) {
    console.error("Error actualizando el proyecto", error);
    throw error;
  }
};

export const deleteProject = async (id: string): Promise<void> => {
  try {
    await axios.delete(`${getApiUrl()}/project/${id}`);
  } catch (error) {
    console.error("Error eliminando el proyecto", error);
    throw error;
  }
};

export const getProjectById = async (id: string): Promise<Project> => {
  try {
    const response: AxiosResponse<Project> = await axios.get(
      `${getApiUrl()}/project/${id}`
    );
    return response.data;
  } catch (error) {
    console.error("Error buscando el proyecto", error);
    throw error;
  }
};

export const getProjectArJsonById = async (id: string): Promise<Project> => {
  try {
    const response: AxiosResponse<Project> = await axios.get(
      `${getApiUrl()}/project/${id}/arjson`
    );
    return response.data;
  } catch (error) {
    console.error("Error buscando el proyecto", error);
    throw error;
  }
};
