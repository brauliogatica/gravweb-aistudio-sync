// water-particles.js
// Sistema de simulación de partículas de agua para threejs-mesh-viewer.html

import * as THREE from "three";

let setLoadingMessage = null;
let setLoadingStyle = null;

export function setLoaderFunctions(messageCallback, styleCallback) {
  setLoadingMessage = messageCallback;
  setLoadingStyle = styleCallback;
}

// Variables para la simulación de agua
let scene;
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

// Variables para el sistema de estelas
let trailSystem;
let particleTails = [];
const trailLength = 50; // Aumentado de 5 a 50 (10 veces más largo)

// Colores para las partículas de agua
const PARTICLE_COLORS = [
  new THREE.Color(0x00ffff), // Cian brillante
  new THREE.Color(0x00bfff), // Azul cielo
  new THREE.Color(0x1e90ff), // Azul real
  new THREE.Color(0x00ffff), // Cian
  new THREE.Color(0x80ffff), // Cian claro
];

// Variables para el flujo de líneas
let useLineFlow = false; // Flag para activar/desactivar flujo por líneas
let lineDirections = []; // Array para almacenar las direcciones de las líneas
let lineFlowInfluenceDistance = 35.0; // Reducido para concentrar más el efecto directamente sobre las líneas

// Variables para optimización del flujo por líneas
let lineDirectionField = null; // Campo de dirección simple para las líneas
let flowFieldResolution = 200; // Aumentado significativamente para mayor detalle
let flowFieldInitialized = false; // Indica si el campo de flujo está inicializado
let isCalculatingFlowField = false; // Indica si se está calculando el campo de flujo

// Añadir un arreglo global para la última dirección de línea de cada partícula
let lastLineFlowDirections = []; // inicialízalo con particleCount elementos = null

// Inicializar el sistema de simulación
export function initWaterSystem(sceneRef) {
  scene = sceneRef;
}

// Extraer normales del JSON
export function extractNormalsFromJSON(data) {
  console.log("Extrayendo normales de gen.json...");

  if (!data) {
    console.warn("No hay datos JSON para extraer normales");
    return;
  }

  // Guardar posiciones de vértices para referencia
  if (data.vertices && Array.isArray(data.vertices)) {
    vertexPositions = data.vertices.map((v) => {
      if (Array.isArray(v) && v.length >= 3) {
        return new THREE.Vector3(v[0], v[1], v[2]);
      }
      return null;
    });
    console.log(`Posiciones de vértices extraídas: ${vertexPositions.length}`);
  }

  // Extraer normales si existen
  if (data.normals && Array.isArray(data.normals)) {
    vertexNormals = data.normals.map((n) => {
      if (Array.isArray(n) && n.length >= 3) {
        // Normalizar para asegurar que es un vector unitario
        const normal = new THREE.Vector3(n[0], n[1], n[2]);
        normal.normalize();
        return normal;
      }
      return null;
    });

    console.log(`Normales extraídas de gen.json: ${vertexNormals.length}`);

    // Mostrar algunas normales para depuración
    if (vertexNormals.length > 0) {
      console.log("Ejemplos de normales:");
      for (let i = 0; i < Math.min(5, vertexNormals.length); i++) {
        const n = vertexNormals[i];
        if (n) {
          console.log(
            `  [${i}]: (${n.x.toFixed(3)}, ${n.y.toFixed(3)}, ${n.z.toFixed(
              3
            )})`
          );
        } else {
          console.log(`  [${i}]: null`);
        }
      }
    }
  } else {
    console.warn("No se encontraron normales en gen.json");
  }
}

// Función para calcular un gradiente de altura basado en la geometría
export function createHeightField(currentMesh) {
  if (!currentMesh || !currentMesh.current || !currentMesh.current.geometry) {
    console.error("No hay malla para crear el campo de altura");
    return false;
  }

  console.log("Creando campo de altura para la simulación...");

  // Determinar el tamaño del campo basado en la complejidad de la malla
  const geometry = currentMesh.current.geometry;
  const positions = geometry.attributes.position.array;

  // Obtener límites de la malla
  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;
  let minZ = Infinity,
    maxZ = -Infinity;

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];

    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }

  // Determinar resolución (ajustar según complejidad)
  const resolution = 100; // Número de celdas en cada dimensión

  // Crear grid vacío
  heightFieldSize = {
    width: resolution,
    height: resolution,
    realWidth: maxX - minX,
    realHeight: maxY - minY,
    minX: minX,
    minY: minY,
    minZ: minZ,
    maxZ: maxZ,
  };

  // Inicializar array 2D
  heightField = new Array(resolution);
  for (let i = 0; i < resolution; i++) {
    heightField[i] = new Array(resolution).fill(null);
  }

  // Proyectar la malla en el grid
  const raycaster = new THREE.Raycaster();
  const direction = new THREE.Vector3(0, 0, -1); // Dirección hacia abajo

  for (let i = 0; i < resolution; i++) {
    for (let j = 0; j < resolution; j++) {
      // Calcular posición en el mundo
      const x = minX + (i / (resolution - 1)) * (maxX - minX);
      const y = minY + (j / (resolution - 1)) * (maxY - minY);

      // Crear un rayo desde arriba hacia abajo
      const origin = new THREE.Vector3(x, y, maxZ + 10);
      raycaster.set(origin, direction);

      // Verificar intersección con la malla
      const intersects = raycaster.intersectObject(currentMesh.current);

      if (intersects.length > 0) {
        // Guardar la altura (coordenada Z)
        const hitPoint = intersects[0].point;
        const face = intersects[0].face;

        let normal;

        // Si tenemos normales de gen.json y tenemos la intersección
        if (vertexNormals.length > 0 && face) {
          // Calcular normal interpolada de los vértices de la cara
          const a = face.a;
          const b = face.b;
          const c = face.c;

          // Obtener normales de los vértices
          const normalA = vertexNormals[a] || new THREE.Vector3(0, 0, 1);
          const normalB = vertexNormals[b] || new THREE.Vector3(0, 0, 1);
          const normalC = vertexNormals[c] || new THREE.Vector3(0, 0, 1);

          // Calcular coordenadas baricéntricas para interpolación
          const baryCoord = calculateBarycentricCoordinates(
            hitPoint,
            vertexPositions[a] || new THREE.Vector3(0, 0, 0),
            vertexPositions[b] || new THREE.Vector3(0, 0, 0),
            vertexPositions[c] || new THREE.Vector3(0, 0, 0)
          );

          // Interpolar normales
          normal = new THREE.Vector3(0, 0, 0);
          normal.addScaledVector(normalA, baryCoord.u);
          normal.addScaledVector(normalB, baryCoord.v);
          normal.addScaledVector(normalC, baryCoord.w);
          normal.normalize();
        } else {
          // Usar normal de la cara si no tenemos normales por vértice
          normal = face ? face.normal.clone() : new THREE.Vector3(0, 0, 1);
        }

        heightField[i][j] = {
          height: hitPoint.z,
          normal: normal,
        };
      } else {
        // Si no hay intersección, usar un valor predeterminado
        heightField[i][j] = {
          height: minZ,
          normal: new THREE.Vector3(0, 0, 1),
        };
      }
    }

    // Indicar progreso cada 10%
    if (i % Math.floor(resolution / 10) === 0) {
      console.log(
        `Creando campo de altura: ${Math.floor((i / resolution) * 100)}%`
      );
    }
  }

  console.log("Campo de altura creado con éxito");
  return true;
}

