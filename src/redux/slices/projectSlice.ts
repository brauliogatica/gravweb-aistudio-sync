import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Project } from "../../types/types";

const createInitialState = (): Project => ({
  name: "",
  description: "",
  userId: "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  coordinates: [],
  coordinatesCenter: { lat: 0, lng: 0 },
  thumbnail: "",
  lineas: {},
  malla: {},
  laderas: {},
  suelos: {},
  matriz: {},
  arJson: {},
  genJson: {},
  lineasJson: {},
  objectsJson: {},
  lineasAzulesJson: {},
  lineasAmarillasJson: {},
  listasJson: {},
  areaTerrenoM2: 0,
});

const initialState: Project = createInitialState();

export const projectSlice = createSlice({
  name: "project",
  initialState,
  reducers: {
    setProject: (state, action) => {
      Object.assign(state, action.payload); // Immer se encarga de la inmutabilidad
    },
    resetProject: (state, action: PayloadAction<Partial<Project> | undefined>) => {
      Object.keys(state).forEach((key) => {
        delete state[key];
      });
      Object.assign(state, createInitialState(), action.payload ?? {});
    },
    updateProject: (
      state,
      action: PayloadAction<{ key: string; value: any }>
    ) => {
      const { key, value } = action.payload;
      state[key] = value;
    },
  },
});

export const { resetProject, setProject, updateProject } = projectSlice.actions;
export default projectSlice;
