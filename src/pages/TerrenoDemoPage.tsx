import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import WaterParticle from "../components/waterParticles/WaterParticle";
import { RootState } from "../redux/store/store";
import { loadDemoProjectData } from "../services/demoProjectLoader";

const hasData = (value: unknown) => {
  if (!value) return false;
  if (typeof value === "string") return value.trim().length > 2;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
};

function TerrenoDemoPage() {
  const dispatch = useDispatch();
  const project = useSelector((state: RootState) => state.project);
  const [ready, setReady] = useState(
    hasData(project.genJson) && hasData(project.lineasJson)
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hasData(project.genJson) && hasData(project.lineasJson)) {
      setReady(true);
      return;
    }

    loadDemoProjectData(dispatch)
      .then(() => setReady(true))
      .catch((loadError) => {
        console.error(loadError);
        setError("No se pudo cargar el terreno demo.");
      });
  }, [dispatch, project.genJson, project.lineasJson]);

  if (error) {
    return <div className="text-white p-4">{error}</div>;
  }

  if (!ready) {
    return <div className="text-white p-4">Cargando terreno demo...</div>;
  }

  return <WaterParticle />;
}

export default TerrenoDemoPage;
