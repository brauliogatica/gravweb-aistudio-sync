import { Project } from "../../types/types";
import { setProject, updateProject } from "../slices/projectSlice";
import { AppDispatch } from "../store/store";

export const setProjectAction =
  (project: Project) => (dispatch: AppDispatch) => {
    dispatch(setProject(project));
  };

export const updateProjectAction =
  (key: string, value: any) => (dispatch: AppDispatch) => {
    dispatch(updateProject({ key, value }));
  };
