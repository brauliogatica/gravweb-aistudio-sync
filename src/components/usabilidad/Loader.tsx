import React from 'react';
import logo from '../../assets/isotipo_color.png';
import '../../styles/loader.css';

const Loader = () => {
  return (
    <div className="loader">
      <img src={logo} className="isotipo-loader" alt="Cargando..." />
    </div>
  );
};

export default Loader;
