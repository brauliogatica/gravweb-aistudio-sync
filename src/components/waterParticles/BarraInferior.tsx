import React, { useState } from 'react';
import Precipitaciones from './Precipitaciones';

interface BarraInferiorProps {
  setLoadingMessage: (message: string | null) => void;
  setLoadingStyle: (style: React.CSSProperties) => void;
}

const BarraInferior: React.FC<BarraInferiorProps> = ({ setLoadingMessage, setLoadingStyle }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  return (
    <div 
      className={`barra-inferior-container ${isVisible ? "visible" : ""}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button 
        id="boton-barra-inferior" 
        className="water-particle" 
        onClick={toggleVisibility}
      >
        {isVisible ? "⌄⌄" : "⌃⌃"}
      </button>
      
      <div className="barra-inferior-panel">
        <h3 className="panel-title">Análisis Meteorológico</h3>
        <div className="barra-inferior-content">
          <Precipitaciones 
            setLoadingMessage={setLoadingMessage} 
            setLoadingStyle={setLoadingStyle} 
          />
        </div>
      </div>
    </div>
  );
};

export default BarraInferior; 