// Calcular coordenadas baricéntricas para un punto en un triángulo
function calculateBarycentricCoordinates(p, a, b, c) {
  // Vectores del triángulo
  const v0 = new THREE.Vector3().subVectors(c, a);
  const v1 = new THREE.Vector3().subVectors(b, a);
  const v2 = new THREE.Vector3().subVectors(p, a);

  // Productos punto
  const d00 = v0.dot(v0);
  const d01 = v0.dot(v1);
  const d11 = v1.dot(v1);
  const d20 = v2.dot(v0);
  const d21 = v2.dot(v1);

  // Denominador
  const denom = d00 * d11 - d01 * d01;

  // Calcular coordenadas baricéntricas
  let v = (d11 * d20 - d01 * d21) / denom;
  let w = (d00 * d21 - d01 * d20) / denom;
  let u = 1.0 - v - w;

  return { u, v, w };
}

// Crear sistema de partículas para simular agua
export function createWaterParticles(currentMesh) {
  // Eliminar sistema de partículas anterior si existe
  if (particleSystem) {
    scene.remove(particleSystem);
    particleSystem.geometry.dispose();
    particleSystem.material.dispose();
    particleSystem = null;
  }

  console.log(
    `Creando sistema de partículas con ${particleCount} partículas...`
  );

  // Crear geometría para las partículas
  const geometry = new THREE.BufferGeometry();

  // Crear arrays para posiciones y colores
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);

  // Inicializar partículas con posiciones aleatorias
  particlePositions = [];
  particleVelocities = [];
  particleLifetimes = [];
  particleVisible = [];

  // Arrays para almacenar las posiciones anteriores para el efecto de estela
  particleTails = [];

  // Asegurarse de que el campo de altura está creado
  if (heightField.length === 0) {
    if (!createHeightField(currentMesh)) {
      console.error("No se pudo crear el campo de altura");
      return false;
    }
  }

  const { width, height, minX, minY, realWidth, realHeight, maxZ } =
    heightFieldSize;

  for (let i = 0; i < particleCount; i++) {
    // Posición aleatoria dentro de los límites del terreno
    const gridX = Math.floor(Math.random() * (width - 1));
    const gridY = Math.floor(Math.random() * (height - 1));

    // Convertir a coordenadas del mundo
    const x = minX + (gridX / (width - 1)) * realWidth;
    const y = minY + (gridY / (height - 1)) * realHeight;

    // Obtener altura del terreno
    let z = maxZ; // Valor por defecto
    if (heightField[gridX] && heightField[gridX][gridY]) {
      z = heightField[gridX][gridY].height + 0.5; // Ligeramente por encima del terreno
    }

    // Guardar posición
    const pos = new THREE.Vector3(x, y, z);
    particlePositions.push(pos);

    // Inicializar array de posiciones para la estela (trail)
    particleTails.push([]);

    // Asignar a la geometría
    positions[i * 3] = pos.x;
    positions[i * 3 + 1] = pos.y;
    positions[i * 3 + 2] = pos.z;

    // Velocidad inicial basada en la normal del terreno
    let normal = new THREE.Vector3(0, 0, 1);
    if (heightField[gridX] && heightField[gridX][gridY]) {
      normal = heightField[gridX][gridY].normal || normal;
    }

    // Si tenemos normales de vértice disponibles, usarlas aleatoriamente
    if (vertexNormals.length > 0 && Math.random() < 0.7) {
      // Elegir una normal aleatoria de los vértices cercanos
      const randomIndex = Math.floor(Math.random() * vertexNormals.length);
      const vertexNormal = vertexNormals[randomIndex];

      if (vertexNormal) {
        normal = vertexNormal.clone();

        // Agregar un poco de variación aleatoria
        normal.x += Math.random() * 0.1 - 0.05;
        normal.y += Math.random() * 0.1 - 0.05;
        normal.z += Math.random() * 0.1 - 0.05;
        normal.normalize();
      }
    }

    // Corregir la dirección: agua fluye en la dirección de la pendiente (no en contra)
    // La pendiente está definida por el vector normal, y queremos movernos perpendicular a la normal
    // pero hacia abajo (en la dirección de la pendiente descendente)
    const velocity = new THREE.Vector3(normal.x, normal.y, 0).normalize();

    // Añadir un poco de aleatoriedad
    velocity.x += (Math.random() - 0.5) * 0.2;
    velocity.y += (Math.random() - 0.5) * 0.2;
    velocity.normalize().multiplyScalar(0.5 + Math.random() * 0.5); // Velocidad base

    particleVelocities.push(velocity);

    // Tiempo de vida aleatorio (ciclos de animación)
    particleLifetimes.push(20 + Math.random() * 40); // Reducido para una vida de ~2 segundos

    // Visibilidad inicial aleatoria (mayor probabilidad de ser visible)
    particleVisible.push(Math.random() > 0.3);

    // Color aleatorio de la paleta de azules
    const colorIndex = Math.floor(Math.random() * PARTICLE_COLORS.length);
    const color = PARTICLE_COLORS[colorIndex];

    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;

    // Tamaño aleatorio - aumentado para mayor visibilidad
    sizes[i] = 4 + Math.random() * 6; // Tamaños entre 4 y 10
  }

  // Asignar atributos a la geometría
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

  // Crear material para las partículas, usando textura para puntos más suaves
  const texture = createParticleTexture();

  const material = new THREE.PointsMaterial({
    size: 5,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
    map: texture,
  });

  // Crear el sistema de partículas
  particleSystem = new THREE.Points(geometry, material);
  particleSystem.renderOrder = 10; // Asegurarse que se renderiza encima de la malla
  scene.add(particleSystem);

  // Crear el sistema de líneas para las estelas
  createTrailSystem();

  console.log("Sistema de partículas creado");
  return true;
}

// Crear una textura para partículas más suaves
function createParticleTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;

  const context = canvas.getContext("2d");

  // Gradiente radial para crear partícula con bordes suaves
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.3, "rgba(255, 255, 255, 0.8)");
  gradient.addColorStop(0.7, "rgba(255, 255, 255, 0.3)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  return texture;
}

// Crear sistema de líneas para las estelas de las partículas
function createTrailSystem() {
  // Eliminar sistema anterior si existe
  if (trailSystem) {
    scene.remove(trailSystem);
    trailSystem.geometry.dispose();
    trailSystem.material.dispose();
  }

  // Crear geometría para las líneas
  const geometry = new THREE.BufferGeometry();

  // Máximo número de puntos para todas las estelas
  // Usamos un número más manejable de puntos aunque la estela sea más larga
  const maxTrailPoints = particleCount * 100; // Suficiente para estelas largas con optimización

  // Arrays para posiciones y colores
  const positions = new Float32Array(maxTrailPoints * 3);
  const colors = new Float32Array(maxTrailPoints * 3);

  // Inicializar arrays con valores por defecto
  for (let i = 0; i < maxTrailPoints; i++) {
    positions[i * 3] = 0;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = -1000; // Fuera de vista inicialmente

    colors[i * 3] = 1;
    colors[i * 3 + 1] = 1;
    colors[i * 3 + 2] = 1;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  // Material para las líneas
  const material = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    linewidth: 1,
  });

  // Crear el sistema de líneas
  trailSystem = new THREE.LineSegments(geometry, material);
  trailSystem.frustumCulled = false; // Evitar que se oculten cuando están fuera de vista
  scene.add(trailSystem);

  console.log("Sistema de estelas creado");
}

