// lists-sidebar.js
// Módulo para mostrar listas en una barra lateral derecha colapsable

// Variables globales
let listsData = null;
let sidebarVisible = false;

// Función para inicializar la barra lateral
export function initSidebar() {
    console.log("[ListsSidebar] Inicializando barra lateral...");
    
    // Crear el contenedor principal de la barra lateral
    const sidebar = document.createElement('div');
    sidebar.id = 'listsSidebar';
    sidebar.className = 'lists-sidebar hidden';
    
    // Crear el botón para colapsar/expandir la barra lateral
    const toggleButton = document.createElement('div');
    toggleButton.id = 'listsSidebarToggle';
    toggleButton.className = 'lists-sidebar-toggle';
    toggleButton.innerHTML = '&lt;';
    toggleButton.title = 'Mostrar/Ocultar Listas';
    toggleButton.addEventListener('click', toggleSidebar);
    
    // Crear el contenedor para el contenido de la barra lateral
    const contentContainer = document.createElement('div');
    contentContainer.id = 'listsSidebarContent';
    contentContainer.className = 'lists-sidebar-content';
    
    // Título de la barra lateral
    const title = document.createElement('h3');
    title.textContent = 'Parámetros de Diseño';
    title.className = 'lists-sidebar-title';
    contentContainer.appendChild(title);
    
    // Contenedor para las listas
    const listsContainer = document.createElement('div');
    listsContainer.id = 'listsContainer';
    listsContainer.className = 'lists-container';
    contentContainer.appendChild(listsContainer);
    
    // Añadir todo al DOM
    sidebar.appendChild(toggleButton);
    sidebar.appendChild(contentContainer);
    document.body.appendChild(sidebar);
    
    // Cargar los estilos CSS
    addStylesheet();
    
    // Cargar los datos desde el JSON
    loadListsData();
    
    console.log("[ListsSidebar] Barra lateral inicializada");
}

// Función para alternar la visibilidad de la barra lateral
function toggleSidebar() {
    const sidebar = document.getElementById('listsSidebar');
    const toggleButton = document.getElementById('listsSidebarToggle');
    
    if (sidebar.classList.contains('hidden')) {
        sidebar.classList.remove('hidden');
        toggleButton.innerHTML = '&gt;';
        sidebarVisible = true;
    } else {
        sidebar.classList.add('hidden');
        toggleButton.innerHTML = '&lt;';
        sidebarVisible = false;
    }
    
    console.log(`[ListsSidebar] Barra lateral ${sidebarVisible ? 'mostrada' : 'ocultada'}`);
}

// Función para cargar los datos desde el archivo JSON
function loadListsData() {
    console.log("[ListsSidebar] Cargando datos de listas.json...");
    
    fetch('listas.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error al cargar listas.json: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            listsData = data;
            console.log(`[ListsSidebar] Datos cargados: ${Object.keys(data.listas).length} listas`);
            renderLists();
        })
        .catch(error => {
            console.error("[ListsSidebar] Error:", error);
            const listsContainer = document.getElementById('listsContainer');
            listsContainer.innerHTML = `
                <div class="list-error">
                    <p>Error al cargar las listas: ${error.message}</p>
                    <button onclick="loadListsData()">Reintentar</button>
                </div>
            `;
        });
}

