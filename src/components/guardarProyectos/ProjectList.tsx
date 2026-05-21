import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  deleteProject,
  getProjectById,
  getProjectsByUserId,
} from "../../services/ProjectService";
import { clearProcessingRequest } from "../../services/processingRequestService";
import { setProject } from "../../redux/slices/projectSlice";
import { Project } from "../../types/types";
import { useCurrentUser } from "../../auth/useCurrentUser";
import Loader from "../usabilidad/Loader";
import "./ProjectList.css";

const ProjectList: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [isOpening, setOpening] = useState(false);

  const { userId, isAuthenticated } = useCurrentUser();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjectsByUserId = async () => {
      if (!isAuthenticated || !userId) {
        setProjects([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const projectsData = await getProjectsByUserId(userId);
        setProjects(projectsData);
      } catch (error) {
        console.error("Error buscando proyectos:", error);
        setAlertMessage(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los proyectos"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProjectsByUserId();
  }, [userId, isAuthenticated]);

  const handleDeleteProject = async () => {
    if (!selectedProject?._id) {
      return;
    }

    if (window.confirm("Seguro que deseas eliminar este proyecto?")) {
      try {
        await deleteProject(selectedProject._id);
        setProjects((current) =>
          current.filter((project) => project._id !== selectedProject._id)
        );
        setShowModal(false);
        setSelectedProject(null);
        setAlertMessage("Proyecto eliminado");
      } catch (error) {
        console.error("Error eliminando proyecto:", error);
        setAlertMessage("Error eliminando proyecto");
      }
    }
  };

  const handleOpenProject = (project: Project) => {
    setSelectedProject(project);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedProject(null);
  };

  const formatDate = (date: Date | string) =>
    new Date(date).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const handleConfirmOpen = async () => {
    if (!selectedProject?._id) {
      return;
    }

    try {
      setOpening(true);
      const hydratedProject = await getProjectById(selectedProject._id);
      clearProcessingRequest();
      dispatch(setProject(hydratedProject));
      navigate("/particles");
    } catch (error) {
      console.error("Error abriendo proyecto:", error);
      setAlertMessage(
        error instanceof Error
          ? error.message
          : "No se pudo abrir el proyecto"
      );
    } finally {
      setOpening(false);
    }
  };

  useEffect(() => {
    if (alertMessage) {
      const timer = setTimeout(() => setAlertMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [alertMessage]);

  return (
    <div className="project-grid-container">
      <h2 className="project-grid-title">
        <i className="fas fa-project-diagram" style={{ marginRight: "10px" }}></i>
        Lista de Proyectos
      </h2>

      {alertMessage && (
        <div className="alert alert-info text-center" role="alert">
          {alertMessage}
        </div>
      )}

      {isLoading ? (
        <Loader />
      ) : (
        <div className="container">
          <div className="container text-center">
            {projects.length === 0 ? (
              <div className="empty-projects">
                <div className="empty-projects-icon">
                  <i className="fas fa-folder-open"></i>
                </div>
                <div className="empty-projects-text">No hay proyectos para mostrar</div>
                <div className="empty-projects-subtext">
                  Crea tu primer proyecto de analisis territorial
                </div>
              </div>
            ) : (
              <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4">
                {projects.map((project) => (
                  <div key={project._id} className="col">
                    <button
                      className="project-card-button"
                      onClick={() => handleOpenProject(project)}
                    >
                      <div className="project-card">
                        <h3 className="project-card-header">
                          <i
                            className="fas fa-map-marked-alt"
                            style={{ marginRight: "8px" }}
                          ></i>
                          {project.name}
                        </h3>

                        <div className="project-card-body">
                          <p className="project-card-description">
                            {project.description || "Sin descripcion disponible"}
                          </p>

                          <img
                            src={project.thumbnail}
                            alt={project.name}
                            className="project-card-image"
                            onError={(event) => {
                              event.currentTarget.src = "/placeholder-project.png";
                            }}
                          />

                          <div className="project-card-metadata">
                            <span className="project-card-date">
                              <i
                                className="fas fa-calendar-alt"
                                style={{ marginRight: "4px" }}
                              ></i>
                              {formatDate(project.createdAt)}
                            </span>
                            <span className="project-card-status">
                              <i
                                className="fas fa-check-circle"
                                style={{ marginRight: "4px" }}
                              ></i>
                              Activo
                            </span>
                          </div>
                        </div>

                        <div className="project-card-id">
                          <i className="fas fa-fingerprint" style={{ marginRight: "4px" }}></i>
                          ID: {project._id}
                        </div>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showModal && selectedProject && (
        <div
          className="modal show d-block"
          tabIndex={-1}
          role="dialog"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{selectedProject.name}</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleCloseModal}
                ></button>
              </div>
              <div className="modal-body">
                <p>{selectedProject.description}</p>
                <img
                  src={selectedProject.thumbnail}
                  alt={selectedProject.name}
                  className="img-fluid"
                />
                <p className="form-text">{selectedProject._id}</p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseModal}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDeleteProject}
                  disabled={!selectedProject._id}
                >
                  Eliminar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleConfirmOpen}
                  disabled={isOpening}
                >
                  {isOpening ? "Abriendo..." : "Abrir proyecto"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectList;