// Actualizar el sistema de estelas
function updateTrails() {
  if (!trailSystem || !particleSystem) return;

  const positions = trailSystem.geometry.attributes.position.array;
  const colors = trailSystem.geometry.attributes.color.array;

  let pointIndex = 0;

  for (let i = 0; i < particleCount; i++) {
    // Solo procesar partículas visibles
    if (!particleVisible[i]) {
      continue;
    }

    const positions = trailSystem.geometry.attributes.position.array;
    const currentPos = particlePositions[i].clone();
    const tail = particleTails[i];

    // Añadir posición actual al inicio de la cola
    tail.unshift(currentPos.clone());

    // Limitar longitud de la cola
    if (tail.length > trailLength) {
      tail.pop();
    }

    // Dibujar segmentos de línea para la estela
    // Optimización: no necesitamos dibujar todos los segmentos para estelas largas
    // Usaremos un paso adaptativo para mantener un rendimiento adecuado
    const stepSize = Math.max(1, Math.floor(tail.length / 100)); // Escalar el paso según la longitud

    for (let j = 0; j < tail.length - stepSize; j += stepSize) {
      const start = tail[j];
      const end = tail[j + stepSize];

      // Índice para este segmento de línea en los arrays de posición y color
      const baseIndex = pointIndex * 3;

      // Punto inicial del segmento
      positions[baseIndex] = start.x;
      positions[baseIndex + 1] = start.y;
      positions[baseIndex + 2] = start.z;

      // Color del punto inicial (más brillante)
      // Ajustar la opacidad para estelas más largas
      const opacity = Math.pow(1.0 - j / tail.length, 0.8); // Desvanecimiento más gradual
      colors[baseIndex] = 1 * opacity;
      colors[baseIndex + 1] = 1 * opacity;
      colors[baseIndex + 2] = 1 * opacity;

      // Punto final del segmento
      positions[baseIndex + 3] = end.x;
      positions[baseIndex + 4] = end.y;
      positions[baseIndex + 5] = end.z;

      // Color del punto final (más tenue)
      const nextOpacity = Math.pow(1.0 - (j + stepSize) / tail.length, 0.8);
      colors[baseIndex + 3] = 1 * nextOpacity;
      colors[baseIndex + 4] = 1 * nextOpacity;
      colors[baseIndex + 5] = 1 * nextOpacity;

      pointIndex += 2;
    }
  }

  // Limpiar el resto de los puntos si no se usaron todos
  for (let i = pointIndex; i < particleCount * trailLength * 2; i++) {
    const baseIndex = i * 3;
    positions[baseIndex + 2] = -1000; // Mover fuera de la vista
  }

  // Marcar atributos como necesitan actualización
  trailSystem.geometry.attributes.position.needsUpdate = true;
  trailSystem.geometry.attributes.color.needsUpdate = true;
}

// Actualizar las partículas en cada frame
export function updateWaterParticles(currentMesh) {
  if (!particleSystem || !currentMesh.current) return;

  const { width, height, minX, minY, realWidth, realHeight, minZ } =
    heightFieldSize;
  const geometry = particleSystem.geometry;
  const positions = geometry.attributes.position.array;

  // Actualizar cada partícula
  for (let i = 0; i < particleCount; i++) {
    particleLifetimes[i] -= 0.5 * flowSpeed;

    if (particleLifetimes[i] <= 0) {
      resetParticle(i);
      continue;
    }

    if (!particleVisible[i]) {
      positions[i * 3 + 2] = -1000;
      continue;
    }

    const pos = particlePositions[i];

    // Convertir posición del mundo a índices de la grid
    const gridX = Math.floor(((pos.x - minX) / realWidth) * (width - 1));
    const gridY = Math.floor(((pos.y - minY) / realHeight) * (height - 1));

    // Verificar límites
    if (gridX < 0 || gridX >= width - 1 || gridY < 0 || gridY >= height - 1) {
      resetParticle(i);
      continue;
    }

    // Obtener altura del terreno
    let terrainHeight = minZ;
    let normal = new THREE.Vector3(0, 0, 1);
    if (heightField[gridX] && heightField[gridX][gridY]) {
      terrainHeight = heightField[gridX][gridY].height;
      normal = heightField[gridX][gridY].normal || normal;
    }

    // Si la partícula está por debajo o muy cerca del terreno, reiniciarla
    if (pos.z <= terrainHeight + 0.1) {
      resetParticle(i);
      continue;
    }

    // Actualizar velocidad
    const velocity = particleVelocities[i];

    // Gravedad más suave
    velocity.z -= 0.005 * flowSpeed;

    // Determinar dirección de flujo
    let flowDirection;

    if (useLineFlow && flowFieldInitialized) {
      // Intentar obtener dirección del campo precalculado
      flowDirection = getFlowDirectionFromField(pos);

      if (flowDirection) {
        // Verificar si tenemos información de intensidad para ajustar dominancia
        const fieldInfo = getFlowFieldInfoAtPosition(pos);
        let dominance = 0.3; // Valor por defecto para casos sin info

        if (fieldInfo) {
          // Ajustar la dominancia según la intensidad y distancia
          // Mayor dominancia cerca de las líneas, decae con distancia
          if (fieldInfo.distance < lineFlowInfluenceDistance * 0.3) {
            // Zona muy cercana: dominancia casi total para máxima fidelidad
            dominance = 0.995;
          } else if (fieldInfo.distance < lineFlowInfluenceDistance * 0.5) {
            // Zona cercana: alta dominancia
            dominance = 0.98;
          } else if (fieldInfo.distance < lineFlowInfluenceDistance * 0.8) {
            // Zona intermedia: transición gradual
            const t =
              (fieldInfo.distance - lineFlowInfluenceDistance * 0.5) /
              (lineFlowInfluenceDistance * 0.3);
            dominance = 0.98 - t * 0.4; // Transición de 0.98 a 0.58
          } else {
            // Zona alejada: baja influencia, prevalece el terreno
            dominance = 0.35; // Aumentado para mayor persistencia
          }
        }

        // Aplicar la dirección de flujo con dominancia variable según la distancia
        // Factor de velocidad uniforme para mantener consistencia
        const velocityFactor = flowSpeed * 1.5;
        velocity.x =
          flowDirection.x * dominance * velocityFactor +
          velocity.x * (1 - dominance);
        velocity.y =
          flowDirection.y * dominance * velocityFactor +
          velocity.y * (1 - dominance);

        // Guardar esta dirección para uso futuro, pero solo si tiene influencia significativa
        if (dominance > 0.4) {
          lastLineFlowDirections[i] = flowDirection.clone();
        } else if (lastLineFlowDirections[i]) {
          // Ir reduciendo gradualmente la última dirección conocida en zonas lejanas
          lastLineFlowDirections[i] = null;
        }
      } else {
        // Si no hay dirección de campo, usar lógica híbrida
        const naturalDirection = new THREE.Vector3(
          normal.x,
          normal.y,
          0
        ).normalize();

        // Usar última dirección conocida si existe, con menor influencia
        if (lastLineFlowDirections[i]) {
          flowDirection = lastLineFlowDirections[i];
          // Mezcla con más peso a la dirección natural para transición suave
          velocity.x =
            flowDirection.x * 0.4 * flowSpeed +
            naturalDirection.x * 0.6 * flowSpeed +
            velocity.x * 0.2;
          velocity.y =
            flowDirection.y * 0.4 * flowSpeed +
            naturalDirection.y * 0.6 * flowSpeed +
            velocity.y * 0.2;

          // Reducir influencia gradualmente (probabilístico)
          if (Math.random() < 0.05) {
            lastLineFlowDirections[i] = null; // 5% de probabilidad de olvidar dirección
          }
        } else {
          // Sin influencia de líneas, comportamiento completamente natural
          velocity.x = naturalDirection.x * 0.3 * flowSpeed + velocity.x * 0.7;
          velocity.y = naturalDirection.y * 0.3 * flowSpeed + velocity.y * 0.7;
        }
      }
    } else {
      // Modo normal: usar la normal del terreno
      flowDirection = new THREE.Vector3(normal.x, normal.y, 0).normalize();

      // Comportamiento normal con menor peso de la normal
      velocity.x = flowDirection.x * 0.3 * flowSpeed + velocity.x * 0.7;
      velocity.y = flowDirection.y * 0.3 * flowSpeed + velocity.y * 0.7;
    }

    // Limitar velocidad - velocidad uniforme en todo el terreno
    let maxSpeed = flowSpeed * 1.5; // Velocidad constante para todo el terreno

    if (velocity.length() > maxSpeed) {
      velocity.normalize().multiplyScalar(maxSpeed);
    }

    // Actualizar posición
    pos.add(velocity);

    // Mantener la partícula por encima del terreno
    let newTerrainHeight = minZ;
    const newGridX = Math.floor(((pos.x - minX) / realWidth) * (width - 1));
    const newGridY = Math.floor(((pos.y - minY) / realHeight) * (height - 1));

    if (
      newGridX >= 0 &&
      newGridX < width &&
      newGridY >= 0 &&
      newGridY < height &&
      heightField[newGridX] &&
      heightField[newGridX][newGridY]
    ) {
      newTerrainHeight = heightField[newGridX][newGridY].height;
      // Asegurar una distancia mínima sobre el terreno
      if (pos.z < newTerrainHeight + 1.0) {
        pos.z = newTerrainHeight + 1.0;
      }
    }

    // Actualizar posición en la geometría
    positions[i * 3] = pos.x;
    positions[i * 3 + 1] = pos.y;
    positions[i * 3 + 2] = pos.z;
  }

  // Actualizar geometría
  geometry.attributes.position.needsUpdate = true;

  // Actualizar estelas
  updateTrails();
}

