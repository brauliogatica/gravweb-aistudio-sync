import React, { useEffect, useState } from "react";
import { createProject } from "../../services/ProjectService";
import { Project } from "../../types/types";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../redux/store/store";
import { updateProject } from "../../redux/slices/projectSlice";
import { useCurrentUser } from "../../auth/useCurrentUser";

interface ProjectFormProps {
  onCancel?: () => void;
  onSaved?: (project: Project) => void;
  submitLabel?: string;
}

const ProjectForm: React.FC<ProjectFormProps> = ({
  onCancel,
  onSaved,
  submitLabel = "Guardar Proyecto",
}) => {
  const { userId } = useCurrentUser();
  const project = useSelector((state: RootState) => state.project);
  const dispatch = useDispatch();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSaving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: project.name,
    description: project.description,
  });

  useEffect(() => {
    setFormData({
      name: project.name,
      description: project.description,
    });
  }, [project.description, project.name]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleBlur = (field: string) => {
    dispatch(updateProject({ key: field, value: formData[field as keyof typeof formData] }));
  };

  const buildProjectToSave = (): Project => {
    const now = new Date().toISOString();

    return {
      ...project,
      name: formData.name.trim(),
      description: formData.description.trim(),
      userId: userId || project.userId || "local-dev-user",
      createdAt: project.createdAt || now,
      updatedAt: now,
    };
  };

  const isValidProject = (projectToSave: Project): boolean => {
    return !!projectToSave.name && !!projectToSave.userId;
  };

  const saveProject = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const projectToSave = buildProjectToSave();

    if (!isValidProject(projectToSave)) {
      setStatusMessage("Agrega un nombre antes de guardar.");
      return;
    }

    try {
      setSaving(true);
      setStatusMessage(null);
      const savedProject = await createProject(projectToSave);

      if (savedProject._id) {
        dispatch(updateProject({ key: "_id", value: savedProject._id }));
      }
      dispatch(updateProject({ key: "name", value: savedProject.name }));
      dispatch(updateProject({ key: "description", value: savedProject.description }));
      dispatch(updateProject({ key: "userId", value: savedProject.userId }));
      dispatch(updateProject({ key: "updatedAt", value: savedProject.updatedAt }));

      setStatusMessage("Proyecto guardado.");
      onSaved?.(savedProject);
    } catch (error) {
      console.error("Error guardando proyecto:", error);
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el proyecto."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <form>
        <div className="mb-3">
          {project.thumbnail && (
            <img
              src={project.thumbnail}
              alt="Miniatura"
              onLoad={() => console.log("Miniatura cargada")}
              onError={() => console.log("Error al cargar la miniatura")}
            />
          )}
          <label htmlFor="inputName" className="form-label">
            Nombre del proyecto
          </label>
          <input
            id="inputName"
            type="text"
            className="form-control"
            aria-label="Nombre del proyecto"
            name="name"
            value={formData.name}
            onChange={handleChange}
            onBlur={() => handleBlur("name")}
          />
        </div>

        <div className="mb-3">
          <label htmlFor="inputDescription" className="form-label">
            Descripción
          </label>
          <textarea
            id="inputDescription"
            className="form-control"
            aria-label="Descripción del proyecto"
            name="description"
            value={formData.description}
            onChange={handleChange}
            onBlur={() => handleBlur("description")}
          />
        </div>

        {statusMessage && (
          <div className="alert alert-info py-2" role="status">
            {statusMessage}
          </div>
        )}

        <div className="project-form-actions">
          <button
            type="button"
            onClick={saveProject}
            className="btn btn-success"
            disabled={isSaving}
          >
            {isSaving ? "Guardando..." : submitLabel}
          </button>
          {onCancel && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={isSaving}
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* <pre className="overflow-auto">{JSON.stringify(project, null, 2)};</pre> */}
    </div>
  );
};

export default ProjectForm;
