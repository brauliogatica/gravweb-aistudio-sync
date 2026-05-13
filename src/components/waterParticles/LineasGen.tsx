import React, { useRef, useState } from "react";
import { useSelector } from "react-redux";
import * as THREE from "three";
import { RootState } from "../../redux/store/store";

interface LineasGenProps {
  scene: React.RefObject<THREE.Scene>;
  setLoadingMessage: (message: string | null) => void;
  setLoadingStyle: (style: React.CSSProperties) => void;
}

interface Coordenates {
  x: number;
  y: number;
  z: number;
}

interface Point {
  id: number;
  coordenates: Coordenates;
}

interface LineData {
  id: number;
  points: Point[];
}

interface ProyectoData {
  poligono: Point[];
  lineas: LineData[];
}

interface JSONData {
  Proyectos: Array<{ [key: string]: ProyectoData }>;
}

interface LineasGenResult {
  showLineasAmarillas: boolean;
  showLineasAzules: boolean;
  toggleVallesPartesAguas: () => void;
}

const LineasGen = ({ scene, setLoadingMessage, setLoadingStyle }: LineasGenProps): LineasGenResult => {
  const project = useSelector((state: RootState) => state.project);
  // Estados para las líneas
  const lineasAmarillas = useRef<THREE.Line[]>([]);
  const lineasAzules = useRef<THREE.Line[]>([]);
  const [lineasAmarillasJson, setLineasAmarillasJson] = useState(project.lineasAmarillasJson);
  const [lineasAzulesJson, setLineasAzulesJson] = useState(project.lineasAzulesJson);
  const [showLineasAmarillas, setShowLineasAmarillas] = useState(false);
  const [showLineasAzules, setShowLineasAzules] = useState(false);
  const [isLoading, setIsLoading] = useState(false);



  // Función para cargar líneas amarillas desde archivo JSON local
  const loadLineasAmarillasFromJSON = async () => {
    if (!scene.current) return;

    console.log("Cargando líneas amarillas...");
    setLoadingMessage("Cargando líneas amarillas...");
    setLoadingStyle({ display: 'block' });
    setIsLoading(true);

    try {
      // Importar el archivo JSON estático desde la versión v2 desarrollo
      // const response = await import("./referencias/v2 desarrollo/lineasamarillas.json");
      // const jsonData: JSONData = response.default;
      const jsonData =
        typeof lineasAmarillasJson === "string"
          ? JSON.parse(lineasAmarillasJson)
          : lineasAmarillasJson;

      console.log("JSON de líneas amarillas cargado:", Object.keys(jsonData));

      // Verificar estructura básica
      if (!jsonData.Proyectos || !Array.isArray(jsonData.Proyectos)) {
        throw new Error("El JSON no contiene un array de Proyectos válido");
      }

      // Procesar líneas amarillas
      processLineasAmarillas(jsonData);
      console.log("Líneas amarillas cargadas correctamente");

      setLoadingMessage(`Cargadas ${lineasAmarillas.current.length} líneas amarillas`);
      setTimeout(() => {
        setLoadingStyle({ display: 'none' });
        setLoadingMessage(null);
      }, 2000);
    } catch (error) {
      console.error("Error al cargar líneas amarillas:", error);
      setLoadingMessage("Error al cargar líneas amarillas: " + (error as Error).message);
      setLoadingStyle({
        display: 'block',
        backgroundColor: "rgba(255,0,0,0.7)"
      });
      setTimeout(() => {
        setLoadingStyle({ display: 'none' });
        setLoadingMessage(null);
      }, 3000);
    } finally {
      setIsLoading(false);
    }
  };

  // Función para cargar líneas azules desde archivo JSON local
  const loadLineasAzulesFromJSON = async () => {
    if (!scene.current) return;

    console.log("Cargando líneas azules...");
    setLoadingMessage("Cargando líneas azules...");
    setLoadingStyle({ display: 'block' });
    setIsLoading(true);

    try {
      // Importar el archivo JSON estático desde la versión v2 desarrollo
      // const response = await import("./referencias/v2 desarrollo/lineasazules.json");
      // const response = project.lineasAzulesJson;
      // const jsonData: JSONData = response.default;

      const jsonData =
        typeof lineasAzulesJson === "string"
          ? JSON.parse(lineasAzulesJson)
          : lineasAzulesJson;

      console.log("JSON de líneas azules cargado:", Object.keys(jsonData));

      // Verificar estructura básica
      if (!jsonData.Proyectos || !Array.isArray(jsonData.Proyectos)) {
        throw new Error("El JSON no contiene un array de Proyectos válido");
      }

      // Procesar líneas azules
      processLineasAzules(jsonData);
      console.log("Líneas azules cargadas correctamente");

      setLoadingMessage(`Cargadas ${lineasAzules.current.length} líneas azules`);

      // Activar visualización automática después de cargar ambas líneas
      // setTimeout(() => {
      //   if (!showLineasAmarillas && !showLineasAzules &&
      //     lineasAmarillas.current.length > 0 && lineasAzules.current.length > 0) {
      //     console.log("Activando visualización automática de líneas");
      //     toggleVallesPartesAguas();
      //   }
      //   setLoadingStyle({ display: 'none' });
      //   setLoadingMessage(null);
      // }, 2000);
    } catch (error) {
      console.error("Error al cargar líneas azules:", error);
      setLoadingMessage("Error al cargar líneas azules: " + (error as Error).message);
      setLoadingStyle({
        display: 'block',
        backgroundColor: "rgba(255,0,0,0.7)"
      });
      setTimeout(() => {
        setLoadingStyle({ display: 'none' });
        setLoadingMessage(null);
      }, 3000);
    } finally {
      setIsLoading(false);
    }
  };

  // Función para procesar las líneas amarillas
  const processLineasAmarillas = (jsonData: JSONData) => {
    if (!scene.current) return;

    try {
      // Eliminar líneas anteriores si existen
      lineasAmarillas.current.forEach(line => scene.current?.remove(line));
      lineasAmarillas.current = [];

      console.log("Procesando líneas amarillas");

      // Color amarillo para estas líneas
      const colorLineasAmarillas = 0xFFFF00; // Amarillo

      // Extraer proyectos
      for (const proyecto of jsonData.Proyectos) {
        console.log("Procesando proyecto para líneas amarillas:", proyecto);

        // Cada proyecto tiene claves numéricas (1, 2, etc.)
        for (const proyectoId in proyecto) {
          if (proyecto.hasOwnProperty(proyectoId)) {
            const proyectoData = proyecto[proyectoId];

            // Procesar líneas (polilíneas abiertas)
            if (proyectoData.lineas && Array.isArray(proyectoData.lineas)) {
              for (let i = 0; i < proyectoData.lineas.length; i++) {
                const linea = proyectoData.lineas[i];

                if (linea.points && Array.isArray(linea.points)) {
                  // Crear array de puntos para cada línea
                  const verticesLinea: THREE.Vector3[] = [];

                  for (const punto of linea.points) {
                    if (punto.coordenates) {
                      // Usar las coordenadas tal como están
                      const { x, y, z } = punto.coordenates;
                      verticesLinea.push(new THREE.Vector3(x, y, z));
                    }
                  }

                  if (verticesLinea.length > 0) {
                    // Crear geometría de la línea
                    const geometriaLinea = new THREE.BufferGeometry().setFromPoints(verticesLinea);

                    // Crear material con color específico
                    const materialLinea = new THREE.LineBasicMaterial({
                      color: colorLineasAmarillas,
                      linewidth: 4,
                      transparent: true,
                      opacity: 0.9,
                      depthTest: false,
                      depthWrite: false
                    });

                    // Crear la línea (abierta)
                    const lineaObj = new THREE.Line(geometriaLinea, materialLinea);

                    // Propiedades adicionales para mejorar visibilidad
                    lineaObj.renderOrder = 999;

                    // Añadir la línea a la escena
                    scene.current.add(lineaObj);

                    // Inicialmente ocultar las líneas
                    lineaObj.visible = false;

                    // Guardar referencia
                    lineasAmarillas.current.push(lineaObj);

                    // Log cada 50 líneas para no saturar la consola
                    if (i % 50 === 0 || i < 5) {
                      console.log(`Línea amarilla ${i} creada: ${verticesLinea.length} puntos`);
                    }
                  }
                }
              }
            }
          }
        }
      }

      console.log(`Creadas ${lineasAmarillas.current.length} líneas amarillas`);
    } catch (error) {
      console.error("Error al procesar líneas amarillas:", error);
    }
  };

  // Función para procesar las líneas azules
  const processLineasAzules = (jsonData: JSONData) => {
    if (!scene.current) return;

    try {
      // Eliminar líneas anteriores si existen
      lineasAzules.current.forEach(line => scene.current?.remove(line));
      lineasAzules.current = [];

      console.log("Procesando líneas azules");

      // Color azul para estas líneas
      const colorLineasAzules = 0x0000FF; // Azul

      // Offset para alineación (basado en la versión v2)
      const offsetX = 0;
      const offsetY = 35;
      const offsetZ = 0;

      // Extraer proyectos
      for (const proyecto of jsonData.Proyectos) {
        console.log("Procesando proyecto para líneas azules:", proyecto);

        // Cada proyecto tiene claves numéricas (1, 2, etc.)
        for (const proyectoId in proyecto) {
          if (proyecto.hasOwnProperty(proyectoId)) {
            const proyectoData = proyecto[proyectoId];

            // Procesar líneas (polilíneas abiertas)
            if (proyectoData.lineas && Array.isArray(proyectoData.lineas)) {
              for (let i = 0; i < proyectoData.lineas.length; i++) {
                const linea = proyectoData.lineas[i];

                if (linea.points && Array.isArray(linea.points)) {
                  // Crear array de puntos para cada línea
                  const verticesLinea: THREE.Vector3[] = [];

                  for (const punto of linea.points) {
                    if (punto.coordenates) {
                      // Aplicar offset específico para líneas azules
                      const { x, y, z } = punto.coordenates;
                      verticesLinea.push(new THREE.Vector3(
                        x + offsetX,
                        y + offsetY,
                        z + offsetZ
                      ));
                    }
                  }

                  if (verticesLinea.length > 0) {
                    // Crear geometría de la línea
                    const geometriaLinea = new THREE.BufferGeometry().setFromPoints(verticesLinea);

                    // Crear material con color específico
                    const materialLinea = new THREE.LineBasicMaterial({
                      color: colorLineasAzules,
                      linewidth: 4,
                      transparent: true,
                      opacity: 0.9,
                      depthTest: false,
                      depthWrite: false
                    });

                    // Crear la línea (abierta)
                    const lineaObj = new THREE.Line(geometriaLinea, materialLinea);

                    // Propiedades adicionales para mejorar visibilidad
                    lineaObj.renderOrder = 999;

                    // Añadir la línea a la escena
                    scene.current.add(lineaObj);

                    // Inicialmente ocultar las líneas
                    lineaObj.visible = false;

                    // Guardar referencia
                    lineasAzules.current.push(lineaObj);

                    // Log cada 50 líneas para no saturar la consola
                    if (i % 50 === 0 || i < 5) {
                      console.log(`Línea azul ${i} creada: ${verticesLinea.length} puntos`);
                    }
                  }
                }
              }
            }
          }
        }
      }

      console.log(`Creadas ${lineasAzules.current.length} líneas azules`);
    } catch (error) {
      console.error("Error al procesar líneas azules:", error);
    }
  };

  // Función para mostrar/ocultar líneas amarillas y azules (Valles Parte aguas)
  const toggleVallesPartesAguas = () => {
    const newShowAmarillas = !showLineasAmarillas;
    const newShowAzules = !showLineasAzules;

    setShowLineasAmarillas(newShowAmarillas);
    setShowLineasAzules(newShowAzules);

    console.log(`Mostrando/ocultando ${lineasAmarillas.current.length} líneas amarillas y ${lineasAzules.current.length} líneas azules`);

    // Actualizar visibilidad de líneas amarillas
    for (const linea of lineasAmarillas.current) {
      linea.visible = newShowAmarillas;
    }

    // Actualizar visibilidad de líneas azules
    for (const linea of lineasAzules.current) {
      linea.visible = newShowAzules;
    }

    // Mostrar mensaje de información
    setLoadingMessage(
      newShowAmarillas ? "Mostrando Valles Parte aguas" : "Ocultando Valles Parte aguas"
    );
    setLoadingStyle({ display: 'block', backgroundColor: "rgba(0,0,0,0.7)" });
    setTimeout(() => {
      setLoadingStyle({ display: 'none' });
      setLoadingMessage(null);
    }, 1500);
  };

  // Cargar líneas al montar el componente
  React.useEffect(() => {
    if (scene.current) {
      console.log("Cargando líneas amarillas y azules...");
      loadLineasAmarillasFromJSON();
      loadLineasAzulesFromJSON();
    }
  }, [scene.current]);

  return {
    toggleVallesPartesAguas,
    showLineasAmarillas,
    showLineasAzules,
  };
};

export default LineasGen; 