// Reiniciar una partícula en una nueva posición
function resetParticle(index) {
  const { width, height, minX, minY, realWidth, realHeight, maxZ } =
    heightFieldSize;

  // Posición aleatoria dentro de los límites del terreno
  const gridX = Math.floor(Math.random() * (width - 1));
  const gridY = Math.floor(Math.random() * (height - 1));

  // Convertir a coordenadas del mundo
  const x = minX + (gridX / (width - 1)) * realWidth;
  const y = minY + (gridY / (height - 1)) * realHeight;

  // Obtener altura del terreno y asegurar que la partícula esté por encima
  let z = maxZ; // Comenzar desde el punto más alto
  if (heightField[gridX] && heightField[gridX][gridY]) {
    z = heightField[gridX][gridY].height + 2.0; // Aumentado el offset a 2.0 unidades sobre el terreno
  }

  // Actualizar posición
  particlePositions[index].set(x, y, z);

  // Limpiar la estela
  particleTails[index] = [];

  // Actualizar velocidad
  let normal = new THREE.Vector3(0, 0, 1);
  if (heightField[gridX] && heightField[gridX][gridY]) {
    normal = heightField[gridX][gridY].normal || normal;
  }

  // Determinar la dirección de flujo inicial
  let flowDirection;

  if (useLineFlow && flowFieldInitialized) {
    // Si estamos usando flujo por líneas, intentar obtener dirección del campo
    const worldPos = new THREE.Vector3(x, y, z);
    flowDirection = getFlowDirectionFromField(worldPos);

    if (flowDirection) {
      // Verificar información de campo para ajustar comportamiento según distancia
      const fieldInfo = getFlowFieldInfoAtPosition(worldPos);

      if (fieldInfo) {
        // Factor de velocidad uniforme para todas las partículas
        const velocityFactor = 0.6 + Math.random() * 0.3;

        // Para zonas cercanas a líneas, guardar la dirección
        if (fieldInfo.distance < lineFlowInfluenceDistance * 0.7) {
          lastLineFlowDirections[index] = flowDirection.clone();
        }

        // Tiempo de vida estándar para todas las partículas
        particleLifetimes[index] = 20 + Math.random() * 40; // Reducido para una vida de ~2 segundos

        // Probabilidad estándar de ser visible
        particleVisible[index] = Math.random() > 0.05; // 95% de probabilidad

        const velocity = flowDirection.clone().multiplyScalar(velocityFactor);
        particleVelocities[index].copy(velocity);

        // Actualizar posición en geometría
        const positions = particleSystem.geometry.attributes.position.array;
        positions[index * 3] = x;
        positions[index * 3 + 1] = y;
        positions[index * 3 + 2] = z;

        return; // Salir temprano si aplicamos comportamiento específico
      }
    }
  }

  // Si hay normales de vértice disponibles, usarlas aleatoriamente
  if (vertexNormals.length > 0 && Math.random() < 0.7) {
    // Elegir una normal aleatoria de los vértices disponibles
    const randomIndex = Math.floor(Math.random() * vertexNormals.length);
    const vertexNormal = vertexNormals[randomIndex];

    if (vertexNormal) {
      normal = vertexNormal.clone();

      // Agregar un poco de variación aleatoria (reducida para más estabilidad)
      normal.x += Math.random() * 0.05 - 0.025;
      normal.y += Math.random() * 0.05 - 0.025;
      normal.z += Math.random() * 0.05 - 0.025;
      normal.normalize();
    }
  }

  // La velocidad es la dirección de la normal proyectada en el plano XY
  const velocity = new THREE.Vector3(normal.x, normal.y, 0).normalize();
  // Reducir la aleatoriedad para más estabilidad
  velocity.x += (Math.random() - 0.5) * 0.1;
  velocity.y += (Math.random() - 0.5) * 0.1;
  velocity.normalize().multiplyScalar(0.3 + Math.random() * 0.3); // Velocidad inicial más lenta

  particleVelocities[index].copy(velocity);

  // Reiniciar tiempo de vida
  particleLifetimes[index] = 20 + Math.random() * 40; // Reducido para una vida de ~2 segundos

  // Visibilidad (mayor probabilidad de ser visible)
  particleVisible[index] = Math.random() > 0.1; // 90% de probabilidad de ser visible

  // Actualizar posición en geometría
  const positions = particleSystem.geometry.attributes.position.array;
  positions[index * 3] = x;
  positions[index * 3 + 1] = y;
  positions[index * 3 + 2] = z;
}

