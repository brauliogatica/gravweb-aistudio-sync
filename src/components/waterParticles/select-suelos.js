// select-suelos.js
// Módulo para manejar el selector de tipos de suelo

// Variables para almacenar las opciones seleccionadas
let selectedOptions = {
  usoSuelo: "",
  tipoSuelo: "",
  humedadSuelo: "",
  algoSuelo: "",
  algoSuelo2: ""
};

// Variable para almacenar los valores de la matriz
let matriz = { x: "", y: "" };

// Función para inicializar el componente de selector de suelos
export function initSuelosSelector() {
  // Crear el contenedor principal para el componente
  const createSuelosSelector = () => {
    const container = document.createElement('div');
    container.className = 'select-suelos';
    container.innerHTML = `
      <h3 class="sidebar-section-title">Propiedades del Suelo</h3>
      
      <div class="select-container">
        <label for="uso-suelo">Uso de suelo</label>
        <select id="uso-suelo">
          <option value="" disabled selected>Selecciona una opción</option>
          <option value="bosque">Bosque</option>
          <option value="pastizales">Pastizales</option>
          <option value="area-urbana">Área urbana</option>
          <option value="area-pavimentada">Área pavimentada</option>
        </select>
      </div>

      <div class="select-container">
        <label for="tipo-suelo">Tipo de suelo</label>
        <select id="tipo-suelo">
          <option value="" disabled selected>Selecciona una opción</option>
          <option value="arenoso">Suelo arenoso</option>
          <option value="arcilloso">Suelo arcilloso</option>
          <option value="na">N/A</option>
        </select>
      </div>

      <div class="select-container">
        <label for="humedad-suelo">Humedad del suelo</label>
        <select id="humedad-suelo">
          <option value="" disabled selected>Selecciona una opción</option>
          <option value="seco">Seco</option>
          <option value="moderado">Moderado</option>
          <option value="humedo">Húmedo</option>
        </select>
      </div>

      <div class="select-container">
        <label for="algo-suelo">Clasificación</label>
        <select id="algo-suelo">
          <option value="" disabled selected>Selecciona una opción</option>
          <option value="arena-gruesa">Arena Gruesa</option>
          <option value="arena-fina">Arena Fina</option>
          <option value="arena-limosa">Arena Limosa</option>
          <option value="limo">Limo</option>
          <option value="limo-arcilloso">Limo Arcilloso</option>
          <option value="arcilla-arenosa">Arcilla Arenosa</option>
          <option value="arcilla">Arcilla</option>
          <option value="suelo-organico">Suelo Orgánico</option>
        </select>
      </div>

      <div class="select-container">
        <label for="algo-suelo2">Composición</label>
        <select id="algo-suelo2">
          <option value="" disabled selected>Selecciona una opción</option>
          <option value="arena">Arena</option>
          <option value="arena-limosa">Arena Limosa</option>
          <option value="limo">Limo</option>
          <option value="limo-arcilloso">Limo Arcilloso</option>
          <option value="arcilla-arenosa">Arcilla Arenosa</option>
          <option value="arcilla">Arcilla</option>
          <option value="suelo-organico">Suelo Orgánico</option>
        </select>
      </div>

      <div class="input-container">
        <label>Matriz de puntos</label>
        <div class="matriz-inputs">
          <input type="number" id="matriz-x" placeholder="X" class="inputs-matriz">
          <input type="number" id="matriz-y" placeholder="Y" class="inputs-matriz">
        </div>
      </div>

      <button id="guardar-suelos" class="send-options">Guardar opciones seleccionadas</button>
    `;
    
    return container;
  };

  // Añadir los estilos CSS necesarios
  const addStyles = () => {
    const style = document.createElement('style');
    style.textContent = `
      /* Estilos para el selector de suelos */
      .select-suelos {
        padding: 10px;
        margin-top: 15px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .sidebar-section-title {
        margin: 0 0 10px 0;
        color: #ecf0f1;
        font-size: 13px;
        font-weight: 500;
        text-align: center;
      }
      
      .select-container {
        margin-bottom: 8px;
      }
      
      .select-container label {
        display: block;
        margin-bottom: 3px;
        font-size: 11px;
        color: #bdc3c7;
      }
      
      .select-container select {
        width: 100%;
        padding: 4px;
        background-color: rgba(52, 73, 94, 0.7);
        border: 1px solid rgba(41, 128, 185, 0.3);
        border-radius: 3px;
        color: #ecf0f1;
        font-size: 11px;
      }
      
      .select-container select:focus {
        outline: none;
        border-color: rgba(41, 128, 185, 0.8);
      }
      
      .input-container {
        margin-top: 8px;
      }
      
      .input-container label {
        display: block;
        margin-bottom: 3px;
        font-size: 11px;
        color: #bdc3c7;
      }
      
      .matriz-inputs {
        display: flex;
        gap: 5px;
      }
      
      .inputs-matriz {
        flex: 1;
        padding: 4px;
        background-color: rgba(52, 73, 94, 0.7);
        border: 1px solid rgba(41, 128, 185, 0.3);
        border-radius: 3px;
        color: #ecf0f1;
        font-size: 11px;
      }
      
      .inputs-matriz:focus {
        outline: none;
        border-color: rgba(41, 128, 185, 0.8);
      }
      
      .send-options {
        width: 100%;
        margin-top: 10px;
        padding: 6px;
        background-color: rgba(41, 128, 185, 0.8);
        border: none;
        border-radius: 3px;
        color: white;
        font-size: 11px;
        cursor: pointer;
        transition: background-color 0.3s;
      }
      
      .send-options:hover {
        background-color: rgba(41, 128, 185, 1);
      }
    `;
    
    document.head.appendChild(style);
  };

  // Añadir el selector de suelos a la barra lateral
  const addToSidebar = () => {
    // Buscar la barra lateral
    const sidebar = document.querySelector('.lists-sidebar-content');
    
    if (sidebar) {
      // Crear y añadir el componente
      const suelosSelector = createSuelosSelector();
      sidebar.appendChild(suelosSelector);
      
      // Configurar los event listeners
      setupEventListeners();
    } else {
      console.error('No se encontró el contenedor de la barra lateral.');
    }
  };

  // Configurar los event listeners para los selectores y botones
  const setupEventListeners = () => {
    // Event listeners para los selectores
    document.getElementById('uso-suelo').addEventListener('change', function() {
      selectedOptions.usoSuelo = this.selectedIndex;
    });
    
    document.getElementById('tipo-suelo').addEventListener('change', function() {
      selectedOptions.tipoSuelo = this.selectedIndex;
    });
    
    document.getElementById('humedad-suelo').addEventListener('change', function() {
      selectedOptions.humedadSuelo = this.selectedIndex;
    });
    
    document.getElementById('algo-suelo').addEventListener('change', function() {
      selectedOptions.algoSuelo = this.selectedIndex;
    });
    
    document.getElementById('algo-suelo2').addEventListener('change', function() {
      selectedOptions.algoSuelo2 = this.selectedIndex;
    });
    
    // Event listeners para los inputs de matriz
    document.getElementById('matriz-x').addEventListener('input', function() {
      matriz.x = this.value;
    });
    
    document.getElementById('matriz-y').addEventListener('input', function() {
      matriz.y = this.value;
    });
    
    // Event listener para el botón de guardar
    document.getElementById('guardar-suelos').addEventListener('click', function() {
      console.log('Opciones seleccionadas:', selectedOptions);
      console.log('Matriz de puntos:', matriz);
      
      // Aquí puedes agregar la lógica para procesar los datos
      // Por ejemplo, actualizar la visualización 3D con los parámetros del suelo
    });
  };

  // Ejecutar la inicialización
  addStyles();
  addToSidebar();
}

// Exportar la función para acceder a los valores seleccionados
export function getSuelosParameters() {
  return {
    selectedOptions,
    matriz
  };
} 