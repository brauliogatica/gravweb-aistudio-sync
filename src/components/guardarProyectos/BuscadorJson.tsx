import React, { useState } from "react";
import { getProjectById } from "../../services/ProjectService";
import Loader from "../usabilidad/Loader";
import { Project } from "../../types/types";

const BuscadorJson = () => {
  const [isLoading, setLoading] = useState(false);
  const [idProyecto, setIdProyecto] = useState("");
  const [proyecto, setProyecto] = useState<Project>();
  const [lineas, setLineas] = useState({});
  const [malla, setMalla] = useState({});
  const [arJson, setArJson] = useState({});
  const [genJson, setGenJson] = useState({});
  const [lineasJson, setLineasJson] = useState({});

  const fetchProyecto = async () => {
    setLoading(true);
    try {
      setProyecto(await getProjectById(idProyecto));
    } catch (error) {
      console.error("Error buscando el proyecto: ", error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div>
      <div>
        <h1>Buscador</h1>
        <h2>{idProyecto}</h2>

        <form>
          <input
            type="text"
            defaultValue={"67a3654d64c3d4440839c704"}
            onChange={(e) => {
              setIdProyecto(e.target.value);
            }}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={fetchProyecto}
          >
            Buscar proyecto
          </button>
        </form>
      </div>
      {isLoading ? (
        <Loader />
      ) : (
        <div>{proyecto && <div>{proyecto.name}</div>}</div>
      )}
    </div>
  );
};

export default BuscadorJson;