// Activar/desactivar la simulación de agua
export function toggleWaterSimulation(currentMesh) {
  console.log(
    "toggleWaterSimulation llamada, estado actual:",
    simulationActive
  );
  simulationActive = !simulationActive;
  console.log("Nuevo estado de simulación:", simulationActive);

  const btn = document.getElementById("btnSimulacion");

  if (simulationActive) {
    btn.textContent = "Detener Simulación";
    btn.classList.add("active");

    if (setLoadingMessage) {
      setLoadingMessage("Iniciando simulación de agua...");
    }
    setTimeout(() => {
      if (setLoadingMessage) {
        setLoadingMessage(null);
      }
    }, 2000);

    // Crear campo de altura si no existe
    if (heightField.length === 0) {
      if (!createHeightField(currentMesh)) {
        simulationActive = false;
        btn.textContent = "Iniciar Simulación";
        btn.classList.remove("active");
        if (setLoadingMessage) {
          setLoadingMessage("Error: No se pudo crear campo de altura");
        }
        setTimeout(() => {
          if (setLoadingMessage) {
            setLoadingMessage(null);
          }
        }, 2000);
        return;
      }
    }

    // Crear sistema de partículas si no existe
    if (!particleSystem) {
      if (!createWaterParticles(currentMesh)) {
        simulationActive = false;
        btn.textContent = "Iniciar Simulación";
        btn.classList.remove("active");
        if (setLoadingMessage) {
          setLoadingMessage("Error: No se pudo crear sistema de partículas");
        }
        return;
      }
    } else {
      // Mostrar sistema existente
      particleSystem.visible = true;
      if (trailSystem) trailSystem.visible = true;
    }

    if (setLoadingMessage) {
      setLoadingMessage(null);
    }
  } else {
    btn.textContent = "Iniciar Simulación";
    btn.classList.remove("active");

    // Ocultar partículas sin eliminarlas
    if (particleSystem) {
      particleSystem.visible = false;
    }

    // Ocultar estelas
    if (trailSystem) {
      trailSystem.visible = false;
    }
  }
}

// Actualizar el número de partículas
export function updateParticleCount(count, currentMesh) {
  particleCount = parseInt(count);

  // Si la simulación está activa, recrear las partículas
  if (simulationActive && particleSystem) {
    if (setLoadingMessage) {
      setLoadingMessage(`Actualizando a ${particleCount} partículas...`);
    }

    // Eliminar sistema actual y crear uno nuevo
    if (currentMesh.current) {
      createWaterParticles(currentMesh);
    }

    if (setLoadingMessage) {
      setLoadingMessage(null);
    }
  }
}

// Actualizar la velocidad del flujo
export function updateFlowSpeed(speed) {
  flowSpeed = parseFloat(speed);
  console.log(`Velocidad de flujo actualizada a: ${flowSpeed}`);
}

// Función para extraer direcciones de las polilíneas
export function extractLineDirections(polylines) {
  lineDirections = [];

  // Función para subdividir un segmento en múltiples puntos
  function subdivideSegment(start, end, subdivisions = 3) {
    const segments = [];
    // Aumentamos la densidad de puntos para cada segmento
    for (let i = 0; i < subdivisions; i++) {
      const t1 = i / subdivisions;
      const t2 = (i + 1) / subdivisions;

      const subStart = new THREE.Vector3(
        start.x + (end.x - start.x) * t1,
        start.y + (end.y - start.y) * t1,
        start.z + (end.z - start.z) * t1
      );

      const subEnd = new THREE.Vector3(
        start.x + (end.x - start.x) * t2,
        start.y + (end.y - start.y) * t2,
        start.z + (end.z - start.z) * t2
      );

      const direction = new THREE.Vector3()
        .subVectors(subEnd, subStart)
        .normalize();
      direction.z = 0;
      direction.normalize();

      // Reforzar la dirección para mayor magnitud
      segments.push({
        start: subStart.clone(),
        end: subEnd.clone(),
        direction: direction,
        // Agregar una propiedad opcional para intensidad base reforzada
        baseIntensity: 1.2,
      });
    }
    return segments;
  }

  // Procesar el polígono principal si existe
  if (polylines.poligono) {
    const positions = polylines.poligono.geometry.attributes.position.array;

    for (let i = 0; i < positions.length - 3; i += 3) {
      const start = new THREE.Vector3(
        positions[i],
        positions[i + 1],
        positions[i + 2]
      );

      const end = new THREE.Vector3(
        positions[i + 3],
        positions[i + 4],
        positions[i + 5]
      );

      // Subdividir este segmento en múltiples segmentos más pequeños
      // Aumentamos de 5 a 8 subdivisiones por segmento
      const subdivisions = subdivideSegment(start, end, 8);
      lineDirections.push(...subdivisions);
    }

    // Conectar el último punto con el primero (polígono cerrado)
    const lastIndex = positions.length - 3;
    const start = new THREE.Vector3(
      positions[lastIndex],
      positions[lastIndex + 1],
      positions[lastIndex + 2]
    );

    const end = new THREE.Vector3(positions[0], positions[1], positions[2]);

    // Subdividir también este último segmento
    const subdivisions = subdivideSegment(start, end, 8);
    lineDirections.push(...subdivisions);
  }

  // Procesar todas las líneas abiertas
  for (const linea of polylines.lineas) {
    const positions = linea.geometry.attributes.position.array;

    for (let i = 0; i < positions.length - 3; i += 3) {
      const start = new THREE.Vector3(
        positions[i],
        positions[i + 1],
        positions[i + 2]
      );

      const end = new THREE.Vector3(
        positions[i + 3],
        positions[i + 4],
        positions[i + 5]
      );

      // Subdividir este segmento en múltiples segmentos más pequeños
      // Aumentamos de 5 a 8 subdivisiones por segmento
      const subdivisions = subdivideSegment(start, end, 8);
      lineDirections.push(...subdivisions);
    }
  }

  console.log(
    `Extraídas ${lineDirections.length} direcciones de líneas para influir en el flujo`
  );

  // Limitar el número máximo de líneas para rendimiento
  const maxLines = 3500; // Aumentado para permitir más vectores
  if (lineDirections.length > maxLines) {
    console.log(`Limitando a ${maxLines} líneas para mantener rendimiento`);
    // Seleccionar un subconjunto de líneas uniformemente distribuidas
    const step = Math.ceil(lineDirections.length / maxLines);
    const prunedLines = [];
    for (let i = 0; i < lineDirections.length; i += step) {
      prunedLines.push(lineDirections[i]);
    }
    lineDirections = prunedLines;
  }

  console.log(
    `Se usarán ${lineDirections.length} líneas para el campo de flujo`
  );

  return lineDirections.length > 0;
}

// Activar/desactivar el flujo basado en líneas
export function toggleLineFlow(polylines) {
  if (isCalculatingFlowField) {
    alert(
      "Por favor espere a que termine el cálculo del campo de flujo en curso."
    );
    return useLineFlow;
  }

  useLineFlow = !useLineFlow;

  const btn = document.getElementById("btnFlujoLineas");

  if (useLineFlow) {
    // Cambiar estilo del botón
    btn.classList.add("active");
    btn.textContent = "Desactivar Flujo Líneas";

    // Extraer direcciones de las líneas si aún no se ha hecho
    if (lineDirections.length === 0) {
      if (!extractLineDirections(polylines)) {
        useLineFlow = false;
        console.error("No se pudieron extraer direcciones de líneas");
        alert(
          "Error: No se pudieron detectar líneas en el modelo. Asegúrate de mostrar las líneas primero."
        );
        // Restaurar el botón
        btn.classList.remove("active");
        btn.textContent = "Flujo por Líneas";
        return false;
      }
    }

    // Solo calcular el campo de flujo si no ha sido calculado previamente
    if (!flowFieldInitialized) {
      // Precalcular el campo de flujo simplificado
      if (setLoadingMessage) {
        setLoadingMessage("Calculando campo de flujo de alta resolución...");
      }

      // Iniciar cálculo en el próximo frame para permitir actualizar la UI
      setTimeout(() => {
        // Dividir el cálculo en bloques para evitar bloquear el navegador
        calculateFlowFieldWithProgress();
      }, 100);
    } else {
      console.log("Reutilizando campo de flujo previamente calculado");
    }

    console.log("Flujo por líneas activado");
  } else {
    // Restablecer botón
    btn.classList.remove("active");
    btn.textContent = "Flujo por Líneas";

    if (setLoadingMessage) {
      setLoadingMessage(null);
    }
    console.log("Flujo por líneas desactivado");
  }

  return useLineFlow;
}

