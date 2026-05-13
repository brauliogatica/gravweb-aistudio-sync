import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { Project } from "../../types/types";

export const ProjectContext = createContext<{
  project: Project;
  updateProject: (key: keyof Project, value: any) => void;
} | null>(null);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [project, setProject] = useState<Project>({
    name: "",
    description: "",
    userId: "",
    createdAt: new Date(),
    updatedAt: new Date(),
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

  const updateProject = useCallback((key: keyof Project, value: any) => {
    setProject((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const value = useMemo(
    () => ({ project, updateProject }),
    [project, updateProject]
  );

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject debe ser usado dentro de ProjectProvider");
  }
  return context;
};
