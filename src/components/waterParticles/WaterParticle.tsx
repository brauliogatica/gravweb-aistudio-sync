// @ts-nocheck
import React, { useEffect, useRef, useState } from "react";
import "./style.css";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as WaterParticles from "./water-particles.js";
import * as ObjectsLoader from "./objects-loader.js";
import * as ListsSidebar from "./lists-sidebar.js";
import * as SelectSuelosJs from "./select-suelos.js";
import SelectSuelos from "../suelos/selectSuelos";
import SelectParametrosSuelo from "./SelectParametrosSuelo";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/store/store.js"; // Asegúrate de importar el tipo RootState
import ProjectForm from "../guardarProyectos/ProjectForm";
import LineasGen from "./LineasGen";
import EchartsViewer from "./Echarts"; // Importar el nuevo componente EchartsViewer
import BarraInferior from "./BarraInferior"; // Importar el nuevo componente BarraInferior
import ExportarKmz from "../manejarDatos/ExportarKmz";

const WaterParticle = () => {
  const project = useSelector((state: RootState) => state.project);
  const [genJson, setGenJson] = useState(project.genJson);
  const [lineasJson, setLineasJson] = useState(project.lineasJson);
  const [objectsJson, setObjectsJson] = useState(project.objectsJson);
  const [arJson, setArJson] = useState(project.arJson);

  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [loadingStyle, setLoadingStyle] = useState<React.CSSProperties>({});
  const [isSuelosVisible, setIsSuelosVisible] = useState(false);
  // const sceneRef = useRef<THREE.Scene | null>(null);
  // Variables globales
  const scene = useRef<THREE.Scene | null>(null);
  const camera = useRef<THREE.OrthographicCamera | null>(null);
  const renderer = useRef<THREE.WebGLRenderer | null>(null);
  const controls = useRef<OrbitControls | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  // let scene: THREE.Scene, 
  //     camera: THREE.OrthographicCamera, 
  //     renderer: THREE.WebGLRenderer, 
  //     controls: OrbitControls, 

  const currentMesh = useRef<THREE.Mesh | null>(null);
  const boundingBox = useRef<THREE.Box3 | null>(null);
  const center = useRef<THREE.Vector3 | null>(null);
  const size = useRef<THREE.Vector3 | null>(null);
  let isTopView = false;
  const colorMode = useRef("uniform"); // 'uniform', 'slope', 'convex'
  const colorData = useRef({
    slope: null,
    convex: null,
  });
  const polylines = useRef({
    poligono: null,
    lineas: [],
  });
  const showPolylines = useRef({
    poligono: false,
    lineas: false,
  });
  // Variables para raycasting y tooltips
  const raycaster = useRef<THREE.Raycaster | null>(null);
  let mouse: THREE.Vector2;
  const tooltip = useRef<HTMLElement | null>(null);
  const vertexValues = useRef({
    slope: [] as number[], // Array de números
    convex: [] as number[], // Array de números
  });
  const highlightPoint = useRef<THREE.Mesh | null>(null); // Para marcar el punto seleccionado

  // Variables para líneas de sección
  let sectionLines = null;
  let terrainSectionLines = null; // Líneas de sección del terreno
  let glassPrism = null;
  let mouseOnTerrain = false;
  let lastIntersectPoint = null;

  // Variables para el sistema de "pegajosidad" del tooltip
  let tooltipTimeout: string | number | NodeJS.Timeout | null | undefined = null;
  let lastVertexIndex = -1;
  let tooltipStickiness = 300; // milisegundos que el tooltip permanece visible después de salir del vértice
  let tooltipStickinessActive = false;

  // Variables para el indicador de zoom
  let zoomIndicator: HTMLElement | null;
  let zoomIndicatorTimeout: string | number | NodeJS.Timeout | null | undefined = null;

  // Variables para la simulación de agua
  let particleSystem;
  let particles;
  let particleCount = 5000;
  let particlePositions = [];
  let particleVelocities = [];
  let particleLifetimes = [];
  let particleVisible = [];
  let simulationActive = false;
  let heightField = [];
  let heightFieldSize = { width: 0, height: 0 };
  let flowSpeed = 1.0;

  // Variables para las normales importadas de gen.json
  let vertexNormals = [];

  let vertexPositions = [];
  let useGenJsonNormals = true; // Flag para usar normales de gen.json

  // Variables para líneas de contorno topográfico
  // const [isContourActive, setIsContourActive] = useState(false);
  const contourLines = useRef<THREE.LineSegments | null>(null);
  const [showContourLines, setShowContourLines] = useState(false); // Mostrar automáticamente al cargar
  const [objectsVisible, setObjectsVisible] = useState(false); // Cambiado a false para que esté apagado al principio
  const [contourInterval, setContourInterval] = useState(1.5); // Intervalo de 1.5 metros entre líneas

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [isProjectFormOpen, setProjectFormOpen] = useState(false);

  // Hook para usar el componente LineasGen
  const lineasGenRef = useRef<any>(null);
  const lineasGenResult = LineasGen({
    scene,
    setLoadingMessage,
    setLoadingStyle
  });

  // Colores para las partículas de agua
  const PARTICLE_COLORS = [
    new THREE.Color(0x00ffff), // Cian brillante
    new THREE.Color(0x00bfff), // Azul cielo
    new THREE.Color(0x1e90ff), // Azul real
    new THREE.Color(0x00ffff), // Cian
    new THREE.Color(0x80ffff), // Cian claro
  ];

  // Exponer funciones al ámbito global para que los botones puedan acceder a ellas
  // window.setTopView = setTopView;
  // window.setIsometricView = setIsometricView;
  // window.resetView = resetView;
  // window.setColorMode = setColorMode;
  // window.togglePolylines = togglePolylines;
  // window.toggleWaterSimulation = toggleWaterSimulation;
  // window.updateParticleCount = updateParticleCount;
  // window.updateFlowSpeed = updateFlowSpeed;
  // window.toggleNormalsMode = toggleNormalsMode;

  // Variables para el sistema de estelas
  let trailSystem;
  let particleTails = [];
  const trailLength = 50; // Aumentado de 5 a 50 (10 veces más largo)
  // useEffect(() => {
  //   if (!sceneRef.current) {
  //     sceneRef.current = new THREE.Scene();
  //     WaterParticles.initWaterSystem(sceneRef.current); // Pasa la escena solo una vez
  //   }
  // }, []);

  // Inicializar la escena
  const init = () => {
    if (!scene.current && mountRef.current) {
      // Inicializar solo una vez
      scene.current = new THREE.Scene();
      scene.current.background = new THREE.Color('#101830'); // Azul oscuro profundo

      // Crear la cámara ortográfica
      const aspect = window.innerWidth / window.innerHeight;
      camera.current = new THREE.OrthographicCamera(
        -200 * aspect,
        200 * aspect,
        200,
        -200,
        0.1,
        10000);
      camera.current.position.set(200, 200, 200);
      camera.current.up.set(0, 0, 1); // Z hacia arriba como en indexmuestra.html
      camera.current.lookAt(0, 0, 0);

      // Configuración del renderizador
      renderer.current = new THREE.WebGLRenderer({ antialias: true });
      renderer.current.setSize(window.innerWidth, window.innerHeight);
      mountRef.current.appendChild(renderer.current.domElement);

      // Controles para rotar, hacer zoom y mover la cámara
      controls.current = new OrbitControls(camera.current, renderer.current.domElement);
      controls.current.enableDamping = true;
      controls.current.dampingFactor = 0.25;
      controls.current.screenSpacePanning = true;
      controls.current.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      };
      controls.current.zoomToCursor = true; // Habilitar zoom hacia el cursor
      controls.current.dollySpeed = 1.0; // Velocidad del zoom

      // Mejorar el comportamiento del zoom con la rueda del ratón
      renderer.current.domElement.addEventListener("wheel", handleMouseWheel, {
        passive: false,
      });

      // Añadir ejes de coordenadas para depuración visual - ajustar orientación
      const axesHelper = new THREE.AxesHelper(50);
      scene.current.add(axesHelper);

      // Configurar iluminación
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
      scene.current.add(ambientLight);

      // Añadir luces direccionales desde múltiples ángulos para mejor visualización
      const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.5);
      directionalLight1.position.set(1, 1, 1);
      scene.current.add(directionalLight1);

      const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
      directionalLight2.position.set(-1, -1, -1);
      scene.current.add(directionalLight2);

      const directionalLight3 = new THREE.DirectionalLight(0xffffff, 0.2);
      directionalLight3.position.set(0, 0, 1);
      scene.current.add(directionalLight3);

      // Luz principal desde arriba-derecha
      const mainLight = new THREE.DirectionalLight(0xffffff, 0.6);
      mainLight.position.set(1, 1, 2).normalize();
      scene.current.add(mainLight);

      // Luz secundaria desde el lado opuesto para evitar sombras duras
      const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
      fillLight.position.set(-1, -1, 1).normalize();
      scene.current.add(fillLight);

      // Luz trasera para resaltar contornos
      const rimLight = new THREE.DirectionalLight(0xffffff, 0.2);
      rimLight.position.set(0, -2, -1).normalize();
      scene.current.add(rimLight);

      // Configurar geometría y material
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array([
        0, 0, 0,  // Vértice 1
        1, 0, 0,  // Vértice 2
        0, 1, 0   // Vértice 3
      ]);
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.computeVertexNormals();

      const material = new THREE.MeshPhongMaterial({
        color: 0xffd700,
        specular: 0x222222,
        shininess: 10,
        flatShading: false,
        side: THREE.DoubleSide,
      });

      currentMesh.current = new THREE.Mesh(geometry, material);

      // Añadir la malla a la escena
      scene.current.add(currentMesh.current);

      // Cargar la malla desde el archivo JSON
      loadMeshFromJSON();

      // Cargar las polilíneas desde el archivo JSON
      loadPolylinesFromJSON();

      // Cargar los objetos desde objects.json
      // ObjectsLoader.loadObjectsFromJSON(scene.current, raycaster.current, objects);
      ObjectsLoader.loadObjectsFromJSON(scene.current, raycaster.current, objectsJson);

      // Inicializar raycaster para interactividad
      initializeRaycaster();

      // Inicializar el indicador de zoom
      zoomIndicator = document.getElementById("zoomIndicator");

      // Manejar el cambio de tamaño de la ventana
      window.addEventListener("resize", onWindowResize);

      // Inicializar el sistema de agua
      WaterParticles.initWaterSystem(scene.current);

      // Ajustar la cámara
      fitCameraToScene();

      // Iniciar animación
      animate();

      // Programar el inicio automático de la simulación después de cargar todo
      setTimeout(() => {
        console.log("Iniciando simulación desde init()...");
        WaterParticles.startWaterSimulation(currentMesh);
      }, 3000);

      // Inicializar la barra lateral de listas
      // ListsSidebar.initSidebar();

      // Inicializar el selector de suelos en la barra lateral
      // SelectSuelosJs.initSuelosSelector();
    }
  };

  // Inicializar raycaster para interactividad con la malla
  const initializeRaycaster = () => {
    raycaster.current = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    tooltip.current = document.getElementById("tooltip");
    if (!tooltip.current) {
      console.error("El elemento tooltip no se encontró en el DOM.");
    }

    console.log("Raycaster inicializado");

    // Configurar parámetros del raycaster para mejor detección
    raycaster.current.params.Points.threshold = 0.1;
    raycaster.current.params.Line.threshold = 0.1;
    raycaster.current.params.Mesh = {
      threshold: 0,
      firstHitOnly: false,
    };

    // Escuchar eventos del ratón
    renderer.current?.domElement.addEventListener("mousemove", onMouseMove);
    renderer.current?.domElement.addEventListener("mouseout", onMouseOut);
    // Añadir event listener para clic en el terreno
    // renderer.current?.domElement.addEventListener('click', onTerrainClick);
  };

  // Manejar movimiento del ratón para actualizar tooltips
  const onMouseMove = (event: { clientX: number; clientY: number; }) => {
    // Calcular posición del mouse normalizada (-1 a +1)
    const rect = renderer.current?.domElement.getBoundingClientRect();
    if (rect) {
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    }
    if (rect) {
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    // Actualizar raycaster y verificar intersecciones al mover el ratón
    checkIntersection(event);
  }

  // Ocultar tooltip cuando el ratón sale del canvas
  const onMouseOut = () => {
    hideTooltipWithDelay();
  }

  // Verificar si el ratón está sobre un vértice para mostrar información
  const checkIntersection = (event: { clientX: number; clientY: number; }) => {
    if (!raycaster.current || !currentMesh.current || colorMode.current === 'uniform') {
      hideTooltipWithDelay();
      removeHighlight();
      return;
    }

    // Actualizar el raycaster con la posición del mouse
    raycaster.current.setFromCamera(mouse, camera.current!);

    // Primero verificar intersección con objetos (prioridad para tooltips de objetos)
    const objectIntersected = ObjectsLoader.checkObjectIntersection(
      raycaster.current,
      mouse,
      camera.current!,
      tooltip.current!
    );

    if (objectIntersected) {
      // Si hay intersección con objeto, remover resaltado del terreno y salir
      removeHighlight();
      lastVertexIndex = -1;
      tooltipStickinessActive = false;
      return;
    }

    // Calcular intersecciones con la malla del terreno solo si no hay objetos intersectados
    const intersects = raycaster.current.intersectObject(currentMesh.current);

    let foundVertex = false;

    if (intersects.length > 0) {
      // Encontrar el vértice más cercano a la intersección
      const intersection = intersects[0];
      const faceIndex = intersection.faceIndex;

      if (faceIndex !== undefined) {
        const geometry = currentMesh.current!.geometry;
        const face = geometry.getIndex()?.array.slice(faceIndex * 3, (faceIndex * 3) + 3);

        // Buscar el vértice más cercano de los tres que forman la cara
        const vertexIndex = findClosestVertex(face, intersection.point);

        if (vertexIndex !== -1 && vertexValues.current[colorMode.current] && vertexIndex < vertexValues.current[colorMode.current]?.length) {
          console.log("Vértice encontrado:", vertexIndex, "Valor:", vertexValues.current[colorMode.current][vertexIndex]);
          foundVertex = true;
          lastVertexIndex = vertexIndex;
          tooltipStickinessActive = false; // Desactivar pegajosidad cuando hay un nuevo vértice

          // Mostrar tooltip con los valores
          showTooltip(vertexIndex, event);
          console.log("Vértice encontrado:", vertexIndex, "Valor:", vertexValues.current[colorMode.current][vertexIndex]);
          // Añadir indicador visual en el vértice
          highlightVertex(vertexIndex);

        }

        // if (vertexIndex !== -1) {
        //   showTooltip(vertexIndex, event);
        //   highlightVertex(vertexIndex);
        //   return;
        // }
      }
    }

    // Si no encontramos vértice pero había uno activo recientemente, mantener el tooltip brevemente
    if (!foundVertex && lastVertexIndex !== -1 && vertexValues.current[colorMode.current] &&
      lastVertexIndex < vertexValues.current[colorMode.current].length) {

      if (!tooltipStickinessActive) {
        tooltipStickinessActive = true;

        // Programar la eliminación del tooltip después del tiempo de pegajosidad
        setTimeout(() => {
          if (tooltipStickinessActive) {
            hideTooltipWithDelay();
            removeHighlight();
            lastVertexIndex = -1;
            tooltipStickinessActive = false;
          }
        }, tooltipStickiness);
      }
    } else if (!foundVertex) {
      hideTooltipWithDelay();
      removeHighlight();
      lastVertexIndex = -1;
      tooltipStickinessActive = false;
    }
  }

  // Encontrar el vértice más cercano al punto de intersección
  const findClosestVertex = (faceVertices, point) => {
    if (!currentMesh) return -1;

    const geometry = currentMesh.current!.geometry;
    const positions = geometry.attributes.position.array;

    let closestDistance = Infinity;
    let closestVertex = -1;

    // Cache para evitar cálculos repetidos
    const vertexPoints = {};

    // Comprobar cada vértice de la cara
    for (let i = 0; i < 3; i++) {
      const vertexIndex = faceVertices[i];

      // Usar caché si ya calculamos este vértice
      if (!vertexPoints[vertexIndex]) {
        const x = positions[vertexIndex * 3];
        const y = positions[vertexIndex * 3 + 1];
        const z = positions[vertexIndex * 3 + 2];
        vertexPoints[vertexIndex] = new THREE.Vector3(x, y, z);
      }

      const vertexPoint = vertexPoints[vertexIndex];
      const distance = point.distanceTo(vertexPoint);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestVertex = vertexIndex;
      }
    }

    // Utilizar un umbral adaptativo basado en el tamaño de la malla
    const meshSize = boundingBox.current ? boundingBox.current.getSize(new THREE.Vector3()).length() : 100;
    const threshold = meshSize * 0.005; // 0.5% del tamaño de la malla

    return closestDistance < threshold ? closestVertex : -1;
  }

  // Ocultar tooltip con un pequeño retraso para evitar parpadeos
  const hideTooltipWithDelay = () => {
    if (tooltipStickinessActive) {
      return; // No ocultar si la pegajosidad está activa
    }

    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
    }

    tooltipTimeout = setTimeout(() => {
      if (!tooltipStickinessActive) { // Verificar nuevamente por seguridad
        tooltip.current!.style.display = 'none';
      }
    }, 150); // Retraso de 150ms antes de ocultar
  }

  // Mostrar tooltip con información del vértice
  const showTooltip = (vertexIndex: number, event: { clientX: any; clientY: any; }) => {
    if (!vertexValues.current[colorMode.current] || vertexIndex >= vertexValues.current[colorMode.current].length) {
      hideTooltipWithDelay();
      return;
    }

    const value = vertexValues.current[colorMode.current][vertexIndex];
    if (value === undefined) {
      hideTooltipWithDelay();
      return;
    }

    // Limpiar cualquier timeout pendiente
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
      tooltipTimeout = null;
    }

    // Preparar contenido del tooltip según el modo de color
    let title = colorMode.current === 'slope' ? 'Pendiente' : 'Convexidad';

    // Formatear el valor numérico (2 decimales)
    let formattedValue = typeof value === 'number' ? value.toFixed(2) : value;

    // Añadir posición del vértice para más contexto
    const geometry = currentMesh.current!.geometry;
    const positions = geometry.attributes.position.array;
    const x = positions[vertexIndex * 3].toFixed(2);
    const y = positions[vertexIndex * 3 + 1].toFixed(2);
    const z = positions[vertexIndex * 3 + 2].toFixed(2);

    // Actualizar y mostrar tooltip con más información
    tooltip.current!.innerHTML = `
        <strong>${title}:</strong> ${formattedValue}<br>
        <small>Coordenadas: [${x}, ${y}, ${z}]</small>
    `;

    // Calcular posición óptima para el tooltip
    const mouseX = event.clientX;
    const mouseY = event.clientY;

    // Evitar que el tooltip salga de la pantalla
    const tooltipWidth = 150;  // Ancho aproximado
    const tooltipHeight = 60;  // Alto aproximado

    let left = mouseX + 15;
    let top = mouseY + 15;

    // Ajustar si está cerca del borde derecho
    if (left + tooltipWidth > window.innerWidth) {
      left = mouseX - tooltipWidth - 10;
    }

    // Ajustar si está cerca del borde inferior
    if (top + tooltipHeight > window.innerHeight) {
      top = mouseY - tooltipHeight - 10;
    }

    // Aplicar la posición
    tooltip.current!.style.left = left + 'px';
    tooltip.current!.style.top = top + 'px';
    tooltip.current!.style.display = 'block';
  }

  // Función para resaltar un vértice
  const highlightVertex = (vertexIndex) => {
    // Eliminar resaltado anterior si existe
    removeHighlight();

    // Obtener posición del vértice
    const geometry = currentMesh.current!.geometry;
    const positions = geometry.attributes.position.array;

    const x = positions[vertexIndex * 3];
    const y = positions[vertexIndex * 3 + 1];
    const z = positions[vertexIndex * 3 + 2];

    // Crear geometría para el punto destacado
    const pointGeometry = new THREE.SphereGeometry(0.5, 8, 8);
    const pointMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.8
    });

    highlightPoint.current = new THREE.Mesh(pointGeometry, pointMaterial);
    highlightPoint.current.position.set(x, y, z);
    highlightPoint.current.renderOrder = 1000; // Para que esté por encima de todo

    scene.current?.add(highlightPoint.current);
  }

  // Eliminar el resaltado de vértice
  const removeHighlight = () => {
    if (highlightPoint.current) {
      scene.current?.remove(highlightPoint.current);
      highlightPoint.current.geometry.dispose();
      highlightPoint.current.material.dispose();
      highlightPoint.current = null;
    }
  }

  // Función para cargar la malla desde gen.json
  const loadMeshFromJSON = () => {
    setLoadingMessage("Iniciando carga de gen.json...");
    console.log("Iniciando carga de gen.json");
    // let jsonText = JSON.stringify(genContent);
    // let jsonText = JSON.parse(project.genJson); // Cambiado a project.genJson
    // console.log(JSON.stringify(genContent).substring(0, 150));
    // console.log(jsonText.substring(0, 150));
    // Eliminar BOM si existe
    // if (jsonText.charCodeAt(0) === 0xFEFF) {
    //   jsonText = jsonText.slice(1);
    // }
    setLoadingMessage("Analizando JSON...");
    // const data = JSON.parse(project.genJson); // Cambiado a project.genJson
    const data =
      typeof genJson === "string"
        ? JSON.parse(genJson)
        : genJson;
    setLoadingMessage("JSON analizado, creando malla...");

    console.log("Datos JSON cargados, construyendo malla...");
    loadGemJSON(data);

    // Crear el prisma de vidrio alrededor del terreno
    createGlassPrism();

    // Extraer normales de gen.json si están disponibles
    extractNormalsFromJSON(data);
  }

  // Función para crear un prisma de vidrio alrededor del terreno
  function createGlassPrism() {
    if (!currentMesh.current || !boundingBox.current) return;

    console.log("Creando prisma de vidrio...");

    // Obtener el boundingBox del terreno para determinar tamaño
    const geometry = currentMesh.current.geometry;
    geometry.computeBoundingBox();
    boundingBox.current = geometry.boundingBox!;

    console.log("Bounds del terreno:", {
      min: {
        x: boundingBox.current.min.x.toFixed(2),
        y: boundingBox.current.min.y.toFixed(2),
        z: boundingBox.current.min.z.toFixed(2)
      },
      max: {
        x: boundingBox.current.max.x.toFixed(2),
        y: boundingBox.current.max.y.toFixed(2),
        z: boundingBox.current.max.z.toFixed(2)
      }
    });

    // Aumentar un poco el tamaño para asegurar que contiene todo el terreno
    const width = boundingBox.current.max.x - boundingBox.current.min.x + 20;
    const height = boundingBox.current.max.y - boundingBox.current.min.y + 20;
    const depth = boundingBox.current.max.z - boundingBox.current.min.z + 50; // Más espacio en la parte superior

    console.log("Dimensiones del prisma:", {
      width: width.toFixed(2),
      height: height.toFixed(2),
      depth: depth.toFixed(2)
    });

    // Crear geometría del prisma
    const prismGeometry = new THREE.BoxGeometry(width, height, depth);

    // Material de vidrio (transparente con reflejos sutiles)
    const prismMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xccffff,            // Color azul muy claro
      transparent: true,
      opacity: 0.15,              // Muy transparente
      roughness: 0.05,            // Muy pulido
      metalness: 0.05,
      transmission: 0.98,         // Alta transmisión de luz
      reflectivity: 0.2,          // Reflectividad sutil
      clearcoat: 1.0,             // Capa brillante máxima
      clearcoatRoughness: 0.1,    // Casi perfectamente pulido
      envMapIntensity: 1.5,       // Refleja más el ambiente
      side: THREE.BackSide,       // Render solo desde dentro para evitar artefactos
      depthWrite: false           // Para evitar problemas de renderizado con transparencia
    });

    // Crear el mesh del prisma
    glassPrism = new THREE.Mesh(prismGeometry, prismMaterial);

    // Posicionar en el centro del terreno
    glassPrism.position.set(
      (boundingBox.current.max.x + boundingBox.current.min.x) / 2,
      (boundingBox.current.max.y + boundingBox.current.min.y) / 2,
      (boundingBox.current.max.z + boundingBox.current.min.z) / 2
    );

    // Agregar a la escena
    scene.current.add(glassPrism);

    // Crear el sistema de líneas de sección
    createSectionLines(width, height, depth, glassPrism.position);

    // Crear el sistema de líneas de sección del terreno
    createTerrainSectionLines();

    console.log("Prisma de vidrio creado");
  }
  // Función para crear líneas de sección en las caras del prisma
  function createSectionLines(width, height, depth, center) {
    // Remover líneas anteriores si existen
    if (sectionLines) {
      scene.current.remove(sectionLines);
      sectionLines.geometry.dispose();
      sectionLines.material.dispose();
    }

    // Crear material para las líneas de sección con el mismo color que el fondo
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x536878, // Color gris oscuro que coincide con el fondo
      linewidth: 2,
      transparent: true,
      opacity: 0.9,
      depthTest: false,
      depthWrite: false
    });

    // Crear geometría para las líneas (inicialmente vacía)
    const lineGeometry = new THREE.BufferGeometry();

    // Crear objeto línea usando LineSegments para dibujar líneas independientes
    sectionLines = new THREE.LineSegments(lineGeometry, lineMaterial);
    sectionLines.renderOrder = 1000; // Para que se muestre por encima de todo
    sectionLines.visible = false; // Inicialmente oculto

    // Añadir líneas a la escena
    scene.current.add(sectionLines);
  }

  // Función para actualizar la línea de sección basada en la posición del ratón
  function updateSectionLines(intersectPoint) {
    if (!sectionLines || !glassPrism) return;

    // Obtener el tamaño y posición del prisma
    const prismSize = new THREE.Vector3();
    const prismBox = new THREE.Box3().setFromObject(glassPrism);
    prismBox.getSize(prismSize);

    const halfWidth = prismSize.x / 2;
    const halfHeight = prismSize.y / 2;
    const halfDepth = prismSize.z / 2;
    const prismCenter = glassPrism.position;

    const minX = prismCenter.x - halfWidth;
    const maxX = prismCenter.x + halfWidth;
    const minY = prismCenter.y - halfHeight;
    const maxY = prismCenter.y + halfHeight;
    const minZ = prismCenter.z - halfDepth;
    const maxZ = prismCenter.z + halfDepth;

    // Crear puntos para las líneas de sección
    const points = [];

    // Puntos para líneas horizontales (proyección en caras X constante)
    points.push(
      // Cara izquierda (X mínimo)
      new THREE.Vector3(minX, intersectPoint.y, minZ),
      new THREE.Vector3(minX, intersectPoint.y, maxZ),

      // Cara derecha (X máximo)
      new THREE.Vector3(maxX, intersectPoint.y, minZ),
      new THREE.Vector3(maxX, intersectPoint.y, maxZ)
    );

    // Puntos para líneas verticales (proyección en caras Y constante)
    points.push(
      // Cara trasera (Y mínimo)
      new THREE.Vector3(intersectPoint.x, minY, minZ),
      new THREE.Vector3(intersectPoint.x, minY, maxZ),

      // Cara frontal (Y máximo)
      new THREE.Vector3(intersectPoint.x, maxY, minZ),
      new THREE.Vector3(intersectPoint.x, maxY, maxZ)
    );

    // Líneas constantes en Z (cara superior e inferior)
    points.push(
      // Cara inferior (Z mínimo)
      new THREE.Vector3(minX, intersectPoint.y, minZ),
      new THREE.Vector3(maxX, intersectPoint.y, minZ),
      new THREE.Vector3(intersectPoint.x, minY, minZ),
      new THREE.Vector3(intersectPoint.x, maxY, minZ),

      // Cara superior (Z máximo)
      new THREE.Vector3(minX, intersectPoint.y, maxZ),
      new THREE.Vector3(maxX, intersectPoint.y, maxZ),
      new THREE.Vector3(intersectPoint.x, minY, maxZ),
      new THREE.Vector3(intersectPoint.x, maxY, maxZ)
    );

    // Actualizar la geometría de la línea usando LINE_SEGMENTS para mejor visualización
    sectionLines.geometry.dispose();
    sectionLines.geometry = new THREE.BufferGeometry().setFromPoints(points);

    // Cambiar el tipo de geometría a LINE_SEGMENTS para dibujar segmentos independientes
    if (sectionLines.type !== 'LineSegments') {
      scene.current.remove(sectionLines);
      sectionLines.material.dispose();

      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0xff3333,
        linewidth: 2,
        transparent: true,
        opacity: 0.9,
        depthTest: false,
        depthWrite: false
      });

      sectionLines = new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints(points),
        lineMaterial
      );
      sectionLines.renderOrder = 1000;
      scene.current.add(sectionLines);
    } else {
      sectionLines.geometry = new THREE.BufferGeometry().setFromPoints(points);
    }

    sectionLines.visible = true;

    // Actualizar las líneas de sección del terreno
    updateTerrainSectionLines(intersectPoint);
  }

  // Función para crear las líneas de sección del terreno
  function createTerrainSectionLines() {
    // Remover líneas anteriores si existen
    if (terrainSectionLines) {
      scene.current.remove(terrainSectionLines);
      terrainSectionLines.geometry.dispose();
      terrainSectionLines.material.dispose();
    }

    // Crear material para las líneas de sección del terreno (negro)
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x000000,  // Negro
      linewidth: 2,
      transparent: true,
      opacity: 0.9,
      depthTest: true,
      depthWrite: true
    });

    // Crear geometría para las líneas (inicialmente vacía)
    const lineGeometry = new THREE.BufferGeometry();

    // Crear objeto línea usando LineSegments
    terrainSectionLines = new THREE.LineSegments(lineGeometry, lineMaterial);
    terrainSectionLines.renderOrder = 999; // Para asegurar que se vea por encima de la malla
    terrainSectionLines.visible = false; // Inicialmente oculto

    // Añadir líneas a la escena
    scene.current.add(terrainSectionLines);
  }

  // Función para actualizar las líneas de sección del terreno
  function updateTerrainSectionLines(intersectPoint) {
    if (!terrainSectionLines || !currentMesh) return;

    // Obtener los límites del terreno
    const geometry = currentMesh.geometry;
    const box = new THREE.Box3().setFromObject(currentMesh);
    const size = box.getSize(new THREE.Vector3());

    // Obtener puntos de sección horizontal (corte X-Z)
    const ySection = intersectPoint.y;
    const horizontalPoints = computeTerrainSectionPoints(geometry, 'y', ySection);

    // Obtener puntos de sección vertical (corte Y-Z)
    const xSection = intersectPoint.x;
    const verticalPoints = computeTerrainSectionPoints(geometry, 'x', xSection);

    // Combinar ambos grupos de puntos
    const allPoints = [...horizontalPoints, ...verticalPoints];

    // Actualizar la geometría si tenemos puntos
    if (allPoints.length > 0) {
      terrainSectionLines.geometry.dispose();
      terrainSectionLines.geometry = new THREE.BufferGeometry().setFromPoints(allPoints);
      terrainSectionLines.visible = true;
    } else {
      terrainSectionLines.visible = false;
    }
  }

  // Calcular puntos de intersección del terreno con un plano de sección
  function computeTerrainSectionPoints(geometry, axis, value) {
    const points = [];
    const indices = geometry.index.array;
    const positions = geometry.attributes.position.array;

    // Procesar cada triángulo
    for (let i = 0; i < indices.length; i += 3) {
      const i1 = indices[i] * 3;
      const i2 = indices[i + 1] * 3;
      const i3 = indices[i + 2] * 3;

      const v1 = new THREE.Vector3(positions[i1], positions[i1 + 1], positions[i1 + 2]);
      const v2 = new THREE.Vector3(positions[i2], positions[i2 + 1], positions[i2 + 2]);
      const v3 = new THREE.Vector3(positions[i3], positions[i3 + 1], positions[i3 + 2]);

      // Intersectar el triángulo con el plano
      const intersectionPoints = intersectTriangleWithPlane(v1, v2, v3, axis, value);
      if (intersectionPoints.length === 2) {
        points.push(...intersectionPoints);
      }
    }

    return points;
  }

  // Intersectar un triángulo con un plano
  function intersectTriangleWithPlane(v1, v2, v3, axis, value) {
    const result = [];

    // Comprobar los tres segmentos del triángulo
    checkSegmentPlaneIntersection(v1, v2, axis, value, result);
    checkSegmentPlaneIntersection(v2, v3, axis, value, result);
    checkSegmentPlaneIntersection(v3, v1, axis, value, result);

    return result;
  }

  // Comprobar intersección de un segmento con el plano
  function checkSegmentPlaneIntersection(p1, p2, axis, value, result) {
    // Obtener los valores del eje relevante
    const val1 = p1[axis];
    const val2 = p2[axis];

    // Verificar si el segmento cruza el plano
    if ((val1 < value && val2 > value) || (val1 > value && val2 < value)) {
      // Calcular el factor de interpolación
      const t = (value - val1) / (val2 - val1);

      // Interpolar la posición 3D
      const point = new THREE.Vector3();
      point.copy(p1).lerp(p2, t);

      // Añadir el punto al resultado
      result.push(point);
    }
  }

  // Extraer normales del JSON
  const extractNormalsFromJSON = (data) => {
    // Esta función ha sido movida a water-particles.js
    console.warn("Esta función ha sido reemplazada por WaterParticles.extractNormalsFromJSON()");
    WaterParticles.extractNormalsFromJSON(data);
  }

  // Función para procesar el archivo JSON y crear la malla
  const loadGemJSON = (jsonData) => {
    console.log("Cargando malla desde JSON...");
    setLoadingMessage("Cargando malla desde JSON...");
    // console.log("Datos JSON:", jsonData);
    console.log("Tipo de datos JSON:", typeof jsonData);
    try {
      // Eliminar la malla anterior si existe
      // if (currentMesh) {
      //   scene.current!.remove(currentMesh.current!);
      //   currentMesh.current!.geometry.dispose();
      //   if (Array.isArray(currentMesh.current!.material)) {
      //     currentMesh.current!.material.forEach((material) => material.dispose());
      //   } else {
      //     currentMesh.current!.material.dispose();
      //   }
      // }

      // Extraer vértices y caras del JSON
      setLoadingMessage("Analizando datos del JSON...");

      if (!jsonData) {
        throw new Error("Datos JSON no válidos o vacíos");
      }

      const vertices = jsonData.vertices || [];
      console.log("Vertices:", vertices.length);
      const faces = jsonData.faces || [];
      console.log("Caras:", faces.length);
      // Extraer datos de color si existen
      console.log("Buscando datos de color en el JSON...");
      // Analizar la estructura del JSON para determinar dónde están los colores
      let verticesWithColors = null;

      // Caso 1: Los colores están directamente en los vértices
      if (jsonData.vertices && Array.isArray(jsonData.vertices) && jsonData.vertices.length > 0) {
        // Verificar si los vértices tienen propiedades de color
        const sampleVertex = jsonData.vertices[0];
        if (typeof sampleVertex === 'object' &&
          (sampleVertex.color_slope || sampleVertex.color_convex)) {
          console.log("Colores encontrados en los vértices");
          verticesWithColors = jsonData.vertices;
        }
      }

      // Caso 2: Los colores están en un array separado a nivel raíz
      if (!verticesWithColors && Array.isArray(jsonData) && jsonData.length > 0) {
        const sampleItem = jsonData[0];
        if (typeof sampleItem === 'object' &&
          (sampleItem.color_slope || sampleItem.color_convex)) {
          console.log("Colores encontrados en el array raíz");
          verticesWithColors = jsonData;
        }
      }

      // Caso 3: Buscar en todas las propiedades que sean arrays
      if (!verticesWithColors) {
        for (const key in jsonData) {
          if (Array.isArray(jsonData[key]) && jsonData[key].length > 0) {
            const sampleItem = jsonData[key][0];
            if (typeof sampleItem === 'object' &&
              (sampleItem.color_slope || sampleItem.color_convex)) {
              console.log(`Colores encontrados en la propiedad '${key}'`);
              verticesWithColors = jsonData[key];
              break;
            }
          }
        }
      }

      // Si encontramos colores, guardarlos
      if (verticesWithColors) {
        colorData.current.slope = verticesWithColors;
        colorData.current.convex = verticesWithColors;
        console.log("Datos de color cargados:", verticesWithColors.length, "elementos");

        // Extraer los valores de pendiente y convexidad para tooltips
        extractVertexValues(verticesWithColors);

        // Verificar el formato de los datos de color examinando el primero
        const sampleColor = verticesWithColors[0];
        console.log("Muestra de datos de color:", sampleColor);
      } else {
        console.warn("No se encontraron datos de color en el JSON");
      }

      console.log("Datos extraídos:", {
        tipoVertices: typeof vertices,
        longitudVertices: vertices.length,
        tipoCaras: typeof faces,
        longitudCaras: faces.length
      });

      if (!vertices.length) {
        throw new Error("No se encontraron vértices en el archivo JSON");
      }

      if (!faces.length) {
        throw new Error("No se encontraron caras en el archivo JSON");
      }

      // Crear la geometría
      setLoadingMessage("Creando geometría...");
      const geometry = new THREE.BufferGeometry();

      // Añadir vértices a la geometría con posible transformación de coordenadas
      setLoadingMessage("Procesando vértices...");

      let positions;

      // Si los vértices parecen estar en formato plano, procesarlos adecuadamente
      if (typeof vertices[0] === 'number') {
        console.log("Usando vértices en formato plano");

        // Verificar si la longitud es múltiplo de 3 (xyz por vértice)
        if (vertices.length % 3 !== 0) {
          console.warn("Advertencia: La longitud del array de vértices no es múltiplo de 3. Longitud:", vertices.length);
        }

        // Crear un nuevo array para almacenar las coordenadas
        positions = new Float32Array(vertices.length);

        // Mantener coordenadas como están (sin intercambio) para que se vea como un terreno normal
        for (let i = 0; i < vertices.length; i += 3) {
          positions[i] = vertices[i];       // X permanece igual
          positions[i + 1] = vertices[i + 1]; // Y permanece igual
          positions[i + 2] = vertices[i + 2]; // Z permanece igual
        }
      }
      // Si los vértices están en formato de arrays anidados, transformarlos
      else if (Array.isArray(vertices[0])) {
        console.log("Usando vértices en formato anidado");
        positions = new Float32Array(vertices.length * 3);

        for (let i = 0; i < vertices.length; i++) {
          const v = vertices[i];
          if (v.length < 3) {
            console.warn(`Advertencia: Vértice ${i} tiene menos de 3 componentes:`, v);
            positions[i * 3] = v[0] || 0;     // X o cero
            positions[i * 3 + 1] = v[1] || 0; // Y o cero
            positions[i * 3 + 2] = v[2] || 0; // Z o cero
          } else {
            positions[i * 3] = v[0];     // X permanece igual
            positions[i * 3 + 1] = v[1]; // Y permanece igual
            positions[i * 3 + 2] = v[2]; // Z permanece igual
          }
        }
      } else {
        throw new Error("Formato de vértices no reconocido: " + typeof vertices[0]);
      }

      // Asignar los vértices a la geometría
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      // Convertir caras a índices para BufferGeometry
      setLoadingMessage("Procesando caras...");
      const indices = [];

      // Verificar si faces es un array plano o de arrays anidados
      if (typeof faces[0] === 'number') {
        console.log("Usando caras en formato plano");

        // Verificar si la longitud es múltiplo de 3 (índices por triángulo)
        if (faces.length % 3 !== 0) {
          console.warn("Advertencia: La longitud del array de caras no es múltiplo de 3. Longitud:", faces.length);
        }

        // Si es un array plano, asumimos que son triplas de índices para triángulos
        indices.push(...faces);
      } else if (Array.isArray(faces[0])) {
        console.log("Usando caras en formato anidado");
        // Si las caras son arrays anidados, procesamos cada cara
        for (const face of faces) {
          // Si las caras son triángulos
          if (face.length === 3) {
            indices.push(...face);
          }
          // Si las caras son cuadriláteros (los dividimos en dos triángulos)
          else if (face.length === 4) {
            indices.push(face[0], face[1], face[2]);
            indices.push(face[0], face[2], face[3]);
          } else {
            console.warn("Advertencia: Cara con número inusual de vértices:", face.length);
            // Intentar triangulación básica en forma de abanico para polígonos
            for (let i = 1; i < face.length - 1; i++) {
              indices.push(face[0], face[i], face[i + 1]);
            }
          }
        }
      } else {
        throw new Error("Formato de caras no reconocido: " + typeof faces[0]);
      }

      // Si el array de índices no está vacío, añadirlo a la geometría
      if (indices.length > 0) {
        console.log(`Creando malla con ${indices.length} índices para ${indices.length / 3} triángulos`);

        // Convertir a un tipo apropiado basado en el número de vértices
        let indexAttribute;
        if (positions.length / 3 > 65535) {
          indexAttribute = new THREE.Uint32BufferAttribute(indices, 1);
        } else {
          indexAttribute = new THREE.Uint16BufferAttribute(indices, 1);
        }

        geometry.setIndex(indexAttribute);
      } else {
        throw new Error("No se pudieron generar índices válidos para la geometría");
      }

      // Calcular normales para el sombreado
      setLoadingMessage("Calculando normales...");
      geometry.computeVertexNormals();

      // Crear material y malla (usando MeshPhongMaterial para mejor aspecto)
      setLoadingMessage("Creando malla...");
      const material = new THREE.MeshPhongMaterial({
        color: 0x000000, // Color negro como en desarrollo
        specular: 0x222222,
        shininess: 10, // Menos brillo para que los colores sean más fieles
        flatShading: false,
        side: THREE.DoubleSide,
        vertexColors: false // Inicialmente no usar colores por vértice
      });

      currentMesh.current = new THREE.Mesh(geometry, material);

      // Añadir la malla a la escena
      scene.current?.add(currentMesh.current!);

      // Ajustar la cámara para visualizar toda la malla
      setLoadingMessage("Ajustando vista...");
      fitCameraToScene();

      // Establecer vista isométrica por defecto
      setIsometricView();

      // Ocultar el mensaje de carga
      setLoadingMessage(null);

      console.log("Malla cargada con éxito:", {
        vértices: positions.length / 3,
        triángulos: indices.length / 3
      });

      // Agregar la malla a la escena
      scene.current?.add(currentMesh.current!);

      // Extraer normales de gen.json si están disponibles
      WaterParticles.extractNormalsFromJSON(jsonData);

      console.log("Malla creada exitosamente");

      // Aplicar automáticamente el degradado de altura para que no se quede dorado
      setTimeout(() => {
        if (currentMesh.current) {
          setColorMode("slope");
        }
      }, 500);

    } catch (error) {
      console.error("Error al cargar la malla:", error);
      setLoadingMessage("Error al cargar la malla: " + error.message);
      setLoadingStyle({ backgroundColor: "rgba(255,0,0,0.7)" });
    }

  }

  // Función para crear líneas de contorno topográfico
  const createContourLines = () => {
    if (!currentMesh) return;

    console.log("Creando líneas de contorno topográfico...");
    setLoadingMessage("Generando líneas de nivel...");

    // Eliminar líneas anteriores si existen
    if (contourLines) {
      scene.current.remove(contourLines.current);
      // contourLines.current.geometry.dispose();
      // contourLines.current.material.dispose();
      contourLines.current = null;
    }

    // Obtener geometría de la malla
    const geometry = currentMesh.current.geometry;
    const positionAttribute = geometry.attributes.position;
    const indexAttribute = geometry.index;

    // Calcular rango de altura (coordenada Z)
    let minZ = Infinity;
    let maxZ = -Infinity;

    for (let i = 0; i < positionAttribute.count; i++) {
      const z = positionAttribute.getZ(i);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    }

    console.log(`Rango de altura: ${minZ.toFixed(2)} a ${maxZ.toFixed(2)}`);

    // Calcular niveles de contorno basados en el intervalo
    const levels = [];
    const firstLevel = Math.ceil(minZ / contourInterval) * contourInterval;

    for (let level = firstLevel; level <= maxZ; level += contourInterval) {
      levels.push(level);
    }

    console.log(`Generando ${levels.length} líneas de nivel con intervalo de ${contourInterval}m`);

    // Puntos para todas las líneas de contorno
    const contourPoints = [];

    // Para cada cara de la malla
    for (let i = 0; i < indexAttribute.count; i += 3) {
      const idx1 = indexAttribute.getX(i);
      const idx2 = indexAttribute.getX(i + 1);
      const idx3 = indexAttribute.getX(i + 2);

      const v1 = new THREE.Vector3().fromBufferAttribute(positionAttribute, idx1);
      const v2 = new THREE.Vector3().fromBufferAttribute(positionAttribute, idx2);
      const v3 = new THREE.Vector3().fromBufferAttribute(positionAttribute, idx3);

      // Para cada nivel de contorno
      for (const level of levels) {
        // Comprobar si el nivel atraviesa esta cara
        const edges = [];

        // Comprobar cada arista del triángulo
        if ((v1.z <= level && v2.z >= level) || (v1.z >= level && v2.z <= level)) {
          const t = (level - v1.z) / (v2.z - v1.z);
          edges.push(new THREE.Vector3().lerpVectors(v1, v2, t));
        }

        if ((v2.z <= level && v3.z >= level) || (v2.z >= level && v3.z <= level)) {
          const t = (level - v2.z) / (v3.z - v2.z);
          edges.push(new THREE.Vector3().lerpVectors(v2, v3, t));
        }

        if ((v3.z <= level && v1.z >= level) || (v3.z >= level && v1.z <= level)) {
          const t = (level - v3.z) / (v1.z - v3.z);
          edges.push(new THREE.Vector3().lerpVectors(v3, v1, t));
        }

        // Si encontramos dos puntos, tenemos una línea que atraviesa la cara
        if (edges.length === 2) {
          contourPoints.push(edges[0], edges[1]);
        }
      }
    }

    // Crear geometría para las líneas
    const contourGeometry = new THREE.BufferGeometry().setFromPoints(contourPoints);

    // Crear material para líneas muy delgadas en gris oscuro
    const contourMaterial = new THREE.LineBasicMaterial({
      color: 0x333333, // Gris oscuro
      linewidth: 1,    // Linewidth no funciona en WebGL, pero lo dejamos como referencia
      opacity: 0.8,
      transparent: true
    });

    // Crear objeto línea
    contourLines.current = new THREE.LineSegments(contourGeometry, contourMaterial);
    contourLines.current.renderOrder = 998; // Para que se muestre por encima de la malla pero debajo de otras líneas

    // Añadir a la escena
    scene.current.add(contourLines.current);

    setLoadingMessage(null);
    console.log(`Creadas ${contourPoints.length / 2} líneas de contorno`);
  }

  // Ajustar la cámara para que encaje toda la escena
  const fitCameraToScene = () => {
    if (!currentMesh) return;

    // Calcular bounding box de la malla
    boundingBox.current = new THREE.Box3().setFromObject(currentMesh.current!);
    center.current = boundingBox.current.getCenter(new THREE.Vector3());
    size.current = boundingBox.current.getSize(new THREE.Vector3());

    const maxDim = Math.max(size.current.x, size.current.y, size.current.z);
    const aspect = (window.innerWidth - 80) / window.innerHeight;

    // Actualizar parámetros de la cámara ortográfica
    camera.current!.left = -maxDim * aspect / 2;
    camera.current!.right = maxDim * aspect / 2;
    camera.current!.top = maxDim / 2;
    camera.current!.bottom = -maxDim / 2;
    camera.current!.near = 0.1;
    camera.current!.far = maxDim * 4;

    // Actualizar el target de los controles
    controls.current?.target.copy(center.current);
    controls.current?.update();
  }

  // Función para cambiar la vista a planta (desde arriba)
  const setTopView = () => {
    if (!boundingBox.current || !center.current || !size.current) return;
    isTopView = true; // Activar la vista en planta

    const maxDim = Math.max(size.current.x, size.current.y, size.current.z);

    // Vista desde arriba siguiendo la orientación de indexmuestra.html
    camera.current!.position.set(center.current.x, center.current.y, center.current.z + maxDim * 2);
    camera.current!.up.set(0, 1, 0); // Y es arriba en la vista en planta (como en indexmuestra.html)
    camera.current!.lookAt(center.current);
    camera.current!.updateProjectionMatrix();

    // Bloquear el giro para mantener la vista fija
    if (controls.current) {
      controls.current.enableRotate = false;
    }

    // Forzar la actualización de los controles
    controls.current?.target.copy(center.current);
    controls.current?.update();

    // Actualizar botones
    const buttons = document.querySelectorAll("#controls button");
    buttons.forEach((button) => {
      if (button.textContent?.includes("PLANTA")) {
        button.classList.add("active");
      } else if (
        button.textContent?.includes("ISOMÉTRICA") ||
        button.textContent?.includes("Original")
      ) {
        button.classList.remove("active");
      }
    });
  };

  // Función para cambiar la vista a isométrica
  const setIsometricView = () => {
    if (!boundingBox.current || !center.current || !size.current) return;

    isTopView = false; // Desactivar la vista en planta

    const maxDim = Math.max(size.current.x, size.current.y, size.current.z);
    const distance = maxDim * 1.5;

    // Vista isométrica alineada como en indexmuestra.html
    camera.current!.position.set(
      center.current.x + distance,
      center.current.y + distance,
      center.current.z + distance
    );
    camera.current!.up.set(0, 0, 1); // Z es arriba en vista isométrica (estándar)
    camera.current!.lookAt(center.current);
    camera.current!.updateProjectionMatrix();

    // Desbloquear el giro
    if (controls.current) {
      controls.current.enableRotate = true;
    }

    // Forzar la actualización de los controles
    controls.current?.target.copy(center.current);
    controls.current?.update();

    // Actualizar botones
    const buttons = document.querySelectorAll("#controls button");
    buttons.forEach((button) => {
      if (button.textContent?.includes("ISOMÉTRICA")) {
        button.classList.add("active");
      } else if (
        button.textContent?.includes("PLANTA") ||
        button.textContent?.includes("Original")
      ) {
        button.classList.remove("active");
      }
    });
  };

  // Función para restablecer la vista original
  const resetView = () => {
    if (!currentMesh.current) return;

    isTopView = false;

    // Recalcular bounding box y centro
    fitCameraToScene();

    // Desbloquear el giro
    if (controls.current) {
      controls.current.enableRotate = true;
    }

    // Volver a posición similar a la inicial pero no exactamente igual
    const maxDim = Math.max(size.current!.x, size.current!.y, size.current!.z);
    const distance = maxDim * 1.2;

    // Vista un poco más elevada y frontal
    camera.current!.position.set(
      center.current!.x,
      center.current!.y - distance,
      center.current!.z + distance * 0.8
    );
    camera.current!.up.set(0, 0, 1); // Z es arriba (estándar)
    camera.current!.lookAt(center.current!);
    camera.current!.updateProjectionMatrix();

    // Forzar la actualización de los controles
    controls.current?.target.copy(center.current!);
    controls.current?.update();

    // Actualizar botones
    const buttons = document.querySelectorAll("#controls button");
    buttons.forEach((button) => {
      if (button.textContent?.includes("Original")) {
        button.classList.add("active");
      } else if (
        button.textContent?.includes("PLANTA") ||
        button.textContent?.includes("ISOMÉTRICA")
      ) {
        button.classList.remove("active");
      }
    });
  };

  // Manejar el cambio de tamaño de la ventana
  const onWindowResize = () => {
    const width = window.innerWidth; // Mantener consistente con el init()
    const height = window.innerHeight;
    const aspect = width / height;

    if (boundingBox.current && center.current && size.current) {
      const maxDim = Math.max(size.current.x, size.current.y, size.current.z);

      camera.current!.left = -maxDim * aspect / 2;
      camera.current!.right = maxDim * aspect / 2;
      camera.current!.top = maxDim / 2;
      camera.current!.bottom = -maxDim / 2;
    } else {
      camera.current!.left = -200 * aspect;
      camera.current!.right = 200 * aspect;
      camera.current!.top = 200;
      camera.current!.bottom = -200;
    }

    camera.current!.updateProjectionMatrix();
    renderer.current?.setSize(width, height);

    // Forzar actualización de la vista 
    if (isTopView) {
      setTopView();
    }
  }

  // Función de animación
  const animate = () => {
    requestAnimationFrame(animate);
    controls.current?.update();

    // Verificar si el tooltip debe seguir visible (para modo de análisis)
    if (raycaster.current && mouse && currentMesh && colorMode.current !== 'uniform') {
      // Sólo actualizar la intersección si el mouse se ha movido
      if (tooltip.current.style.display !== 'none') {
        // Hacer que el tooltip siga visible incluso durante navegación
        if (highlightPoint.current) {
          // Obtener coordenadas de pantalla del punto resaltado
          const vector = new THREE.Vector3();
          vector.copy(highlightPoint.current.position);
          vector.project(camera.current!);

          const x = (vector.x + 1) / 2 * renderer.current.domElement.clientWidth;
          const y = -(vector.y - 1) / 2 * renderer.current.domElement.clientHeight;

          // Actualizar posición del tooltip si el punto está en pantalla
          if (x >= 0 && x <= renderer.current.domElement.clientWidth &&
            y >= 0 && y <= renderer.current.domElement.clientHeight) {
            tooltip.current.style.left = (x + renderer.current.domElement.offsetLeft + 15) + 'px';
            tooltip.current.style.top = (y + renderer.current.domElement.offsetTop + 15) + 'px';
          }
        }
      }
    }

    // Actualizar simulación de agua si está activa
    if (WaterParticles.simulationActive) {
      WaterParticles.updateWaterParticles(currentMesh);
    }

    // Renderizar la escena
    renderer.current?.render(scene.current!, camera.current!);
    // renderer.render(scene, camera);
  }

  // Función para cambiar el modo de color de la malla
  const setColorMode = (mode: string) => {
    console.log("Cambiando modo de color a:", mode);
    console.log(currentMesh);
    if (!currentMesh) return;

    // Ocultar tooltip al cambiar de modo
    if (tooltip.current) {
      hideTooltipWithDelay();
    }

    colorMode.current = mode;
    setLoadingMessage("Cambiando modo de color...");

    // Actualizar visualización de botones
    const colorButtons = document.querySelectorAll("#controls button");
    colorButtons.forEach((button) => {
      if (
        button.textContent.toLowerCase().includes(mode) ||
        (mode === "uniform" &&
          (button.textContent.includes("Altura") ||
            button.textContent.includes("Uniforme"))) ||
        (mode === "slope" && button.textContent.includes("Pendiente")) ||
        (mode === "convex" && button.textContent.includes("Convexidad"))
      ) {
        button.classList.add("active");
      } else {
        button.classList.remove("active");
      }
    });

    // Ejecutar en el próximo frame para permitir mostrar el mensaje de carga
    setTimeout(() => {
      try {
        // Obtener la geometría existente
        const geometry = currentMesh.current!.geometry;

        if (mode === "uniform") {
          // En lugar de color uniforme, aplicar degradado por altura
          applyHeightGradient(geometry);
          setLoadingMessage("Aplicando degradado por altura...");
          setTimeout(() => {
            setLoadingMessage(null);
          }, 1000);
          console.log("Degradado por altura aplicado");
        } else if (mode === "slope" && colorData.current.slope) {
          // Aplicar colores de pendiente
          applyVertexColorsFromText(geometry, colorData.current.slope, "slope");
          setLoadingMessage("Aplicando colores originales ARGB (pendiente)");
          console.log("Activando tooltips para valores de pendiente");
          setTimeout(() => {
            setLoadingMessage(null);
          }, 1500);
        } else if (mode === "convex" && colorData.current.convex) {
          // Aplicar colores de convexidad
          applyVertexColorsFromText(geometry, colorData.current.convex, "convex");
          setLoadingMessage("Aplicando colores originales ARGB (convexidad)");
          console.log("Activando tooltips para valores de convexidad");
          setTimeout(() => {
            setLoadingMessage(null);
          }, 1500);
        } else {
          console.warn(
            "Modo de color no válido o datos de color no disponibles:",
            mode
          );
          setLoadingMessage(`No hay datos de color de tipo '${mode}' disponibles`);
          setTimeout(() => {
            setLoadingMessage(null);
          }, 2000);
        }
      } catch (error) {
        console.error("Error al cambiar el modo de color:", error);
        setLoadingMessage("Error al cambiar el modo de color: " + error.message);
        setLoadingStyle({ backgroundColor: "rgba(255,0,0,0.7)" });
        setTimeout(() => {
          setLoadingMessage(null);
          setLoadingStyle({ backgroundColor: "rgba(0,0,0,0.7)" });
        }, 2000);
      }
    }, 50);
  };

  // Función para aplicar degradado de color basado en la altura
  const applyHeightGradient = (geometry) => {
    // Obtener las posiciones de los vértices
    const positions = geometry.attributes.position.array;
    const numVertices = positions.length / 3;
    const colors = new Float32Array(numVertices * 3);

    // Encontrar altura mínima y máxima para normalizar
    let minZ = Infinity;
    let maxZ = -Infinity;

    for (let i = 0; i < positions.length; i += 3) {
      const z = positions[i + 2]; // La coordenada Z
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    }

    console.log(`Rango de altura: ${minZ.toFixed(2)} a ${maxZ.toFixed(2)}`);

    // Definir colores para el degradado (de menor a mayor altura)
    const gradientColors = [
      { r: 0, g: 0.1, b: 0.5 },    // Azul oscuro (más bajo)
      { r: 0, g: 0.4, b: 0.8 },    // Azul medio
      { r: 0, g: 0.7, b: 0.3 },    // Verde azulado
      { r: 0.1, g: 0.8, b: 0.1 },  // Verde claro
      { r: 0.7, g: 0.7, b: 0.1 },  // Amarillo verdoso
      { r: 0.9, g: 0.5, b: 0.1 },  // Anaranjado
      { r: 0.8, g: 0.2, b: 0.1 },  // Rojo claro
      { r: 0.6, g: 0.1, b: 0.1 }   // Rojo oscuro (más alto)
    ];

    // Calcular color para cada vértice basado en su altura
    for (let i = 0; i < numVertices; i++) {
      const z = positions[i * 3 + 2]; // La coordenada Z

      // Normalizar la altura a un valor entre 0 y 1
      const normalizedHeight = (z - minZ) / (maxZ - minZ);

      // Calcular qué tramo del gradiente le corresponde
      const segmentCount = gradientColors.length - 1;
      const segment = Math.min(Math.floor(normalizedHeight * segmentCount), segmentCount - 1);
      const segmentPos = (normalizedHeight * segmentCount) - segment;

      // Interpolar entre los colores adyacentes
      const colorA = gradientColors[segment];
      const colorB = gradientColors[segment + 1];

      colors[i * 3] = colorA.r + (colorB.r - colorA.r) * segmentPos;         // R
      colors[i * 3 + 1] = colorA.g + (colorB.g - colorA.g) * segmentPos;     // G
      colors[i * 3 + 2] = colorA.b + (colorB.b - colorA.b) * segmentPos;     // B
    }

    // Actualizar la geometría con el atributo de color
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Actualizar el material para usar colores por vértice
    currentMesh.current!.material.vertexColors = true;
    currentMesh.current!.material.color.set(0xffffff); // Color blanco para no afectar los colores por vértice
    currentMesh.current!.material.needsUpdate = true;

    console.log("Degradado de altura aplicado con éxito");
  }

  // Función para extraer componentes RGB de un string de color
  const parseColorString = (colorString) => {
    if (typeof colorString !== 'string') {
      console.warn("Valor de color no es un string:", colorString);
      return { r: 255, g: 0, b: 255 }; // Púrpura para errores
    }

    try {
      // Ejemplo: "Color [A=255, R=255, G=226, B=17]"
      // Buscar los valores R, G, B usando expresiones regulares
      const rMatch = colorString.match(/R=(\d+)/);
      const gMatch = colorString.match(/G=(\d+)/);
      const bMatch = colorString.match(/B=(\d+)/);

      // Extraer los valores exactamente como están definidos
      const r = rMatch ? parseInt(rMatch[1]) : 0;
      const g = gMatch ? parseInt(gMatch[1]) : 0;
      const b = bMatch ? parseInt(bMatch[1]) : 0;

      // console.log("Color extraído:", { r, g, b });

      // Devolver el color exactamente como está definido en el string ARGB
      return { r, g, b };
    } catch (e) {
      console.warn("Error al parsear color:", colorString, e);
      return { r: 255, g: 0, b: 255 }; // Púrpura para errores
    }
  }

  // Función para aplicar colores por vértice a partir de datos en formato texto
  const applyVertexColorsFromText = (geometry, colorDataArray, colorType) => {
    const numVertices = geometry.attributes.position.count;
    const colors = new Float32Array(numVertices * 3);

    console.log(`Intentando aplicar colores de tipo ${colorType} a ${numVertices} vértices`);
    console.log(`Datos de color disponibles:`, colorDataArray ? colorDataArray.length : 0);

    // Verificar si tenemos datos de color válidos
    if (!colorDataArray || !colorDataArray.length) {
      console.error(`No hay datos de color de tipo ${colorType} disponibles`);
      return;
    }

    // Mostrar una muestra de los datos para depuración
    console.log(`Muestra de datos de color:`, colorDataArray[0]);

    // Establecer un color por defecto (más naturales para mapas topográficos)
    const defaultColor = colorType === 'slope' ?
      { r: 70, g: 130, b: 180 } :  // Azul metálico para pendiente
      { r: 210, g: 105, b: 30 };   // Marrón para convexidad

    // Para cada vértice, extraer el color correspondiente
    for (let i = 0; i < numVertices; i++) {
      let color = defaultColor;

      if (i < colorDataArray.length) {
        const colorEntry = colorDataArray[i];

        // Verificar si el color está directamente como string
        if (typeof colorEntry === 'string' && colorEntry.includes('Color')) {
          color = parseColorString(colorEntry);
        }
        // Verificar si el color está en una propiedad específica
        else if (colorEntry && typeof colorEntry === 'object') {
          const colorKey = 'color_' + colorType;
          if (colorEntry[colorKey] && typeof colorEntry[colorKey] === 'string') {
            color = parseColorString(colorEntry[colorKey]);
          }
        }
      }

      // Normalizar los valores RGB a 0-1
      colors[i * 3] = color.r / 255;      // R
      colors[i * 3 + 1] = color.g / 255;  // G
      colors[i * 3 + 2] = color.b / 255;  // B
    }

    // Aplicar los colores a la geometría
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Actualizar el material para usar colores por vértice
    currentMesh.current!.material.vertexColors = true;
    currentMesh.current!.material.needsUpdate = true;

    console.log(`Colores de tipo ${colorType} aplicados con éxito`);
  }

  // Función para extraer los valores de pendiente y convexidad de los vértices
  const extractVertexValues = (verticesData) => {
    if (!verticesData || !Array.isArray(verticesData) || verticesData.length === 0) {
      console.warn("No hay datos de vértices para extraer valores");
      return;
    }

    // Inicializar arrays para almacenar valores
    vertexValues.current.slope = [];
    vertexValues.current.convex = [];

    let countNotNull = { slope: 0, convex: 0 };

    // Procesar cada vértice
    for (const vertex of verticesData) {
      if (typeof vertex !== 'object') {
        vertexValues.current.slope.push(null);
        vertexValues.current.convex.push(null);
        continue;
      }

      // Extraer valores de pendiente
      if (vertex.valor_slope !== undefined) {
        // Si el valor es una cadena, convertirla a número
        const slopeValue = typeof vertex.valor_slope === 'string' ?
          parseFloat(vertex.valor_slope) : vertex.valor_slope;
        vertexValues.current.slope.push(slopeValue);
        if (slopeValue !== null) countNotNull.slope++;
      } else {
        vertexValues.current.slope.push(null);
      }

      // Extraer valores de convexidad
      if (vertex.valor_convex !== undefined) {
        // Si el valor es una cadena, convertirla a número
        const convexValue = typeof vertex.valor_convex === 'string' ?
          parseFloat(vertex.valor_convex) : vertex.valor_convex;
        vertexValues.current.convex.push(convexValue);
        if (convexValue !== null) countNotNull.convex++;
      } else {
        vertexValues.current.convex.push(null);
      }
    }

    console.log(`Valores extraídos: ${vertexValues.current.slope.length} pendientes (${countNotNull.slope} no nulos), ${vertexValues.current.convex.length} convexidades (${countNotNull.convex} no nulos)`);

    // Mostrar primeros valores para depuración
    if (vertexValues.current.slope.length > 0) {
      console.log("Ejemplos de valores de pendiente:",
        vertexValues.current.slope.slice(0, 3).map(v => v !== null ? v : "null"));
    }

    if (vertexValues.current.convex.length > 0) {
      console.log("Ejemplos de valores de convexidad:",
        vertexValues.current.convex.slice(0, 3).map(v => v !== null ? v : "null"));
    }
  }

  // Función para cargar las polilíneas desde lineas.json
  const loadPolylinesFromJSON = () => {
    setLoadingMessage("Iniciando carga de lineas.json...");
    console.log("Iniciando carga de lineas.json");

    // let jsonText = JSON.stringify(lineasContent);
    // const jsonData = JSON.parse(jsonText);
    console.log("Tipo de project.lineasJson:", typeof project.lineasJson);
    const jsonData =
      typeof lineasJson === "string"
        ? JSON.parse(lineasJson)
        : lineasJson;
    // const jsonData = project.lineasJson;
    // console.log(JSON.parse(project.lineasJson));
    // console.log("Tipo de project.lineasJson:", typeof project.lineasJson);
    // const jsonData = JSON.parse(JSON.stringify(project.lineasJson));
    setLoadingMessage("JSON de líneas procesado...");
    console.log("JSON de líneas procesado, estructura:", jsonData.Proyectos);

    // Verificar estructura básica
    if (!jsonData.Proyectos || !Array.isArray(jsonData.Proyectos)) {
      // throw new Error("El JSON no contiene un array de Proyectos válido");
    }

    // Procesar proyectos
    processPolylines(jsonData);
  }

  // Función para procesar las polilíneas desde el JSON
  const processPolylines = (jsonData) => {
    try {
      // Eliminar polilíneas anteriores si existen
      removePolylinesFromScene();

      // Procesar cada proyecto
      setLoadingMessage("Procesando polilíneas...");
      console.log("Inicio de procesamiento de polilíneas");

      // Diferentes colores para líneas y polígonos
      const colorPoligono = 0xff0000; // Rojo
      const colorLineas = 0x00FF00; // Verde único para todas las líneas

      // Extraer proyectos
      for (const proyecto of jsonData.Proyectos) {
        console.log("Procesando proyecto:", proyecto);

        // Cada proyecto tiene claves numéricas (1, 2, etc.)
        for (const proyectoId in proyecto) {
          if (proyecto.hasOwnProperty(proyectoId)) {
            const proyectoData = proyecto[proyectoId];
            console.log(`Procesando proyecto ${proyectoId}:`, proyectoData);

            // ---------- Procesar polígono (polilínea cerrada) ----------
            if (proyectoData.poligono && Array.isArray(proyectoData.poligono)) {
              console.log(`Proyecto ${proyectoId}: Polígono con ${proyectoData.poligono.length} puntos`);

              // Crear array de puntos para Three.js
              const verticesPoligono = [];

              for (const punto of proyectoData.poligono) {
                if (punto.coordenates) {
                  const { x, y, z } = punto.coordenates;
                  verticesPoligono.push(new THREE.Vector3(x, y, z));
                }
              }

              if (verticesPoligono.length > 0) {
                // Crear geometría del polígono
                const geometriaPoligono = new THREE.BufferGeometry().setFromPoints(verticesPoligono);

                // Crear material con color brillante
                const materialPoligono = new THREE.LineBasicMaterial({
                  color: colorPoligono,
                  linewidth: 5,  // Aumentado para mayor visibilidad
                  transparent: false,
                  depthTest: false  // Para asegurar que el polígono siempre sea visible
                });

                // Crear la línea cerrada (bucle)
                polylines.current.poligono = new THREE.LineLoop(geometriaPoligono, materialPoligono);

                // Propiedades adicionales para mejorar visibilidad
                polylines.current.poligono.renderOrder = 999;

                console.log("Polígono creado:", polylines.current.poligono);
              }
            }

            // ---------- Procesar líneas (polilíneas abiertas) ----------
            if (proyectoData.lineas && Array.isArray(proyectoData.lineas)) {
              console.log(`Proyecto ${proyectoId}: Procesando ${proyectoData.lineas.length} líneas`);

              for (let i = 0; i < proyectoData.lineas.length; i++) {
                const linea = proyectoData.lineas[i];

                if (linea.points && Array.isArray(linea.points)) {
                  // Crear array de puntos para cada línea
                  const verticesLinea = [];

                  for (const punto of linea.points) {
                    if (punto.coordenates) {
                      const { x, y, z } = punto.coordenates;
                      verticesLinea.push(new THREE.Vector3(x, y, z));
                    }
                  }

                  if (verticesLinea.length > 0) {
                    // Usar un solo color verde para todas las líneas
                    const colorLinea = colorLineas;

                    // Crear geometría de la línea
                    const geometriaLinea = new THREE.BufferGeometry().setFromPoints(verticesLinea);

                    // Crear material con color específico
                    const materialLinea = new THREE.LineBasicMaterial({
                      color: colorLinea,
                      linewidth: 4,  // Aumentado de 2 a 4 para mayor visibilidad
                      transparent: false,
                      depthTest: false  // Para asegurar que las líneas siempre sean visibles
                    });

                    // Crear la línea (abierta)
                    const lineaObj = new THREE.Line(geometriaLinea, materialLinea);

                    // Propiedades adicionales para mejorar visibilidad
                    lineaObj.renderOrder = 999;

                    // Guardar referencia a la línea
                    polylines.current.lineas.push(lineaObj);

                    // Log cada 50 líneas para no saturar la consola
                    if (i % 50 === 0 || i < 5) {
                      console.log(`Línea ${i} creada: ${verticesLinea.length} puntos`);
                    }
                  }
                }
              }
            }
          }
        }
      }

      // Mostrar mensaje con los resultados
      const infoPoligono = polylines.current.poligono ? "1 polígono" : "ninguno";
      const infoLineas = `${polylines.current.lineas.length} líneas`;

      console.log(`Polilíneas procesadas: ${infoPoligono}, ${infoLineas}`);
      setLoadingMessage(`Polilíneas procesadas: ${infoPoligono}, ${infoLineas}`);

      // Ocultar mensaje después de un tiempo
      setTimeout(() => {
        setLoadingMessage(null);
      }, 1500);

    } catch (error) {
      console.error("Error al procesar polilíneas:", error);
      setLoadingMessage("Error al procesar polilíneas: " + error.message);
      setLoadingStyle({ backgroundColor: "rgba(255,150,0,0.7)" });
      setTimeout(() => {
        setLoadingMessage(null);
      }, 3000);
    }
  }

  // Función para eliminar polilíneas de la escena
  const removePolylinesFromScene = () => {
    // Eliminar polígono
    if (polylines.current.poligono) {
      scene.current?.remove(polylines.current.poligono);
      polylines.current.poligono.geometry.dispose();
      polylines.current.poligono.material.dispose();
      polylines.current.poligono = null;
    }

    // Eliminar líneas
    let lineCount = 0;
    for (const line of polylines.current.lineas) {
      scene.current?.remove(line);
      if (line.geometry) line.geometry.dispose();
      if (line.material) line.material.dispose();
      lineCount++;
    }

    if (lineCount > 0) {
      console.log(`Eliminadas ${lineCount} líneas de la escena`);
    }

    polylines.current.lineas = [];

    // Actualizar los estados de visibilidad
    showPolylines.current.poligono = false;
    showPolylines.current.lineas = false;

    // Desactivar botones
    const buttons = document.querySelectorAll('#controls button');
    buttons.forEach(button => {
      if (button.textContent.includes('Polígonos') || button.textContent.includes('Líneas')) {
        button.classList.remove('active');
      }
    });
  }

  // Función para mostrar/ocultar polilíneas
  const togglePolylines = (type: string) => {
    console.log(`Toggle polilíneas de tipo: ${type}`);

    // Invertir el estado de visibilidad
    (showPolylines.current[type as keyof typeof showPolylines.current]) = !(showPolylines.current[type as keyof typeof showPolylines.current]);

    if (type === "poligono") {
      // Mostrar/ocultar polígono
      if (polylines.current.poligono) {
        if (showPolylines.current.poligono) {
          scene.current?.add(polylines.current.poligono);
          polylines.current.poligono.visible = true;
          console.log("Polígono añadido a la escena:", polylines.current.poligono);
        } else {
          scene.current?.remove(polylines.current.poligono);
          console.log("Polígono eliminado de la escena");
        }
      } else {
        console.warn("No hay polígono para mostrar");
      }
    } else if (type === "lineas") {
      // Mostrar/ocultar líneas
      const numLineas = polylines.current.lineas.length;
      console.log(
        `Toggle líneas: ${showPolylines.current.lineas}, total líneas: ${numLineas}`
      );

      // Para cada línea
      let lineasProcesadas = 0;

      for (const linea of polylines.current.lineas) {
        if (showPolylines.current.lineas) {
          scene.current?.add(linea);
          linea.visible = true;
          lineasProcesadas++;
        } else {
          scene.current?.remove(linea);
          lineasProcesadas++;
        }

        // Log para depuración (solo para las primeras líneas)
        if (lineasProcesadas <= 5 || lineasProcesadas % 100 === 0) {
          setLoadingMessage(`Procesando línea ${lineasProcesadas}/${numLineas}`);
          console.log(`Procesando línea ${lineasProcesadas}/${numLineas}`);
        }
      }

      console.log(
        `${showPolylines.current.lineas ? "Añadidas" : "Eliminadas"
        } ${lineasProcesadas} líneas a la escena`
      );
    }

    // Actualizar visualización de botones
    const buttons = document.querySelectorAll("#controls button");
    buttons.forEach((button) => {
      if (
        (type === "poligono" && button.textContent.includes("Polígonos")) ||
        (type === "lineas" && button.textContent.includes("Líneas"))
      ) {
        if (showPolylines.current[type]) {
          button.classList.add("active");
        } else {
          button.classList.remove("active");
        }
      }
    });

    // Mensaje de estado
    const estado = showPolylines.current[type] ? "mostrando" : "ocultando";
    const tipoTexto = type === "poligono" ? "polígonos" : "líneas";
    console.log(`Estado de polilíneas: ${estado} ${tipoTexto}`);
    setLoadingStyle({ backgroundColor: "rgba(0,0,0,0.7)" });

    setTimeout(() => {
      setLoadingMessage(null);
    }, 1000);

    // Forzar actualización de la escena
    renderer.current?.render(scene.current!, camera.current!);
  };

  // Función para manejar el zoom con la rueda del ratón
  const handleMouseWheel = (event) => {
    // Evitar el comportamiento por defecto (scroll de la página)
    event.preventDefault();

    // Capturar la posición del mouse
    const rect = renderer.current?.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Calcular el nuevo factor de zoom basado en la dirección de la rueda
    const deltaY = event.deltaY;
    const zoomOut = deltaY > 0;

    // Si estamos en modo de color de pendiente o convexidad, verificar intersección
    if (colorMode.current !== 'uniform' && currentMesh) {
      // Comprobar si el cursor está sobre un vértice
      checkIntersection(event);
    }

    // Mostrar el indicador de zoom
    showZoomIndicator(event.clientX, event.clientY, zoomOut);

    // Forzar actualización de los controles
    controls.current?.update();
  }

  // Función para mostrar el indicador de zoom
  const showZoomIndicator = (x: string, y: string, zoomOut: boolean) => {
    // Limpiar cualquier timeout anterior
    if (zoomIndicatorTimeout) {
      clearTimeout(zoomIndicatorTimeout);
    }

    // Establecer la posición del indicador
    zoomIndicator!.style.left = x + 'px';
    zoomIndicator!.style.top = y + 'px';

    // Cambiar el color según la dirección del zoom
    if (zoomOut) {
      zoomIndicator!.style.borderColor = '#ff5252'; // Rojo para zoom out
      zoomIndicator!.style.boxShadow = '0 0 10px rgba(255, 82, 82, 0.8)';
    } else {
      zoomIndicator!.style.borderColor = '#4caf50'; // Verde para zoom in
      zoomIndicator!.style.boxShadow = '0 0 10px rgba(76, 175, 80, 0.8)';
    }

    // Mostrar el indicador
    zoomIndicator!.style.display = 'block';

    // Ocultar el indicador después de un breve período
    zoomIndicatorTimeout = setTimeout(() => {
      zoomIndicator!.style.display = 'none';
    }, 500);
  }

  // Función para calcular un gradiente de altura basado en la geometría
  const createHeightField = () => {
    // Esta función ha sido movida a water-particles.js
    console.warn("Esta función ha sido reemplazada por WaterParticles.createHeightField()");
    return WaterParticles.createHeightField(currentMesh.current);
  }

  // Calcular coordenadas baricéntricas para un punto en un triángulo
  const calculateBarycentricCoordinates = (p, a, b, c) => {
    // Esta función ha sido movida a water-particles.js (función interna)
    console.warn("Esta función ha sido reemplazada y movida a water-particles.js");
    return { u: 0.33, v: 0.33, w: 0.33 }; // Valores por defecto para compatibilidad
  }

  // Crear sistema de partículas para simular agua
  const createWaterParticles = () => {
    // Esta función ha sido movida a water-particles.js
    console.warn("Esta función ha sido reemplazada por WaterParticles.createWaterParticles()");
    return WaterParticles.createWaterParticles(currentMesh.current);
  }

  const createTrailSystem = () => {
    // Esta función ha sido movida a water-particles.js
    console.warn("Esta función ha sido movida a water-particles.js (función interna)");
  }

  // Actualizar el sistema de estelas
  const updateTrails = () => {
    // Esta función ha sido movida a water-particles.js
    console.warn("Esta función ha sido movida a water-particles.js (función interna)");
  }

  // Actualizar las partículas en cada frame
  const updateWaterParticles = () => {
    // Esta función ha sido movida a water-particles.js
    console.warn("Esta función ha sido reemplazada por WaterParticles.updateWaterParticles()");
    WaterParticles.updateWaterParticles(currentMesh.current);
  }

  // Reiniciar una partícula en una nueva posición
  const resetParticles = (index) => {
    // Esta función ha sido movida a water-particles.js
    console.warn("Esta función ha sido movida a water-particles.js (función interna)");
  }

  // Activar/desactivar la simulación de agua
  const toggleWaterSimulation = () => {
    WaterParticles.toggleWaterSimulation(currentMesh.current);
  };

  // Actualizar el número de partículas
  const updateParticleCount = (count) => {
    WaterParticles.updateParticleCount(count, currentMesh.current);
  }

  // Actualizar la velocidad del flujo
  const updateFlowSpeed = (value) => {
    // Esta función ha sido reemplazada por WaterParticles.updateFlowSpeed()
    console.warn(
      "Esta función ha sido reemplazada por WaterParticles.updateFlowSpeed()"
    );
    WaterParticles.updateFlowSpeed(value);
  };

  const toggleLineFlow = () => {
    // Importar estado de simulación activa directamente del módulo WaterParticles
    if (!WaterParticles.simulationActive) {
      alert("Primero debe iniciar la simulación de agua para poder usar el flujo por líneas.");
      return;
    }

    // Verificar si hay líneas visibles
    if (!showPolylines.current.lineas && !showPolylines.current.poligono) {
      // Mostrar cuadro de diálogo personalizado
      setPendingAction(() => () => togglePolylines("lineas"));
      setShowConfirmDialog(true);
      return;
    }

    const isActive = WaterParticles.toggleLineFlow(polylines.current);

    // Actualizar el estado del botón
    // const btn = document.getElementById('btnFlujoLineas');
    // if (isActive) {
    //   btn.textContent = "Desactivar Flujo por Líneas";
    //   btn.classList.add('active');
    // } else {
    //   btn.textContent = "Flujo por Líneas";
    //   btn.classList.remove('active');
    // }

    // Mostrar mensaje de información
    setLoadingMessage(isActive ? "Flujo de agua siguiendo líneas activado" : "Flujo de agua siguiendo normales del terreno");
    setTimeout(() => {
      setLoadingMessage(null);
    }, 2000);
  }

  // const toggleNormalsMode = () => {
  //   // Esta función ha sido reemplazada por WaterParticles.toggleNormalsMode()
  //   console.warn(
  //     "Esta función ha sido reemplazada por WaterParticles.toggleNormalsMode()"
  //   );
  //   WaterParticles.toggleNormalsMode();
  // };

  const toggleContourLines = () => {
    setShowContourLines(!showContourLines); // Cambia el estado de las líneas de contorno

    if (showContourLines) {
      if (!contourLines) {
        createContourLines();
      } else {
        if (contourLines) {
          contourLines.current.visible = false;
        }
      }
    } else {
      createContourLines(); // Crear líneas de contorno si están activadas
    }

    // Mostrar mensaje de información
    setLoadingMessage(showContourLines ?
      "Ocultando líneas de nivel" :
      "Mostrando líneas de nivel");
    setTimeout(() => {
      setLoadingMessage(null);
    }, 1500);
  }

  const updateContourInterval = (value) => {
    // Convertir a número y validar
    const newInterval = parseFloat(value);
    if (isNaN(newInterval) || newInterval <= 0) {
      console.error("Intervalo de contorno inválido:", value);
      return;
    }

    // Actualizar el valor global
    setContourInterval(newInterval);

    // Eliminar líneas de contorno existentes
    if (contourLines.current) {
      scene.current.remove(contourLines.current);
      contourLines.current = null;
    }

    // Recrear líneas de contorno si están visibles
    if (showContourLines) {
      createContourLines();

      // Mostrar mensaje informativo
      setLoadingMessage(`Actualizando líneas de nivel (intervalo: ${newInterval.toFixed(1)}m)`);
      setTimeout(() => {
        setLoadingMessage(null);
      }, 1500);
    }
  }

  // Función para manejar el clic en el terreno
  const onTerrainClick = (event) => {
    // Calcular posición del mouse en coordenadas normalizadas (-1 a +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Actualizar el raycaster con la posición del mouse
    raycaster.current.setFromCamera(mouse, camera.current);

    // Verificar intersección con la malla del terreno
    if (currentMesh) {
      const intersects = raycaster.current.intersectObject(currentMesh.current);

      if (intersects.length > 0) {
        // Obtener el punto de intersección
        const hitPoint = intersects[0].point.clone();

        // Actualizar el punto de destino de los controles de órbita
        controls.current.target.copy(hitPoint);

        // Actualizar controles y cámara
        controls.current.update();

        // Mostrar indicador visual en el punto de clic
        showClickIndicator(hitPoint);

        // Mensaje informativo en la consola
        console.log("Pivote de cámara establecido en:", hitPoint);
      }
    }
  }

  // Función para mostrar un indicador visual en el punto de clic
  const showClickIndicator = (position) => {
    // Eliminar indicador anterior si existe
    const existingIndicator = scene.current.getObjectByName("clickIndicator");
    if (existingIndicator) {
      scene.current.remove(existingIndicator);
    }

    // Crear un pequeño marcador en el punto de clic
    const geometry = new THREE.SphereGeometry(0.5, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.7
    });
    const indicator = new THREE.Mesh(geometry, material);
    indicator.name = "clickIndicator";
    indicator.position.copy(position);
    scene.current.add(indicator);

    // Hacer que el indicador desaparezca después de un tiempo
    setTimeout(() => {
      if (indicator.parent) {
        scene.current.remove(indicator);
      }
    }, 2000);
  }

  const toggleObjectsVisibility = () => {
    setObjectsVisible(ObjectsLoader.toggleObjectsVisibility(scene.current!));
    // const btnEmbalses = document.getElementById('btnEmbalses');

    // // Actualizar estilo del botón
    // if (visible) {
    //   btnEmbalses.classList.add('active');
    // } else {
    //   btnEmbalses.classList.remove('active');
    // }
  }

  const handleConfirm = () => {
    if (pendingAction) {
      pendingAction(); // Ejecutar la acción pendiente
    }
    setShowConfirmDialog(false); // Cerrar el cuadro de diálogo
  };

  const handleCancel = () => {
    setShowConfirmDialog(false); // Cerrar el cuadro de diálogo
  };

  const toggleSuelosPanel = () => {
    setIsSuelosVisible((prev) => !prev); // Alterna la visibilidad
  };

  const reiniciar = () => {
    loadMeshFromJSON();
    loadPolylinesFromJSON();
    ObjectsLoader.loadObjectsFromJSON(scene.current, raycaster.current, objectsJson);
    initializeRaycaster();
  }

  function parseJsonData(json: string | object) {
    return typeof json === "string" ? JSON.parse(json) : json;
  }

  useEffect(() => {
    setLineasJson(parseJsonData(project.lineasJson));
    setGenJson(parseJsonData(project.genJson));
  }, [project.lineasJson, project.genJson]);

  useEffect(() => {
    WaterParticles.setLoaderFunctions(setLoadingMessage, setLoadingStyle);
  }, []);

  useEffect(() => {
    if (project.lineasJson) {
      setLineasJson(
        typeof project.lineasJson === "string"
          ? JSON.parse(project.lineasJson)
          : project.lineasJson
      );
    }

    if (project.genJson) {
      setGenJson(
        typeof project.genJson === "string"
          ? JSON.parse(project.genJson)
          : project.genJson
      );
    }

    if (project.objectsJson) {
      setObjectsJson(
        typeof project.objectsJson === "string"
          ? JSON.parse(project.objectsJson)
          : project.objectsJson
      );
    }

    if (project.arJson) {
      setArJson(
        typeof project.arJson === "string"
          ? JSON.parse(project.arJson)
          : project.arJson
      );
    }
  }, [project.lineasJson, project.genJson, project.objectsJson, project.arJson]);

  useEffect(() => {
    init();

    // Exponer funciones al ámbito global para que los botones puedan acceder a ellas
    // Con un pequeño delay para asegurar que todo esté cargado
    setTimeout(() => {
      (window as any).setTopView = setTopView;
      (window as any).setIsometricView = setIsometricView;
      (window as any).resetView = resetView;
      (window as any).setColorMode = setColorMode;
      (window as any).togglePolylines = togglePolylines;
      (window as any).toggleWaterSimulation = toggleWaterSimulation;
      (window as any).updateParticleCount = updateParticleCount;
      (window as any).updateFlowSpeed = updateFlowSpeed;
      (window as any).toggleLineFlow = toggleLineFlow;
      (window as any).toggleContourLines = toggleContourLines;
      (window as any).updateContourInterval = updateContourInterval;
      (window as any).toggleObjectsVisibility = toggleObjectsVisibility;

      console.log("Funciones de vista expuestas al ámbito global");
    }, 100);
  }, []);

  return (
    <div id="container-water">
      {arJson && (
        <pre style={{ maxHeight: "150px", overflowY: "auto", color: "white", width: "80%", minWidth: "200px", position: "absolute", top: "60px", right: "10px", backgroundColor: "rgba(0, 0, 0, 0.5)", padding: "10px", borderRadius: "5px" }}>
          {JSON.stringify(arJson, null, 2)}
        </pre>
      )}
      <div id="controls">
        {arJson && (
          <div>
            <ExportarKmz json={arJson} label="Descargar KMZ" />
          </div>
        )}
        <button className="water-particle" onClick={reiniciar}>
          Reiniciar
        </button>
        <button
          className="water-particle save-project-button"
          onClick={() => setProjectFormOpen(true)}
        >
          Guardar terreno
        </button>
        <h3 className="water-particle">Controles</h3>
        <h4 className="water-particle">Vistas</h4>
        <button className="water-particle" onClick={setTopView}>PLANTA</button>
        <button className="water-particle" onClick={setIsometricView}>ISOMÉTRICA</button>
        {/* <button className="water-particle" onClick={resetView}>Vista Original</button> */}

        <h4 className="water-particle">Análisis Geográfico</h4>
        <button className="water-particle" onClick={() => setColorMode("uniform")}>
          Elevación
        </button>
        <button className="water-particle" onClick={() => setColorMode("slope")}>
          Pendiente
        </button>
        <button className="water-particle" onClick={() => setColorMode("convex")}>
          Convexidad
        </button>

        <div className="control-row">
          <button
            id="btnContorno"
            className={`water-particle ${showContourLines ? "active" : ""}`}
            onClick={toggleContourLines}
          >
            Cotas
          </button>
          <input type="number" id="contourIntervalInput" min="0.1" max="10" step="0.1" defaultValue={1.5}
            onChange={(event) => updateContourInterval(event.target.value)} />
          <span>m</span>
        </div>

        <h4 className="water-particle">Diseño Hidrológico</h4>
        <button className={`water-particle ${showPolylines ? "active" : ""}`} onClick={() => togglePolylines("poligono")}>
          Workspace
        </button>
        <button className="water-particle" onClick={() => togglePolylines("lineas")}>
          Canales Desviación
        </button>
        <button
          className={`water-particle ${lineasGenResult.showLineasAmarillas && lineasGenResult.showLineasAzules ? "active" : ""}`}
          onClick={lineasGenResult.toggleVallesPartesAguas}
        >
          Valles Parte aguas
        </button>
        <button id="btnEmbalses" className={`water-particle ${objectsVisible ? "active" : ""}`} onClick={toggleObjectsVisibility}>Diseño Embalses</button>

        <h4 className="water-particle">Simulación</h4>
        <button className="water-particle" id="btnSimulacion" onClick={toggleWaterSimulation}>
          Iniciar Simulación
        </button>
        <button className="water-particle" id="btnFlujoLineas" onClick={toggleLineFlow}>Flujo por Líneas</button>
        {showConfirmDialog && (
          <div className="confirm-dialog">
            <p>Las líneas no están visibles. ¿Desea mostrarlas ahora?</p>
            <button onClick={handleConfirm}>Sí</button>
            <button onClick={handleCancel}>No</button>
          </div>
        )}
        <div className="control-row">
          <span className="water-particle">Partículas:</span>
          <select
            id="particleCount"
            onChange={(event) => updateParticleCount(event.target.value)}
            style={{ width: "60px" }}
            defaultValue="5000"
          >
            <option value="1000">1000</option>
            <option value="2000">2000</option>
            <option value="5000">5000</option>
            <option value="10000">10000</option>
          </select>
        </div>
        <div className="control-row">
          <span className="water-particle">Velocidad:</span>
          <input
            type="range"
            id="flowSpeed"
            min="0.2"
            max="2"
            step="0.1"
            defaultValue="1"
            onChange={(event) => updateFlowSpeed(event.target.value)}
            style={{ width: "70px" }}
          />
        </div>

        {/* <button id="btnNormales" onClick={toggleNormalsMode} className="active water-particle">
          Usar Normales Vértice
        </button> */}

        {/* Contenedor para el gráfico de ECharts */}
        {/* <EchartsViewer setLoadingMessage={setLoadingMessage} setLoadingStyle={setLoadingStyle} /> */}
      </div>
      {isProjectFormOpen && (
        <div className="project-save-backdrop" role="presentation">
          <div
            id="visor-proyecto"
            className="card project-save-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-save-title"
          >
            <div className="project-save-header">
              <h4 id="project-save-title">Datos del Proyecto</h4>
              <button
                type="button"
                className="project-save-close"
                aria-label="Cerrar"
                onClick={() => setProjectFormOpen(false)}
              >
                X
              </button>
            </div>
            <ProjectForm
              submitLabel="Guardar terreno"
              onCancel={() => setProjectFormOpen(false)}
              onSaved={() => setProjectFormOpen(false)}
            />
          </div>
        </div>
      )}

      <div id="info">Gravitacional - Workspace</div>
      <div id="subtitle">
        Fundo los Cuarzos - Ninhue</div>
      {/* <div id="loading">Cargando malla desde gen.json...</div> */}
      {loadingMessage && (
        <div id="loading" className="loading" style={loadingStyle}>
          {loadingMessage}
        </div>
      )}
      <div id="tooltip"></div>
      <div id="zoomIndicator"></div>



      {/* Panel deslizante */}
      <div className={`suelos-container ${isSuelosVisible ? "visible" : ""}`}>
        <button id="boton-select-suelos" className="water-particle" onClick={toggleSuelosPanel}>
          {isSuelosVisible ? ">>" : "<<"}
        </button>
        <div className="suelos-panel">
          <h3 className="panel-title">Parámetros de Diseño</h3>
          {/* Contenedor para el gráfico de ECharts */}
          <EchartsViewer setLoadingMessage={setLoadingMessage} setLoadingStyle={setLoadingStyle} />
          <SelectParametrosSuelo />
        </div>
      </div>


      <div ref={mountRef} className="canvas-mapa" />

      {/* Barra inferior desplegable para análisis meteorológico */}
      <BarraInferior setLoadingMessage={setLoadingMessage} setLoadingStyle={setLoadingStyle} />

    </div>
  );
};

export default WaterParticle;