// Calcular el campo de flujo con indicador de progreso
function calculateFlowFieldWithProgress() {
  isCalculatingFlowField = true;
  console.time("calculateFlowField");

  const { minX, minY, realWidth, realHeight, width, height } = heightFieldSize;

  // Reiniciar el campo con mayor resolución
  lineDirectionField = new Array(flowFieldResolution);
  for (let i = 0; i < flowFieldResolution; i++) {
    lineDirectionField[i] = new Array(flowFieldResolution);
    for (let j = 0; j < flowFieldResolution; j++) {
      lineDirectionField[i][j] = null;
    }
  }

  // Usar todas las líneas disponibles
  const usedLines = lineDirections;

  // Calcular en bloques más pequeños para evitar bloquear el navegador
  // con la mayor resolución
  let currentRow = 0;

  function processRows() {
    // Procesar un bloque más pequeño de filas debido a la mayor resolución
    const rowsPerBlock = Math.max(1, Math.floor(flowFieldResolution / 60)); // Ajustar según resolución
    const endRow = Math.min(currentRow + rowsPerBlock, flowFieldResolution);

    // Mostrar progreso
    const progress = Math.floor((currentRow / flowFieldResolution) * 100);
    if (setLoadingMessage) {
      setLoadingMessage(`Calculando campo de flujo: ${progress}%`);
    }

    // Primera fase para este bloque: cálculo de distancias
    for (let i = currentRow; i < endRow; i++) {
      for (let j = 0; j < flowFieldResolution; j++) {
        // Coordenadas del mundo para esta celda
        const worldX = minX + (i / (flowFieldResolution - 1)) * realWidth;
        const worldY = minY + (j / (flowFieldResolution - 1)) * realHeight;
        const worldPos = new THREE.Vector3(worldX, worldY, 0);

        // Encontrar la línea más cercana dentro del radio de influencia
        let closestLine = null;
        let minDistance = lineFlowInfluenceDistance;

        // Verificar todas las líneas disponibles
        for (let l = 0; l < usedLines.length; l++) {
          const line = usedLines[l];
          const distance = approximateDistanceToLine(
            worldPos,
            line.start,
            line.end
          );

          if (distance < minDistance) {
            minDistance = distance;
            closestLine = line;
          }
        }

        // Si encontramos una línea cercana, usar su dirección
        if (closestLine) {
          // Invertir la dirección para que el flujo vaya a lo largo de la línea
          const direction = closestLine.direction.clone().negate();

          // Usar intensidad base reforzada si está disponible
          const baseIntensity = closestLine.baseIntensity || 1.0;

          // Aplicar factor de intensidad basado en la distancia (curva más pronunciada)
          // Exponente mayor para una caída más abrupta con la distancia, manteniendo más fidelidad cerca de las líneas
          // Multiplicamos por la intensidad base para reforzar
          const intensity =
            Math.pow(1.0 - minDistance / lineFlowInfluenceDistance, 5) *
            baseIntensity;

          // Para líneas muy cercanas, reducir componentes adicionales para máxima fidelidad
          let perpScale = 0.05;
          if (minDistance < lineFlowInfluenceDistance * 0.15) {
            // Reducir componente perpendicular para mayor fidelidad muy cerca de las líneas
            perpScale = 0.01; // Reducido aún más
          }

          // Añadir componente perpendicular reducido para simular flujo natural
          const perpendicular = new THREE.Vector3(
            -direction.y,
            direction.x,
            0
          ).multiplyScalar(perpScale);

          // Añadir componente descendente para flujo hacia abajo (reducido para menos desviación vertical)
          const downComponent = new THREE.Vector3(0, 0, -0.15).multiplyScalar(
            intensity
          );

          // Aplicar todos los componentes - mayor factor para dominancia
          direction.multiplyScalar(intensity * 0.99); // Prácticamente sin mezcla con otros componentes
          direction.add(perpendicular);
          direction.add(downComponent);
          direction.normalize();

          // Guardar dirección e intensidad
          lineDirectionField[i][j] = {
            direction: direction,
            intensity: intensity,
            distance: minDistance,
            // Guardar una bandera para indicar que este es un vector de línea "puro"
            isPure: minDistance < lineFlowInfluenceDistance * 0.2,
          };
        }
      }
    }

    // Avanzar al siguiente bloque
    currentRow = endRow;

    // Si hemos terminado la primera fase, pasar a la segunda
    if (currentRow >= flowFieldResolution) {
      if (setLoadingMessage) {
        setLoadingMessage("Propagando influencia...");
      }
      // Propagar la influencia a celdas vacías
      setTimeout(propagateInfluence, 10);
    } else {
      // Continuar con el siguiente bloque
      setTimeout(processRows, 0);
    }
  }

  // Función para propagar la influencia a las celdas vacías
  function propagateInfluence() {
    // Crear una copia temporal del campo
    const tempField = new Array(flowFieldResolution);
    for (let i = 0; i < flowFieldResolution; i++) {
      tempField[i] = new Array(flowFieldResolution);
      for (let j = 0; j < flowFieldResolution; j++) {
        tempField[i][j] = lineDirectionField[i][j];
      }
    }

    // Propagación de la influencia con radio más pequeño para mayor detalle local
    const propagationRadius = 2; // Radio más pequeño para limitar la propagación excesiva
    let propagationCount = 0;

    for (let i = 0; i < flowFieldResolution; i++) {
      for (let j = 0; j < flowFieldResolution; j++) {
        if (!lineDirectionField[i][j]) {
          let sumDirection = new THREE.Vector3(0, 0, 0);
          let sumInfluence = 0;
          let count = 0;
          let minFoundDistance = Infinity;

          // Buscar en un radio para encontrar influencia
          for (let di = -propagationRadius; di <= propagationRadius; di++) {
            for (let dj = -propagationRadius; dj <= propagationRadius; dj++) {
              const ni = i + di;
              const nj = j + dj;

              if (
                ni >= 0 &&
                ni < flowFieldResolution &&
                nj >= 0 &&
                nj < flowFieldResolution
              ) {
                const neighbor = lineDirectionField[ni][nj];
                if (neighbor) {
                  const distance = Math.sqrt(di * di + dj * dj);

                  // Registrar la distancia más cercana encontrada
                  if (neighbor.distance < minFoundDistance) {
                    minFoundDistance = neighbor.distance;
                  }

                  // Caída más rápida con la distancia para limitar la propagación excesiva
                  const weight = 1.0 / (1.0 + distance * 1.2);

                  sumDirection.addScaledVector(neighbor.direction, weight);
                  sumInfluence += neighbor.intensity * weight;
                  count++;
                }
              }
            }
          }

          // Si hay influencia, aplicarla con más decaimiento en zonas alejadas
          if (count > 0) {
            sumDirection.normalize();

            // Reducir drásticamente la influencia más allá de cierta distancia
            // para evitar la propagación excesiva
            let distanceFactor = 1.0;
            if (minFoundDistance > lineFlowInfluenceDistance * 0.6) {
              // Reducción exponencial para distancias mayores
              distanceFactor = Math.pow(
                0.5,
                (minFoundDistance - lineFlowInfluenceDistance * 0.6) / 5
              );
            }

            const avgInfluence = (sumInfluence / count) * 0.7 * distanceFactor; // Menor transferencia global

            // Solo aplicar si la influencia es significativa
            if (avgInfluence > 0.05) {
              tempField[i][j] = {
                direction: sumDirection,
                intensity: avgInfluence,
                distance: minFoundDistance + propagationRadius, // Aumentamos la distancia registrada
              };

              propagationCount++;
            }
          }
        }
      }
    }

    // Actualizar el campo con los valores propagados
    lineDirectionField = tempField;

    // Pasar a la fase final: mezcla con normales del terreno
    if (setLoadingMessage) {
      setLoadingMessage("Finalizando cálculos...");
    }
    setTimeout(finalizeField, 10);
  }

  // Función para finalizar el campo
  function finalizeField() {
    // Mezclar con normales del terreno para transiciones suaves
    for (let i = 0; i < flowFieldResolution; i++) {
      for (let j = 0; j < flowFieldResolution; j++) {
        if (lineDirectionField[i][j]) {
          // Convertir a coordenadas del mundo
          const worldX = minX + (i / (flowFieldResolution - 1)) * realWidth;
          const worldY = minY + (j / (flowFieldResolution - 1)) * realHeight;

          // Convertir a índices de heightField
          const heightGridX = Math.floor(
            ((worldX - minX) / realWidth) * (width - 1)
          );
          const heightGridY = Math.floor(
            ((worldY - minY) / realHeight) * (height - 1)
          );

          // Obtener normal del terreno
          let terrainNormal = new THREE.Vector3(0, 0, 1);
          if (
            heightGridX >= 0 &&
            heightGridX < width &&
            heightGridY >= 0 &&
            heightGridY < height &&
            heightField[heightGridX] &&
            heightField[heightGridX][heightGridY]
          ) {
            terrainNormal =
              heightField[heightGridX][heightGridY].normal || terrainNormal;
          }

          // Vector del terreno (dirección de la pendiente)
          const terrainDirection = new THREE.Vector3(
            terrainNormal.x,
            terrainNormal.y,
            0
          ).normalize();

          // Calcular factor de mezcla basado en la distancia a la línea más cercana
          const cellData = lineDirectionField[i][j];
          let lineInfluence = 0;

          // Influencia completa cerca de las líneas, decae a cero en los bordes del radio de influencia
          if (
            cellData.isPure ||
            cellData.distance < lineFlowInfluenceDistance * 0.2
          ) {
            // Zona muy cercana: máxima fidelidad - influencia aún mayor (hasta 120%)
            lineInfluence = Math.min(1.2, cellData.intensity * 2.0);
          } else if (cellData.distance < lineFlowInfluenceDistance * 0.4) {
            // Zona cercana: alta influencia con menor decaimiento
            const t =
              (cellData.distance - lineFlowInfluenceDistance * 0.2) /
              (lineFlowInfluenceDistance * 0.2);
            lineInfluence = Math.min(1.0, cellData.intensity * (1.8 - t * 0.2));
          } else if (cellData.distance < lineFlowInfluenceDistance * 0.7) {
            // Zona intermedia: decaimiento más pronunciado pero aún significativo
            const t =
              (cellData.distance - lineFlowInfluenceDistance * 0.4) /
              (lineFlowInfluenceDistance * 0.3);
            lineInfluence = Math.min(0.9, cellData.intensity * (1.6 - t * 0.6));
          } else {
            // Zona lejana: influencia reducida pero aún presente
            lineInfluence = Math.min(0.3, cellData.intensity * 0.4);
          }

          // Asegurar una transición suave al terreno en áreas lejanas
          // Reducimos aún más la influencia del terreno para mayor dominancia de las líneas
          const terrainInfluence = 1.0 - lineInfluence * 0.95;

          // Para áreas muy alejadas, priorizar dirección del terreno
          const finalDirection = new THREE.Vector3();

          if (cellData.distance > lineFlowInfluenceDistance * 0.8) {
            // Zonas muy alejadas: prioridad a la pendiente natural
            finalDirection.addScaledVector(terrainDirection, 0.8);
            finalDirection.addScaledVector(cellData.direction, 0.2);
          } else {
            // Mezcla normal
            finalDirection.addScaledVector(cellData.direction, lineInfluence);
            finalDirection.addScaledVector(terrainDirection, terrainInfluence);
          }

          finalDirection.normalize();

          // Actualizar el campo
          cellData.direction = finalDirection;

          // Ajustar intensidad basado en distancia para efectos visuales
          // Intensidad alta cerca de líneas, decae con la distancia
          if (cellData.distance < lineFlowInfluenceDistance * 0.4) {
            cellData.intensity = Math.min(1.0, cellData.intensity);
          } else {
            // Reducción drástica de intensidad en zonas alejadas
            const distanceRatio =
              (cellData.distance - lineFlowInfluenceDistance * 0.4) /
              (lineFlowInfluenceDistance * 0.6);
            cellData.intensity = Math.max(
              0.05,
              cellData.intensity * (1.0 - Math.min(1.0, distanceRatio))
            );
          }
        }
      }
    }

    // Completar el proceso
    console.timeEnd("calculateFlowField");
    console.log(
      `Campo de flujo calculado con resolución ${flowFieldResolution}x${flowFieldResolution}`
    );
    flowFieldInitialized = true;
    isCalculatingFlowField = false;

    // Inicializar array de últimas direcciones conocidas
    lastLineFlowDirections = new Array(particleCount).fill(null);

    // Mostrar mensaje de finalización
    if (setLoadingMessage) {
      setLoadingMessage("¡Campo de flujo completado!");
    }
    setTimeout(() => {
      if (setLoadingMessage) {
        setLoadingMessage(null);
      }
    }, 2000);
  }

  // Iniciar el procesamiento por bloques
  processRows();
}

