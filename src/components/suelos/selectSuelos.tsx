import React, { useState } from 'react';
import '../../styles/SelectSuelos.css';

const SelectSuelos = () => {
  const [selectedOptions, setSelectedOptions] = useState({
    usoSuelo: "",
    tipoSuelo: "",
    humedadSuelo: "",
    algoSuelo: "",
    algoSuelo2: ""
  });

  const [matriz, setMatriz] = useState({ x: "", y: "" }); 


  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>, key: string) => {
    const value = e.target.selectedIndex; 
    setSelectedOptions({
      ...selectedOptions,
      [key]: value
    });
  };

  const handleMatrizChange = (e: React.ChangeEvent<HTMLInputElement>, axis: string) => {
    const value = e.target.value;
    setMatriz({
      ...matriz,
      [axis]: value 
    });
  };


  const handleSubmit = () => {
    console.log('Opciones seleccionadas:', selectedOptions);
    console.log('Matriz de puntos:', matriz);

    
  };

  return (
    <div className="select-suelos">
      <div className="select-container">
        <label htmlFor="uso-suelo">Uso de suelo</label>
        <select
          id="uso-suelo"
          defaultValue=""
          onChange={(e) => handleSelectChange(e, "usoSuelo")}
        >
          <option value="" disabled>Selecciona una opción</option>
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
          <option value="" disabled>Selecciona una opción</option>
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
          <option value="" disabled>Selecciona una opción</option>
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
          <option value="" disabled>Selecciona una opción</option>
          <option value="seco">Areba Gruesa</option>
          <option value="moderado">Arena Fina</option>
          <option value="humedo">Arena Limosa</option>
          <option value="seco">Limo</option>
          <option value="moderado">Limo Arcilloso</option>
          <option value="humedo">Arcilla Arenosa</option>
          <option value="moderado">Arcilla</option>
          <option value="humedo">Suelo Orgánico</option>
        </select>
      </div>

      <div className="select-container">
        <label htmlFor="algo-suelo2">Algo suelo 2</label>
        <select
          id="algo-suelo2"
          defaultValue=""
          onChange={(e) => handleSelectChange(e, "algoSuelo2")}
        >
          <option value="" disabled>Selecciona una opción</option>
          <option value="seco">Arena</option>
          <option value="moderado">Arena Limosa</option>
          <option value="humedo">Limo</option>
          <option value="seco">Limo Arcilloso</option>
          <option value="moderado">Arcilla Arenosa</option>
          <option value="humedo">Arcilla</option>
          <option value="humedo">Suelo Orgánico</option>
        </select>
      </div>
<br />
      <div className="input-container">
        <label>Matriz de puntos</label>
        <div className="matriz-inputs">
          <input className='inputs-matriz'
            type="number"
            placeholder="X"
            value={matriz.x}
            onChange={(e) => handleMatrizChange(e, "x")}
          />
          <input
            type="number" className='inputs-matriz'
            placeholder="Y"
            value={matriz.y}
            onChange={(e) => handleMatrizChange(e, "y")}
          />
        </div>
      </div>
<br />
      <button className='send-options' onClick={handleSubmit}>Guardar opciones seleccionadas</button>
    </div>
  );
};

export default SelectSuelos;
