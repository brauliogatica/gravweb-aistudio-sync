import React, { useEffect } from "react";
import "../styles/analisisModelo.css";
// import { createProject, updateProject } from "../services/ProjectService";
import { updateProject } from "../redux/slices/projectSlice";
import AnalisisPrincipal from "../components/analisis/AnalisisPrincipal";
import { ProjectProvider } from "../components/guardarProyectos/ProjectContext";
import { useDispatch } from "react-redux";
import { useCurrentUser } from "../auth/useCurrentUser";

const AnalisisModelo = () => {
  const { userId, isAuthenticated } = useCurrentUser();
  const dispatch = useDispatch();

  useEffect(() => {
    if (isAuthenticated && userId) {
      dispatch(updateProject({ key: "userId", value: userId }));
    }
  }, [isAuthenticated, userId, dispatch]);

  return (
    <div>
      <ProjectProvider>
        <AnalisisPrincipal />
      </ProjectProvider>
    </div>
  );
};

export default AnalisisModelo;