// Aproximación muy rápida de la distancia de un punto a una línea (evitando cálculos costosos)
function approximateDistanceToLine(point, lineStart, lineEnd) {
  // Calcular vectores simplificados (ignorando componente Z para mayor velocidad)
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lineLength = Math.sqrt(dx * dx + dy * dy);

  // Si la línea es muy corta, calcular distancia al punto inicial
  if (lineLength < 0.001) {
    const pdx = point.x - lineStart.x;
    const pdy = point.y - lineStart.y;
    return Math.sqrt(pdx * pdx + pdy * pdy);
  }

  // Vector normalizado de la línea
  const nx = dx / lineLength;
  const ny = dy / lineLength;

  // Vector desde el inicio de la línea hasta el punto
  const px = point.x - lineStart.x;
  const py = point.y - lineStart.y;

  // Proyección del punto sobre la línea (producto escalar)
  const projection = px * nx + py * ny;

  // Limitar la proyección al segmento
  const clampedProjection = Math.max(0, Math.min(projection, lineLength));

  // Punto más cercano en la línea
  const closestX = lineStart.x + nx * clampedProjection;
  const closestY = lineStart.y + ny * clampedProjection;

  // Distancia del punto al punto más cercano
  const distX = point.x - closestX;
  const distY = point.y - closestY;

  return Math.sqrt(distX * distX + distY * distY);
}