// Función para renderizar las listas en la barra lateral
function renderLists() {
    const listsContainer = document.getElementById('listsContainer');
    listsContainer.innerHTML = '';
    
    if (!listsData || !listsData.listas || Object.keys(listsData.listas).length === 0) {
        listsContainer.innerHTML = '<p class="no-lists-message">No hay listas disponibles</p>';
        return;
    }
    
    // Contar el número total de elementos
    let totalElementos = 0;
    
    // Crear una sección para cada lista principal (datos agua, datos terreno, datosxx)
    Object.entries(listsData.listas).forEach(([listName, items]) => {
        // Crear el contenedor de la lista principal
        const listSection = document.createElement('div');
        listSection.className = 'list-section';
        
        // Crear el encabezado de la lista principal con el nombre
        const listHeader = document.createElement('div');
        listHeader.className = 'list-header main-list-header';
        listHeader.innerHTML = `
            <h3>${listName}</h3>
            <span class="list-toggle">▼</span>
        `;
        
        // Crear el contenedor para los elementos
        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'branches-container';
        
        // Asegurar que items sea un array
        const itemArray = Array.isArray(items) ? items : [items];
        
        // Añadir todos los elementos directamente al contenedor principal
        totalElementos += itemArray.length;
        
        // Crear elementos de la lista con formato mejorado
        itemArray.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'list-item';
            
            // Formatear el elemento según su contenido
            if (typeof item === 'number') {
                // Formatear números con 2 decimales si tienen parte decimal
                itemElement.textContent = item % 1 === 0 ? item.toString() : item.toFixed(2);
            } else if (typeof item === 'object' && item !== null) {
                // Mostrar objetos como JSON formateado
                itemElement.textContent = JSON.stringify(item);
            } else {
                // Para strings y otros tipos
                itemElement.textContent = item;
            }
            
            itemsContainer.appendChild(itemElement);
        });
        
        // Añadir función para colapsar/expandir la lista principal
        listHeader.addEventListener('click', () => {
            itemsContainer.classList.toggle('collapsed');
            const toggleIcon = listHeader.querySelector('.list-toggle');
            toggleIcon.textContent = itemsContainer.classList.contains('collapsed') ? '▶' : '▼';
        });
        
        // Ensamblar la sección principal
        listSection.appendChild(listHeader);
        listSection.appendChild(itemsContainer);
        
        // Añadir la sección principal al contenedor principal
        listsContainer.appendChild(listSection);
    });
    
    // Mostrar estadísticas
    const statsElement = document.createElement('div');
    statsElement.className = 'lists-stats';
    
    // Obtener la fecha de generación del JSON si está disponible
    let fechaGeneracion = '';
    if (listsData.metadatos && listsData.metadatos.fecha_generacion) {
        fechaGeneracion = ` | Generado: ${listsData.metadatos.fecha_generacion}`;
    }
    
    statsElement.textContent = `Total: ${Object.keys(listsData.listas).length} listas, ${totalElementos} elementos${fechaGeneracion}`;
    listsContainer.appendChild(statsElement);
}

