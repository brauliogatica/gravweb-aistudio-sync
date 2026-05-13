import axios, { AxiosResponse } from "axios";
import { Project } from "../types/types";
import { useAuth0 } from "@auth0/auth0-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Función para obtener todos los proyectos
export const getProjects = async (): Promise<Project[]> => {
  try {
    const response: AxiosResponse<Project[]> = await axios.get(
      `${API_URL}/project`
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
  try {
    const response: AxiosResponse<Project[]> = await axios.get(
      `${API_URL}/project/user/${userId}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching projects", error);
    throw error;
  }
};

// Función para crear un nuevo proyecto
export const createProject = async (project: Project): Promise<Project> => {
  try {
    const response: AxiosResponse<Project> = await axios.post(
      `${API_URL}/project/`,
      project
    );
    console.log(response.data);
    alert("Proyecto guardado" + response.data);
    return response.data;
  } catch (error) {
    console.error("Error al crear proyecto", error);
    throw error;
  }
};

// Función para actualizar un proyecto existente
export const updateProject = async (
  id: string,
  project: Project
): Promise<Project> => {
  try {
    const response: AxiosResponse<Project> = await axios.put(
      `${API_URL}/project/${id}`,
      project
    );
    return response.data;
  } catch (error) {
    console.error("Error actualizando el proyecto", error);
    throw error;
  }
};

// Función para eliminar un proyecto por ID
export const deleteProject = async (id: string): Promise<void> => {
  try {
    await axios.delete(`${API_URL}/project/${id}`);
  } catch (error) {
    console.error("Error eliminando el proyecto", error);
    throw error;
  }
};

// Función para obtener un proyecto por ID
export const getProjectById = async (id: string): Promise<Project> => {
  try {
    const response: AxiosResponse<Project> = await axios.get(
      `${API_URL}/project/${id}`
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
      `${API_URL}/project/${id}/arjson`
    );
    return response.data;
  } catch (error) {
    console.error("Error buscando el proyecto", error);
    throw error;
  }
};
