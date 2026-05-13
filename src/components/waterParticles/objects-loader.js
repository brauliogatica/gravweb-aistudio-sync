// objects-loader.js
// Módulo para cargar objetos desde objects.json

import * as THREE from "three";

// Variables globales
let scene;
let objectsMeshes = [];
let objectsData = [];
let objectsVisible = false; // Cambiado a false para que esté apagado al principio

// Función para mostrar u ocultar todos los objetos
export function toggleObjectsVisibility(sceneRef) {
  console.log("[ObjectsLoader] Toggle visibility called. Current state:", objectsVisible);
  console.log("[ObjectsLoader] Number of objects in array:", objectsMeshes.length);
  
  objectsVisible = !objectsVisible;

  // Cambiar la visibilidad de todos los objetos en la escena
  for (let i = 0; i < objectsMeshes.length; i++) {
    if (objectsMeshes[i] && sceneRef.getObjectById(objectsMeshes[i].id)) {
      objectsMeshes[i].visible = objectsVisible;
      console.log(`[ObjectsLoader] Object ${i} visibility set to:`, objectsVisible);
    }
  }

  console.log(
    `[ObjectsLoader] Objetos ${objectsVisible ? "mostrados" : "ocultados"}`
  );
  return objectsVisible;
}

// Función para cargar los objetos desde el archivo JSON
export function loadObjectsFromJSON(sceneRef, raycaster, objects) {
  scene = sceneRef; // Asignar la escena globalmente
  console.log(
    "[ObjectsLoader] Iniciando carga de objetos desde objects.json..."
  );
  
  try {
    console.log("[ObjectsLoader] Objects data received, type:", typeof objects);
    console.log("[ObjectsLoader] Objects data keys:", Object.keys(objects || {}));

    // Verificar que tenemos datos válidos
    if (!objects) {
      console.error("[ObjectsLoader] No se recibieron datos de objetos");
      return;
    }

    let data;
    if (typeof objects === "string") {
      try {
        data = JSON.parse(objects);
      } catch (parseError) {
        console.error("[ObjectsLoader] Error al parsear JSON string:", parseError);
        return;
      }
    } else {
      data = objects;
    }

    console.log(
      "[ObjectsLoader] Datos JSON procesados correctamente:",
      data.objects
        ? data.objects.length + " objetos encontrados"
        : "No hay objetos en la estructura"
    );

    // Verificar estructura de datos
    if (!data.objects || !Array.isArray(data.objects)) {
      console.error("[ObjectsLoader] La estructura de datos no contiene un array de 'objects'");
      console.log("[ObjectsLoader] Estructura disponible:", Object.keys(data));
      return;
    }

    // Verificar si necesitamos tratar esto como un único objeto grande
    if (data.objects && data.objects.length === 1) {
      const objData = data.objects[0];
      if (objData.vertices && objData.vertices.length > 500) {
        console.log(
          "[ObjectsLoader] Detectado un objeto grande único, procesando de manera especial"
        );
        createSingleLargeMesh(objData, scene);
      } else {
        // Procesar normalmente como múltiples objetos
        createObjectMeshes(data, scene);
      }
    } else {
      // Procesar normalmente como múltiples objetos
      createObjectMeshes(data, scene);
    }
    
    console.log("[ObjectsLoader] Carga de objetos completada exitosamente");
    console.log("[ObjectsLoader] Total objetos creados:", objectsMeshes.length);
    
  } catch (e) {
    console.error("[ObjectsLoader] Error al procesar JSON de objetos:", e);
  }
}

// Función para extraer los colores del objeto, manejando diferentes formatos
function extractColorFromObject(colorData) {
  if (!colorData || colorData === null) {
    console.log("[ObjectsLoader] Sin datos de color, usando color por defecto");
    return {
      r: 0.0,
      g: 0.8,
      b: 0.8,
      a: 0.8,
      default: true,
    };
  }

  try {
    // Extraer valores RGB asegurándose de que estén en el rango correcto
    const r =
      typeof colorData.r === "number"
        ? Math.max(0, Math.min(colorData.r, 1))
        : 0;
    const g =
      typeof colorData.g === "number"
        ? Math.max(0, Math.min(colorData.g, 1))
        : 0.8;
    const b =
      typeof colorData.b === "number"
        ? Math.max(0, Math.min(colorData.b, 1))
        : 0.8;
    const a =
      typeof colorData.a === "number"
        ? Math.max(0, Math.min(colorData.a, 1))
        : 1.0;

    console.log(
      `[ObjectsLoader] Color extraído: R:${r.toFixed(2)}, G:${g.toFixed(
        2
      )}, B:${b.toFixed(2)}, A:${a.toFixed(2)}`
    );

    return { r, g, b, a, default: false };
  } catch (e) {
    console.error("[ObjectsLoader] Error al extraer color:", e);
    return { r: 0.0, g: 0.8, b: 0.8, a: 0.8, default: true };
  }
}