// Función para añadir los estilos CSS necesarios
function addStylesheet() {
    const style = document.createElement('style');
    style.textContent = `
        /* Estilos para la barra lateral */
        .lists-sidebar {
            position: fixed;
            top: 0;
            right: 0;
            width: 300px;
            height: 100vh;
            background: linear-gradient(to bottom, #1e2a3a, #2c3e50);
            color: #ecf0f1;
            z-index: 1000;
            transition: transform 0.3s ease;
            display: flex;
            flex-direction: row;
            box-shadow: -2px 0 15px rgba(0, 0, 0, 0.3);
            border-left: 1px solid rgba(255, 255, 255, 0.1);
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 11px;
        }
        
        .lists-sidebar.hidden {
            transform: translateX(calc(100% - 30px));
        }
        
        .lists-sidebar-toggle {
            width: 30px;
            background-color: rgba(41, 128, 185, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            cursor: pointer;
            color: white;
            font-weight: bold;
            font-size: 20px;
            transition: background-color 0.2s;
        }
        
        .lists-sidebar-toggle:hover {
            background-color: rgba(52, 152, 219, 1);
            box-shadow: 0 0 15px rgba(52, 152, 219, 0.5);
        }
        
        .lists-sidebar-content {
            flex: 1;
            padding: 10px;
            overflow-y: auto;
            max-height: 100vh;
        }
        
        .lists-sidebar-title {
            margin: 3px 0 10px 0;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.15);
            font-size: 14px;
            color: #ecf0f1;
            text-align: center;
            font-weight: 500;
            text-shadow: 1px 1px 1px rgba(0,0,0,0.5);
            letter-spacing: 0.5px;
        }
        
        /* Estilos para las listas */
        .lists-container {
            margin-top: 10px;
        }
        
        .list-section {
            margin-bottom: 8px;
            background-color: rgba(52, 73, 94, 0.5);
            border-radius: 4px;
            overflow: hidden;
            border: 1px solid rgba(41, 128, 185, 0.2);
        }
        
        .list-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 10px;
            background-color: rgba(41, 128, 185, 0.4);
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        .main-list-header {
            background-color: rgba(41, 128, 185, 0.6);
        }
        
        .list-header:hover {
            background-color: rgba(41, 128, 185, 0.6);
        }
        
        .main-list-header:hover {
            background-color: rgba(41, 128, 185, 0.8);
        }
        
        .list-header h3 {
            margin: 0;
            font-size: 11px;
            color: #ecf0f1;
            text-shadow: 1px 1px 1px rgba(0,0,0,0.5);
            letter-spacing: 0.5px;
            font-weight: 500;
        }
        
        .list-toggle {
            font-size: 8px;
            color: #ecf0f1;
        }
        
        /* Estilos para las ramas (branches) */
        .branches-container {
            max-height: 1000px;
            overflow: hidden;
            transition: max-height 0.3s ease;
        }
        
        .branches-container.collapsed {
            max-height: 0;
        }
        
        .branch-section {
            margin: 4px;
            background-color: rgba(52, 73, 94, 0.3);
            border-radius: 3px;
            overflow: hidden;
            border: 1px solid rgba(41, 128, 185, 0.1);
        }
        
        .branch-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 5px 8px;
            background-color: rgba(41, 128, 185, 0.3);
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        .branch-header:hover {
            background-color: rgba(41, 128, 185, 0.5);
        }
        
        .branch-header h4 {
            margin: 3px 0;
            font-size: 10px;
            font-weight: normal;
            color: #bdc3c7;
            text-shadow: 1px 1px 1px rgba(0,0,0,0.5);
        }
        
        .branch-toggle {
            font-size: 7px;
            color: #bdc3c7;
        }
        
        .branch-items {
            padding: 5px;
            max-height: 200px;
            overflow-y: auto;
            transition: max-height 0.3s ease, padding 0.3s ease;
        }
        
        .branch-items.collapsed {
            max-height: 0;
            padding: 0;
            overflow: hidden;
        }
        
        .list-item {
            padding: 4px 8px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            font-size: 10px;
            color: #ecf0f1;
        }
        
        .list-item:last-child {
            border-bottom: none;
        }
        
        .no-lists-message {
            padding: 15px;
            text-align: center;
            color: #bdc3c7;
            font-size: 10px;
        }
        
        .list-error {
            padding: 15px;
            text-align: center;
            color: #e74c3c;
            background-color: rgba(231, 76, 60, 0.2);
            border-radius: 4px;
            font-size: 10px;
        }
        
        .list-error button {
            width: 100%;
            padding: 6px;
            margin-top: 8px;
            cursor: pointer;
            font-size: 10px;
            background-color: rgba(52, 73, 94, 0.9);
            color: #ecf0f1;
            border: 1px solid rgba(41, 128, 185, 0.3);
            border-radius: 4px;
            transition: all 0.3s ease;
            font-family: 'Segoe UI', Arial, sans-serif;
            letter-spacing: 0.5px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
            text-transform: uppercase;
            font-weight: 500;
        }
        
        .list-error button:hover {
            background-color: rgba(41, 128, 185, 0.8);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
            transform: translateY(-1px);
        }
        
        .lists-stats {
            margin-top: 15px;
            padding: 8px;
            text-align: center;
            font-size: 9px;
            color: #bdc3c7;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
    `;
    document.head.appendChild(style);
}

// Exportar únicamente las funciones necesarias
export { loadListsData }; 