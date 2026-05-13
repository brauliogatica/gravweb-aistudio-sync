// @ts-nocheck
import React, { useState } from "react";
import listas from "./listas.json";

interface SelectedOptions {
  usoSuelo: string;
  tipoSuelo: string;
  humedadSuelo: string;
  algoSuelo: string;
  algoSuelo2: string;
}

interface Matriz {
  x: string;
  y: string;
}

const SelectParametrosSuelo: React.FC = () => {
  const [listsData] = useState(listas);
  const [error] = useState<string | null>(null);
  const [collapsedLists, setCollapsedLists] = useState<{ [key: string]: boolean }>({});
  const [selectedOptions, setSelectedOptions] = useState<SelectedOptions>({
    usoSuelo: "",
    tipoSuelo: "",
    humedadSuelo: "",
    algoSuelo: "",
    algoSuelo2: "",
  });
  const [matriz, setMatriz] = useState<Matriz>({ x: "", y: "" });

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>, key: keyof SelectedOptions) => {
    const value = e.target.value;
    setSelectedOptions((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleMatrizChange = (e: React.ChangeEvent<HTMLInputElement>, axis: keyof Matriz) => {
    const value = e.target.value;
    setMatriz((prev) => ({
      ...prev,
      [axis]: value,
    }));
  };

  const handleSubmit = () => {
    console.log("Opciones seleccionadas:", selectedOptions);
    console.log("Matriz de puntos:", matriz);
  };

  const toggleListCollapse = (listName: string) => {
    setCollapsedLists((prev) => ({
      ...prev,
      [listName]: !prev[listName], // Alterna el estado de colapso
    }));
  };

  const renderLists = () => {
    if (error) {
      return (
        <div className="list-error">
          <p>Error al cargar las listas: {error}</p>
          <button onClick={() => window.location.reload()}>Reintentar</button>
        </div>
      );
    }

    if (!listsData || !listsData.listas || Object.keys(listsData.listas).length === 0) {
      return <p className="no-lists-message">No hay listas disponibles</p>;
    }

    let totalElementos = 0;

    return (
      <>
        {Object.entries(listsData.listas).map(([listName, items]) => {
          const itemArray = Array.isArray(items) ? items : [items];
          totalElementos += itemArray.length;

          const isCollapsed = collapsedLists[listName] || false;

          return (
            <div key={listName} className="list-section">
              <div
                className="list-header main-list-header"
                onClick={() => toggleListCollapse(listName)}
                style={{ cursor: "pointer" }}
              >
                <h3>{listName}</h3>
                <span className="list-toggle">{isCollapsed ? "▶" : "▼"}</span>
              </div>
              {!isCollapsed && (
                <div className="branches-container">
                  {itemArray.map((item, index) => (
                    <div key={index} className="list-item">
                      {typeof item === "number"
                        ? item % 1 === 0
                          ? item.toString()
                          : item.toFixed(2)
                        : typeof item === "object" && item !== null
                          ? JSON.stringify(item)
                          : item}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <div className="lists-stats">
          Total: {Object.keys(listsData.listas).length} listas, {totalElementos} elementos
          {listsData.metadatos?.fecha_generacion && (
            <> | Generado: {listsData.metadatos.fecha_generacion}</>
          )}
        </div>
      </>
    );
  };

  return (
    <div>
      <div id="lists-sidebar">
        <div id="lists-container">{renderLists()}</div>
      </div>

      <div>
        <div className="select-container">
          <label htmlFor="uso-suelo">Uso de suelo</label>
          <select
            id="uso-suelo"
            defaultValue=""
            onChange={(e) => handleSelectChange(e, "usoSuelo")}
          >
            <option value="" disabled>
              Selecciona una opción
            </option>
            <option value="bosque">Bosque</option>
            <option value="pastizales">Pastizales</option>
            <option value="area-urbana">Área urbana</option>
            <option value="area-pavimentada">Área pavimentada</option>
          </select>
        </div>

        <div className="select-container">
          <label htmlFor="tipo-suelo">Tipo de suelo</label>
          <select
            id="tipo-suelo"
            defaultValue=""
            onChange={(e) => handleSelectChange(e, "tipoSuelo")}
          >
            <option value="" disabled>
              Selecciona una opción
            </option>
            <option value="arenoso">Suelo arenoso</option>
            <option value="arcilloso">Suelo arcilloso</option>
            <option value="na">N/A</option>
          </select>
        </div>

        <div className="select-container">
          <label htmlFor="humedad-suelo">Humedad del suelo</label>
          <select
            id="humedad-suelo"
            defaultValue=""
            onChange={(e) => handleSelectChange(e, "humedadSuelo")}
          >
            <option value="" disabled>
              Selecciona una opción
            </option>
            <option value="seco">Seco</option>
            <option value="moderado">Moderado</option>
            <option value="humedo">Húmedo</option>
          </select>
        </div>

        <div className="select-container">
          <label htmlFor="algo-suelo">Algo suelo</label>
          <select
            id="algo-suelo"
            defaultValue=""
            onChange={(e) => handleSelectChange(e, "algoSuelo")}
          >
            <option value="" disabled>
              Selecciona una opción
            </option>
            <option value="areba-gruesa">Areba Gruesa</option>
            <option value="arena-fina">Arena Fina</option>
            <option value="arena-limosa">Arena Limosa</option>
            <option value="limo">Limo</option>
            <option value="limo-arcilloso">Limo Arcilloso</option>
            <option value="arcilla-arenosa">Arcilla Arenosa</option>
            <option value="arcilla">Arcilla</option>
            <option value="suelo-organico">Suelo Orgánico</option>
          </select>
        </div>

        <div className="select-container"> data-bs-theme="dark"
          <label htmlFor="algo-suelo2">Algo suelo 2</label>
          <select
            id="algo-suelo2"
            defaultValue=""
            onChange={(e) => handleSelectChange(e, "algoSuelo2")}
          >
            <option value="" disabled>
              Selecciona una opción
            </option>
            <option value="arena">Arena</option>
            <option value="arena-limosa">Arena Limosa</option>
            <option value="limo">Limo</option>
            <option value="limo-arcilloso">Limo Arcilloso</option>
            <option value="arcilla-arenosa">Arcilla Arenosa</option>
            <option value="arcilla">Arcilla</option>
            <option value="suelo-organico">Suelo Orgánico</option>
          </select>
        </div>

        <br />
        <div className="input-container">
          <label>Matriz de puntos</label>
          <div className="matriz-inputs">
            <input
              className="inputs-matriz"
              type="number"
              placeholder="X"
              value={matriz.x}
              onChange={(e) => handleMatrizChange(e, "x")}
            />
            <input
              type="number"
              className="inputs-matriz"
              placeholder="Y"
              value={matriz.y}
              onChange={(e) => handleMatrizChange(e, "y")}
            />
          </div>
        </div>
        <br />
        <button className="send-options" onClick={handleSubmit}>
          Guardar opciones seleccionadas
        </button>
      </div>
    </div>
  );
};

export default SelectParametrosSuelo;
