import React, { useEffect } from "react";
import "../styles/analisisModelo.css";
// import { createProject, updateProject } from "../services/ProjectService";
import { updateProject } from "../redux/slices/projectSlice";
import { useAuth0 } from "@auth0/auth0-react";
import AnalisisPrincipal from "../components/analisis/AnalisisPrincipal";
import { ProjectProvider } from "../components/guardarProyectos/ProjectContext";
import { useDispatch } from "react-redux";
import { isLocalDevAuthEnabled, LOCAL_DEV_USER } from "../auth/localDevAuth.ts";

const AnalisisModelo = () => {
  const { user, isAuthenticated, isLoading } = useAuth0();
  const dispatch = useDispatch();

  useEffect(() => {
    const activeUser = isLocalDevAuthEnabled() ? LOCAL_DEV_USER : user;
    if ((isLocalDevAuthEnabled() || isAuthenticated) && activeUser?.sub) {
      dispatch(updateProject({ key: "userId", value: activeUser.sub }));
    }
  }, [isAuthenticated, user, dispatch]);

  return (
    <div>
      <ProjectProvider>
        <AnalisisPrincipal />
      </ProjectProvider>
    </div>
  );
};

export default AnalisisModelo;