// Función mejorada para obtener la dirección de flujo desde el campo con interpolación
function getFlowDirectionFromField(position) {
  if (!lineDirectionField || !flowFieldInitialized) {
    return null;
  }

  const { minX, minY, realWidth, realHeight } = heightFieldSize;

  // Convertir posición del mundo a coordenadas del campo (con decimales)
  const fx = ((position.x - minX) / realWidth) * (flowFieldResolution - 1);
  const fy = ((position.y - minY) / realHeight) * (flowFieldResolution - 1);

  // Comprobar si estamos dentro de los límites del campo
  if (
    fx < 0 ||
    fx >= flowFieldResolution - 1 ||
    fy < 0 ||
    fy >= flowFieldResolution - 1
  ) {
    return null;
  }

  // Índices enteros para las cuatro celdas circundantes
  const i0 = Math.floor(fx);
  const j0 = Math.floor(fy);
  const i1 = Math.min(i0 + 1, flowFieldResolution - 1);
  const j1 = Math.min(j0 + 1, flowFieldResolution - 1);

  // Fracciones para interpolación bilineal
  const tx = fx - i0;
  const ty = fy - j0;

  // Obtener los valores de las cuatro celdas más cercanas
  const v00 = lineDirectionField[i0]?.[j0];
  const v10 = lineDirectionField[i1]?.[j0];
  const v01 = lineDirectionField[i0]?.[j1];
  const v11 = lineDirectionField[i1]?.[j1];

  // Si no hay dirección en ninguna celda cercana, devolver null
  if (!v00 && !v10 && !v01 && !v11) {
    return null;
  }

  // Interpolación bilineal para obtener dirección suavizada
  const direction = new THREE.Vector3();
  let totalWeight = 0;

  // Procesar cada esquina con su peso
  const corners = [
    { data: v00, weight: (1 - tx) * (1 - ty) },
    { data: v10, weight: tx * (1 - ty) },
    { data: v01, weight: (1 - tx) * ty },
    { data: v11, weight: tx * ty },
  ];

  for (const corner of corners) {
    if (corner.data && corner.data.direction) {
      // Usar la intensidad como factor adicional si está disponible
      const factorIntensity =
        corner.data.intensity !== undefined ? corner.data.intensity : 1.0;

      const effectiveWeight = corner.weight * factorIntensity;
      direction.addScaledVector(corner.data.direction, effectiveWeight);
      totalWeight += effectiveWeight;
    }
  }

  // Normalizar el vector resultante si tenemos influencia
  if (totalWeight > 0.001) {
    // Normalizar el peso si es necesario
    direction.multiplyScalar(1.0 / totalWeight);
    direction.normalize();
    return direction;
  }

  // Si no hay dirección válida, devolver null
  return null;
}

// Función para obtener información del campo de flujo en una posición específica
function getFlowFieldInfoAtPosition(position) {
  if (!lineDirectionField || !flowFieldInitialized) {
    return null;
  }

  const { minX, minY, realWidth, realHeight } = heightFieldSize;

  // Convertir posición del mundo a coordenadas del campo
  const fx = ((position.x - minX) / realWidth) * (flowFieldResolution - 1);
  const fy = ((position.y - minY) / realHeight) * (flowFieldResolution - 1);

  // Comprobar si estamos dentro de los límites del campo
  if (
    fx < 0 ||
    fx >= flowFieldResolution - 1 ||
    fy < 0 ||
    fy >= flowFieldResolution - 1
  ) {
    return null;
  }

  // Encontrar celdas circundantes y hacer interpolación bilineal
  const i0 = Math.floor(fx);
  const j0 = Math.floor(fy);
  const i1 = Math.min(i0 + 1, flowFieldResolution - 1);
  const j1 = Math.min(j0 + 1, flowFieldResolution - 1);

  // Fracciones para interpolación
  const tx = fx - i0;
  const ty = fy - j0;

  // Obtener valores de las cuatro esquinas
  const v00 = lineDirectionField[i0]?.[j0];
  const v10 = lineDirectionField[i1]?.[j0];
  const v01 = lineDirectionField[i0]?.[j1];
  const v11 = lineDirectionField[i1]?.[j1];

  // Si no hay información en ninguna celda cercana
  if (!v00 && !v10 && !v01 && !v11) {
    return null;
  }

  // Calcular valores interpolados
  let intensity = 0;
  let distance = lineFlowInfluenceDistance; // Valor predeterminado alto
  let count = 0;

  // Calcular intensidad y distancia promediada, ponderada por cercanía
  if (v00) {
    intensity += v00.intensity * (1 - tx) * (1 - ty);
    distance = Math.min(distance, v00.distance);
    count++;
  }

  if (v10) {
    intensity += v10.intensity * tx * (1 - ty);
    distance = Math.min(distance, v10.distance);
    count++;
  }

  if (v01) {
    intensity += v01.intensity * (1 - tx) * ty;
    distance = Math.min(distance, v01.distance);
    count++;
  }

  if (v11) {
    intensity += v11.intensity * tx * ty;
    distance = Math.min(distance, v11.distance);
    count++;
  }

  // Normalizar intensidad si es necesario
  if (count > 0) {
    intensity = intensity / count;
  }

  return {
    intensity: intensity,
    distance: distance,
  };
}

// Iniciar simulación directamente (sin toggle)
export function startWaterSimulation(currentMesh) {
  console.log("Iniciando simulación directamente...");

  // Si ya está activa, no hacer nada
  if (simulationActive) {
    console.log("La simulación ya está activa");
    return;
  }

  simulationActive = true;

  const btn = document.getElementById("btnSimulacion");
  btn.textContent = "Detener Simulación";
  btn.classList.add("active");

  if (setLoadingMessage) {
    setLoadingMessage("Iniciando simulación de agua...");
  }

  // Crear campo de altura si no existe
  if (heightField.length === 0) {
    if (!createHeightField(currentMesh)) {
      simulationActive = false;
      btn.textContent = "Iniciar Simulación";
      btn.classList.remove("active");
      if (setLoadingMessage) {
        setLoadingMessage("Error: No se pudo crear campo de altura");
      }
      return;
    }
  }

  // Crear sistema de partículas si no existe
  if (!particleSystem) {
    if (!createWaterParticles(currentMesh)) {
      simulationActive = false;
      btn.textContent = "Iniciar Simulación";
      btn.classList.remove("active");
      if (setLoadingMessage) {
        setLoadingMessage("Error: No se pudo crear sistema de partículas");
      }
      return;
    }
  } else {
    // Mostrar sistema existente
    particleSystem.visible = true;
    if (trailSystem) trailSystem.visible = true;
  }

  setTimeout(() => {
    if (setLoadingMessage) {
      setLoadingMessage(null);
    }
  }, 2000);
}

// Exportar variables globales para acceso exterior
export { particleCount, particleSystem, trailSystem, simulationActive };