// Función para crear un único objeto de malla grande
function createSingleLargeMesh(objData, scene) {
  try {
    console.log(
      `[ObjectsLoader] Procesando objeto grande: ${objData.vertices.length} vértices, ${objData.faces.length} caras`
    );

    const geometry = new THREE.BufferGeometry();

    // Convertir vértices a Float32Array
    const positions = new Float32Array(objData.vertices.length * 3);
    for (let i = 0; i < objData.vertices.length; i++) {
      positions[i * 3] = objData.vertices[i][0];
      positions[i * 3 + 1] = objData.vertices[i][1];
      positions[i * 3 + 2] = objData.vertices[i][2];
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    // Convertir caras a Uint32Array
    const indices = new Uint32Array(objData.faces.length * 3);
    for (let i = 0; i < objData.faces.length; i++) {
      indices[i * 3] = objData.faces[i][0];
      indices[i * 3 + 1] = objData.faces[i][1];
      indices[i * 3 + 2] = objData.faces[i][2];
    }
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));

    // Añadir normales si existen
    if (objData.normals && objData.normals.length > 0) {
      const normals = new Float32Array(objData.normals.length * 3);
      for (let i = 0; i < objData.normals.length; i++) {
        normals[i * 3] = objData.normals[i][0];
        normals[i * 3 + 1] = objData.normals[i][1];
        normals[i * 3 + 2] = objData.normals[i][2];
      }
      geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
    } else {
      geometry.computeVertexNormals();
    }

    // Calcular y mostrar información sobre el tamaño de la malla
    geometry.computeBoundingBox();
    const boundingBox = geometry.boundingBox;
    const size = new THREE.Vector3();
    boundingBox.getSize(size);

    console.log(
      `[ObjectsLoader] Dimensiones del objeto grande:`,
      `X: ${size.x.toFixed(2)}, Y: ${size.y.toFixed(2)}, Z: ${size.z.toFixed(
        2
      )}`
    );
    console.log(
      `[ObjectsLoader] Rango de coordenadas:`,
      `X: ${boundingBox.min.x.toFixed(2)}~${boundingBox.max.x.toFixed(2)}, ` +
        `Y: ${boundingBox.min.y.toFixed(2)}~${boundingBox.max.y.toFixed(2)}, ` +
        `Z: ${boundingBox.min.z.toFixed(2)}~${boundingBox.max.z.toFixed(2)}`
    );

    // Extraer color del objeto
    console.log(
      "[ObjectsLoader] Extrayendo color para el objeto grande:",
      objData.color
    );
    const colorObj = extractColorFromObject(objData.color);

    // Crear material con el color del objeto o un color por defecto
    let material;
    if (!colorObj.default) {
      material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(colorObj.r, colorObj.g, colorObj.b),
        opacity: colorObj.a,
        transparent: colorObj.a < 1.0,
        metalness: 0.1,
        roughness: 0.5,
        side: THREE.DoubleSide,
        emissive: new THREE.Color(
          colorObj.r / 10,
          colorObj.g / 10,
          colorObj.b / 10
        ),
        emissiveIntensity: 0.15,
      });
      console.log(
        `[ObjectsLoader] Usando color definido para objeto grande:`,
        `R: ${colorObj.r.toFixed(2)}, G: ${colorObj.g.toFixed(
          2
        )}, B: ${colorObj.b.toFixed(2)}, A: ${colorObj.a.toFixed(2)}`
      );
    } else {
      // Color por defecto: azul turquesa brillante
      material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0x00ffff),
        metalness: 0.2,
        roughness: 0.5,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        emissive: new THREE.Color(0x003333),
        emissiveIntensity: 0.2,
      });
      console.log(
        `[ObjectsLoader] Asignando color turquesa brillante al objeto grande (sin color definido)`
      );
    }

    // Crear la malla
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = objectsVisible; // Establecer visibilidad inicial según variable global
    console.log("[ObjectsLoader] Object large created with visibility:", mesh.visible);

    // Asignar datos para tooltip
    mesh.userData = {
      isCustomObject: true,
      tooltipData:
        objData.tooltipData && objData.tooltipData !== null
          ? objData.tooltipData
          : {
              valor: "Estructura de Agua",
              descripcion: "Objeto Grande",
            },
    };

    // Añadir a la escena
    scene.add(mesh);
    console.log("[ObjectsLoader] Object large added to scene with ID:", mesh.id);

    // Limpiar arrays existentes
    objectsMeshes.forEach((oldMesh) => scene.remove(oldMesh));
    objectsMeshes = [mesh];
    objectsData = [objData];

    console.log("[ObjectsLoader] Objeto grande añadido a la escena con éxito");
  } catch (err) {
    console.error("[ObjectsLoader] Error al procesar objeto grande:", err);
  }
}

// Función para crear las mallas de los objetos
function createObjectMeshes(data, scene) {
  // Verificar que data tiene la estructura esperada
  if (!data.objects || !Array.isArray(data.objects)) {
    console.error(
      "[ObjectsLoader] Formato JSON inválido: no contiene un array 'objects'"
    );
    return;
  }

  console.log(
    "[ObjectsLoader] Creando mallas para",
    data.objects.length,
    "objetos"
  );

  // Limpiar arrays existentes
  objectsMeshes.forEach((mesh) => scene.remove(mesh));
  objectsMeshes = [];
  objectsData = [];

  // Procesar cada objeto
  data.objects.forEach((objData, index) => {
    // Verificar datos mínimos necesarios
    if (!objData.vertices || !objData.faces) {
      console.warn(
        "[ObjectsLoader] Objeto #" + index + " sin vértices o caras, omitiendo"
      );
      return;
    }

    console.log(
      `[ObjectsLoader] Procesando objeto #${index}: ${objData.vertices.length} vértices, ${objData.faces.length} caras`
    );

    try {
      const geometry = new THREE.BufferGeometry();

      // Convertir vértices a Float32Array
      const positions = new Float32Array(objData.vertices.length * 3);
      for (let i = 0; i < objData.vertices.length; i++) {
        positions[i * 3] = objData.vertices[i][0];
        positions[i * 3 + 1] = objData.vertices[i][1];
        positions[i * 3 + 2] = objData.vertices[i][2];
      }
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3)
      );

      // Convertir caras a Uint32Array
      const indices = new Uint32Array(objData.faces.length * 3);
      for (let i = 0; i < objData.faces.length; i++) {
        indices[i * 3] = objData.faces[i][0];
        indices[i * 3 + 1] = objData.faces[i][1];
        indices[i * 3 + 2] = objData.faces[i][2];
      }
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));

      // Añadir normales si existen
      if (objData.normals && objData.normals.length > 0) {
        const normals = new Float32Array(objData.normals.length * 3);
        for (let i = 0; i < objData.normals.length; i++) {
          normals[i * 3] = objData.normals[i][0];
          normals[i * 3 + 1] = objData.normals[i][1];
          normals[i * 3 + 2] = objData.normals[i][2];
        }
        geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
      } else {
        // Calcular normales si no existen
        geometry.computeVertexNormals();
      }

      // Extraer color del objeto
      console.log(
        `[ObjectsLoader] Extrayendo color para el objeto #${index}:`,
        objData.color
      );
      const colorObj = extractColorFromObject(objData.color);

      // Crear material con el color del objeto o un color por defecto
      let material;
      if (!colorObj.default) {
        material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(colorObj.r, colorObj.g, colorObj.b),
          opacity: colorObj.a,
          transparent: colorObj.a < 1.0,
          metalness: 0.1,
          roughness: 0.7,
          side: THREE.DoubleSide,
          emissive: new THREE.Color(
            colorObj.r / 10,
            colorObj.g / 10,
            colorObj.b / 10
          ),
          emissiveIntensity: 0.15,
        });
        console.log(
          `[ObjectsLoader] Color del objeto #${index}:`,
          `R: ${colorObj.r.toFixed(2)}, G: ${colorObj.g.toFixed(
            2
          )}, B: ${colorObj.b.toFixed(2)}, A: ${colorObj.a.toFixed(2)}`
        );
      } else {
        // Color por defecto: azul turquesa brillante para tranques
        material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(0x00ffff),
          metalness: 0.2,
          roughness: 0.5,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85,
          emissive: new THREE.Color(0x003333),
          emissiveIntensity: 0.2,
        });
        console.log(
          `[ObjectsLoader] Asignando color turquesa brillante al objeto #${index} (sin color definido)`
        );
      }

      // Crear la malla
      const mesh = new THREE.Mesh(geometry, material);
      mesh.visible = objectsVisible; // Establecer visibilidad inicial según variable global
      console.log(`[ObjectsLoader] Object ${index} created with visibility:`, mesh.visible);

      // Calcular y mostrar información sobre el tamaño de la malla
      geometry.computeBoundingBox();
      const boundingBox = geometry.boundingBox;
      const size = new THREE.Vector3();
      boundingBox.getSize(size);

      console.log(
        `[ObjectsLoader] Dimensiones del objeto #${index}:`,
        `X: ${size.x.toFixed(2)}, Y: ${size.y.toFixed(2)}, Z: ${size.z.toFixed(
          2
        )}`
      );
      console.log(
        `[ObjectsLoader] Centro del objeto #${index}:`,
        `X: ${boundingBox.min.x.toFixed(2)}~${boundingBox.max.x.toFixed(2)}, ` +
          `Y: ${boundingBox.min.y.toFixed(2)}~${boundingBox.max.y.toFixed(
            2
          )}, ` +
          `Z: ${boundingBox.min.z.toFixed(2)}~${boundingBox.max.z.toFixed(2)}`
      );

      // Asignar datos para tooltip
      mesh.userData = {
        isCustomObject: true,
        tooltipData:
          objData.tooltipData && objData.tooltipData !== null
            ? objData.tooltipData
            : {
                valor: "Estructura de Agua",
                descripcion: `Objeto ${index + 1}`,
              },
      };

      // Hacer que el material capte y emita un poco de luz para mayor visibilidad
      material.emissive = material.emissive || new THREE.Color(0x001111);
      material.emissiveIntensity = material.emissiveIntensity || 0.15;

      // Añadir a la escena
      scene.add(mesh);
      console.log(`[ObjectsLoader] Object ${index} added to scene with ID:`, mesh.id);

      // Guardar referencia
      objectsMeshes.push(mesh);
      objectsData.push(objData);

      console.log(
        `[ObjectsLoader] Objeto #${index} añadido a la escena con éxito`
      );
    } catch (err) {
      console.error(`[ObjectsLoader] Error al procesar objeto #${index}:`, err);
    }
  });

  console.log(
    "[ObjectsLoader] Total de objetos creados:",
    objectsMeshes.length
  );
}

// Función para comprobar intersección con objetos y mostrar tooltip
export function checkObjectIntersection(raycaster, mouse, camera, tooltip) {
  if (objectsMeshes.length === 0) return false;

  // Calcular intersecciones
  const intersects = raycaster.intersectObjects(objectsMeshes);

  if (intersects.length > 0) {
    // Obtener el primer objeto intersectado
    const intersect = intersects[0];
    const object = intersect.object;

    // Verificar que tiene datos para el tooltip
    if (
      object.userData &&
      object.userData.isCustomObject &&
      object.userData.tooltipData
    ) {
      const tooltipData = object.userData.tooltipData;

      // Obtener posición del tooltip en la pantalla
      const point = intersect.point.clone();
      const screenPosition = point.project(camera);

      const x = ((screenPosition.x + 1) / 2) * window.innerWidth;
      const y = (-(screenPosition.y - 1) / 2) * window.innerHeight;

      // Mostrar información en tooltip con formato consistente
      // Siempre coloca la descripción en negrita y el valor abajo
      tooltip.innerHTML = `
                <strong>${tooltipData.descripcion || "Objeto"}</strong><br>
                ${tooltipData.valor || "Sin datos"}
            `;

      // Posicionar y mostrar tooltip
      tooltip.style.left = x + 15 + "px";
      tooltip.style.top = y + 15 + "px";
      tooltip.style.display = "block";

      return true;
    }
  }

  return false;
}

// Exportar funciones y variables
export { objectsMeshes, createObjectMeshes };