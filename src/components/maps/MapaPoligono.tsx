// @ts-nocheck
import React, { useEffect, useRef, useState } from "react";
import "../../styles/layout.css";
import { calcularCentroide } from "../googleEarth/puntos";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { RootState } from "../../redux/store/store";
import { updateProject } from "../../redux/slices/projectSlice";
import JSZip from "jszip";
import ImportarDatos from "../manejarDatos/ImportarDatos";
import {
  createProcessingRequest,
  saveProcessingRequest,
} from "../../services/processingRequestService";

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? "";
const GOOGLE_MAPS_SCRIPT_ID = "gravweb-google-maps-js";
const DEFAULT_MAX_AREA_HECTARES = 100;
const MAX_AREA_HECTARES = Number(
  import.meta.env.VITE_MAX_AREA_HECTARES ?? DEFAULT_MAX_AREA_HECTARES
);
const MAX_AREA_M2 =
  (Number.isFinite(MAX_AREA_HECTARES)
    ? MAX_AREA_HECTARES
    : DEFAULT_MAX_AREA_HECTARES) * 10000;

interface MapaPoligonoProps {
  setActiveTab: (tab: string) => void;
}

const MapaPoligono: React.FC<MapaPoligonoProps> = ({ setActiveTab }) => {
  const navigate = useNavigate();
  const mapRef = useRef<any>(null);
  const boundsRef = useRef<any>(null);
  const pathsRef = useRef<any[]>([]);
  const isValidRef = useRef(false);
  const selectedPolygonRef = useRef<any>(null);

  const handleButtonProcesar = () => {
    setActiveTab("herramienta3");
    navigate("/particles");
  };

  // const { updateProject, project } = useProject();

  const project = useSelector((state: RootState) => state.project);
  const dispatch = useDispatch();
  const [miniaturaPoligono, setMiniaturaPoligono] = useState("");
  const [, setPolygonPaths] = useState<any[]>([]);
  var map;
  var Paths = new Array();
  var bounds = null;
  var infoArea = null;
  function Generator() { }
  const maxArea = Number.isFinite(MAX_AREA_M2)
    ? MAX_AREA_M2
    : DEFAULT_MAX_AREA_HECTARES * 10000;
  const [areaTerrenoM2, setAreaTerrenoM2] = useState(null);
  var isValid = false;

  const extractPolygonCoordinates = (polygon: any) => {
    if (!polygon?.getPath) return [];
    return polygon
      .getPath()
      .getArray()
      .map((point: any) => ({ lat: point.lat(), lng: point.lng() }));
  };

  const syncSelectedPolygon = () => {
    const polygon = selectedPolygonRef.current;
    if (!polygon || !window.google?.maps?.geometry) {
      return pathsRef.current[0] ?? Paths[0] ?? [];
    }

    const coordinates = extractPolygonCoordinates(polygon);
    const area = window.google.maps.geometry.spherical.computeArea(
      polygon.getPath()
    );
    const valid = area <= maxArea;

    sessionStorage.setItem("areaSelec", String(area));
    isValid = valid;
    isValidRef.current = valid;
    Paths = [coordinates];
    pathsRef.current = Paths;
    setPolygonPaths([coordinates]);
    polygon.setOptions({
      fillColor: valid ? "#BCDCF9" : "#fb0000",
      strokeColor: valid ? "#57ACF9" : "#fb0000",
    });

    return coordinates;
  };

  const centroInicio = { lat: -36.418858, lng: -72.51649 };
  const coordenadasPrueba = [
    { lat: -36.414751, lng: -72.511329 },
    { lat: -36.415254, lng: -72.512766 },
    { lat: -36.415266, lng: -72.514048 },
    { lat: -36.41583, lng: -72.515521 },
    { lat: -36.415858, lng: -72.516124 },
    { lat: -36.416431, lng: -72.518011 },
    { lat: -36.416573, lng: -72.51895 },
    { lat: -36.416403, lng: -72.519597 },
    { lat: -36.416389, lng: -72.521145 },
    { lat: -36.418564, lng: -72.521567 },
    { lat: -36.420214, lng: -72.521722 },
    { lat: -36.421316, lng: -72.520872 },
    { lat: -36.422568, lng: -72.519273 },
    { lat: -36.422834, lng: -72.517201 },
    { lat: -36.420746, lng: -72.512437 },
    { lat: -36.418379, lng: -72.511805 },
    { lat: -36.417377, lng: -72.511321 },
    { lat: -36.414751, lng: -72.511329 },
  ];

  useEffect(() => {
    if (!MAPS_API_KEY) {
      return;
    }

    let cancelled = false;

    // Define initMap en el contexto global
    (window as any).initMap = async () => {
      if (cancelled) return;

      if (window.google?.maps?.importLibrary) {
        const [mapsLibrary] = await Promise.all([
          window.google.maps.importLibrary("maps"),
          window.google.maps.importLibrary("drawing"),
          window.google.maps.importLibrary("places"),
          window.google.maps.importLibrary("geometry"),
        ]);
        if (mapsLibrary?.Map) {
          window.google.maps.Map = mapsLibrary.Map;
        }
        if (mapsLibrary?.InfoWindow) {
          window.google.maps.InfoWindow = mapsLibrary.InfoWindow;
        }
        if (mapsLibrary?.LatLngBounds) {
          window.google.maps.LatLngBounds = mapsLibrary.LatLngBounds;
        }
        if (cancelled) return;
      }

      if (typeof window.google?.maps?.Map !== "function") {
        console.error("Google Maps no cargo la libreria maps.");
        return;
      }

      Paths = [];
      pathsRef.current = [];
      isValid = false;
      isValidRef.current = false;
      selectedPolygonRef.current = null;

      // Inicializa el mapa aquí
      map = new google.maps.Map(document.getElementById("map") as HTMLElement, {
        center: centroInicio,
        zoom: 12,
        mapTypeId: "satellite",
        zoomControl: true,
        mapTypeControl: true,
        mapTypeControlOptions: {
          mapTypeIds: ["roadmap", "satellite", "terrain", "hybrid"],
        },
        scaleControl: true,
        streetViewControl: false,
        rotateControl: false,
        fullscreenControl: false,
        gestureHandling: "greedy",
      });
      mapRef.current = map;
      bounds = new window.google.maps.LatLngBounds();
      boundsRef.current = bounds;
      // Create the initial InfoWindow.
      let infoWindow = new window.google.maps.InfoWindow({
        content: "Comience a dibujar su polígono",
        position: centroInicio,
      });

      infoWindow.open(map);
      // Configure the click listener.
      map.addListener("click", (mapsMouseEvent) => {
        // Close the current InfoWindow.
        infoWindow.close();
        // Create a new InfoWindow.
        infoWindow = new window.google.maps.InfoWindow({
          position: mapsMouseEvent.latLng,
        });
        infoWindow.setContent(
          JSON.stringify(mapsMouseEvent.latLng.toJSON(), null, 2)
        );
        infoWindow.open(map);

        // El poligono procesable se captura desde DrawingManager.
        // No guardamos clicks sueltos para evitar procesar solo un punto.
      });

      //Enviar polígono para su procesamiento
      const buttonSend = document.createElement("div");
      AddButton(
        buttonSend,
        "Click para procesar el polígono",
        'Procesar el terreno <i class="bi bi-cloud-upload-fill fa-2x"></i>',
        () => {
          const coordinates = syncSelectedPolygon();

          if (isValidRef.current && coordinates?.length >= 3) {
            console.log("Procesando poligono", coordinates);

            // Se procesan las coordenadas del polígono
            procesarCoordenadas(coordinates);

          } else if (!coordinates?.length) {
            alert("Selecciona un poligono antes de procesar el terreno");
          } else {
            alert(`El poligono debe ser menor o igual a ${m2ToHa(maxArea)} hectareas`);
          }
        },
        map
      );

      // const buttonMesh = document.createElement("div");
      // AddButton(
      //   buttonMesh,
      //   "Click para mostrar la malla",
      //   '<i class="bi bi-hash fa-2x"></i>',
      //   () => {
      //     var data = JSON.stringify({ id: "@(ViewBag.id)" });
      //     window.$.ajax({
      //       type: "POST",
      //       data: data,
      //       url: "/Home/getMesh",
      //       contentType: "application/json; charset=utf-8",
      //     }).done(function (data) {
      //       console.log(data);
      //       console.log(
      //         window.jQuery.isEmptyObject(window.jQuery.parseJSON(data))
      //       );
      //       if (!window.jQuery.isEmptyObject(window.jQuery.parseJSON(data))) {
      //         var jsonData = window.jQuery.parseJSON(data);
      //         const polygonCoords = jsonData.polygons[0];
      //         // Construct the polygon.
      //         const polygon = new window.google.maps.Polygon({
      //           paths: polygonCoords,
      //           strokeColor: "#FF0000",
      //           strokeOpacity: 0.8,
      //           strokeWeight: 2,
      //           fillColor: "#FF0000",
      //           fillOpacity: 0.35,
      //         });
      //         polygon.setMap(map);

      //         if (jsonData.lines.length > 0 && jsonData.lines[0].length > 0) {
      //           jsonData.lines.forEach((lines) =>
      //             lines.forEach((line) => {
      //               //console.log(line.pointStart.lat)
      //               var line = new window.google.maps.Polyline({
      //                 path: [
      //                   {
      //                     lat: line.pointStart.lat,
      //                     lng: line.pointStart.lng,
      //                   },
      //                   {
      //                     lat: line.pointEnd.lat,
      //                     lng: line.pointEnd.lng,
      //                   },
      //                 ],
      //                 //geodesic: line.geodesic
      //                 geodesic: true,
      //                 strokeColor: line.strokeColor,
      //                 strokeOpacity: line.strokeOpacity,
      //                 strokeWeight: line.strokeWeight,
      //               });
      //               line.setMap(map);

      //               for (let i = 0; i < jsonData.polygons.length; i++) {
      //                 for (let j = 0; j < jsonData.polygons[i].length; j++) {
      //                   bounds.extend(
      //                     new window.google.maps.LatLng(
      //                       jsonData.polygons[i][j].lat,
      //                       jsonData.polygons[i][j].lng
      //                     )
      //                   );
      //                 }
      //               }

      //               map.fitBounds(bounds);
      //             })
      //           );
      //         } else {
      //           alert(
      //             "No se ha terminado de procesar la malla, vuelva a intentarlo más tarde."
      //           );
      //         }
      //       } else {
      //         alert("Primero debe enviar el polígono creado.");
      //       }
      //     });
      //   },
      //   map
      // );

      // const buttonMeshEj = document.createElement("div");
      // AddButton(
      //   buttonMeshEj,
      //   "Click para mostrar la malla de ejemplo",
      //   '<i class="bi bi-hash fa-2x"><sub>ej:<sub></i>',
      //   () => {
      //     var data = JSON.stringify({ id: "1637034373219" });
      //     window.$.ajax({
      //       type: "POST",
      //       data: data,
      //       url: "/Home/getMesh",
      //       contentType: "application/json; charset=utf-8",
      //     }).done(function (data) {
      //       //console.log(data);
      //       var jsonData = window.jQuery.parseJSON(data);
      //       const polygonCoords = jsonData.polygons[0];
      //       // Construct the polygon.
      //       const polygon = new window.google.maps.Polygon({
      //         paths: polygonCoords,
      //         strokeColor: "#FF0000",
      //         strokeOpacity: 0.8,
      //         strokeWeight: 2,
      //         fillColor: "#FF0000",
      //         fillOpacity: 0.35,
      //       });
      //       polygon.setMap(map);

      //       jsonData.lines.forEach((lines) =>
      //         lines.forEach((line) => {
      //           //console.log(line.pointStart.lat)
      //           var line = new window.google.maps.Polyline({
      //             path: [
      //               {
      //                 lat: line.pointStart.lat,
      //                 lng: line.pointStart.lng,
      //               },
      //               {
      //                 lat: line.pointEnd.lat,
      //                 lng: line.pointEnd.lng,
      //               },
      //             ],
      //             //geodesic: line.geodesic
      //             geodesic: true,
      //             strokeColor: line.strokeColor,
      //             strokeOpacity: line.strokeOpacity,
      //             strokeWeight: line.strokeWeight,
      //           });
      //           line.setMap(map);

      //           for (let i = 0; i < jsonData.polygons.length; i++) {
      //             for (let j = 0; j < jsonData.polygons[i].length; j++) {
      //               bounds.extend(
      //                 new window.google.maps.LatLng(
      //                   jsonData.polygons[i][j].lat,
      //                   jsonData.polygons[i][j].lng
      //                 )
      //               );
      //             }
      //           }

      //           // The Center of the Bermuda Triangle - (25.3939245, -72.473816)
      //           //console.log(bounds.getCenter());

      //           map.fitBounds(bounds);
      //         })
      //       );
      //     });

      //     window.$.ajax({
      //       type: "POST",
      //       data: data,
      //       url: "/Home/getReport",
      //       contentType: "application/json; charset=utf-8",
      //     }).done(function (data) {
      //       window.$("#container").html(data);
      //     });
      //   },
      //   map
      // );

      // const buttonDataLocal = document.createElement("div");
      // AddButton(
      //   buttonDataLocal,
      //   "Click para abrir el menú",
      //   '<i class="bi bi-menu-up fa-2x"></i>',
      //   () => {
      //     window.$("#menuModal").modal("show");
      //   },
      //   map
      // );

      map.controls[window.google.maps.ControlPosition.TOP_LEFT].push(
        buttonSend
      );
      // map.controls[window.google.maps.ControlPosition.TOP_LEFT].push(
      //   buttonMesh
      // );
      // map.controls[window.google.maps.ControlPosition.TOP_LEFT].push(
      //   buttonMeshEj
      // );
      //map.controls[window.google.maps.ControlPosition.LEFT_CENTER].push(buttonDataLocal);

      const drawingManager = new window.google.maps.drawing.DrawingManager({
        drawingMode: window.google.maps.drawing.OverlayType.POLYGON,
        drawingControl: true,
        drawingControlOptions: {
          position: window.google.maps.ControlPosition.BOTTOM_CENTER,

          drawingModes: [
            //window.google.maps.drawing.OverlayType.MARKER,
            //window.google.maps.drawing.OverlayType.CIRCLE,
            window.google.maps.drawing.OverlayType.POLYGON,
            //window.google.maps.drawing.OverlayType.POLYLINE,
            //window.google.maps.drawing.OverlayType.RECTANGLE,
          ],
        },
        markerOptions: {
          icon: "https://developers.google.com/maps/documentation/javascript/examples/full/images/beachflag.png",
        },
        polygonOptions: {
          fillColor: "#BCDCF9",
          strokeColor: "#57ACF9",
          fillOpacity: 0.5,
          strokeWeight: 2,
          clickable: true,
          editable: true,
          draggable: true,
          zIndex: 1,
        },
      });

      window.google.maps.event.addListener(
        drawingManager,
        "overlaycomplete",
        function (event) {
          /*if (event.type == 'circle') {
                    var radius = event.overlay.getRadius();
                    console.log(radius);
                }*/
          //console.log(Paths.length);
          if (event.type == "polygon" && Paths.length < 1) {
            var _polygon = event.overlay.getPaths();
            var path = new Array();
            _polygon.forEach((p) =>
              p.forEach((i) => {
                var p = new Object();
                p.lat = i.lat();
                p.lng = i.lng();
                path.push(p);
              })
            );
            selectedPolygonRef.current = event.overlay;
            Paths = [path];
            pathsRef.current = Paths;
            setPolygonPaths([path]);

            //console.log(window.google.maps.geometry.spherical.computeArea(event.overlay.getPath()));
            var area = window.google.maps.geometry.spherical.computeArea(
              event.overlay.getPath()
            );
            sessionStorage.setItem("areaSelec", area);
            if (area > maxArea) {
              isValid = false;
              isValidRef.current = false;
              event.overlay.setOptions({
                fillColor: "#fb0000",
                strokeColor: "#fb0000",
              });
            } else {
              isValid = true;
              isValidRef.current = true;
              event.overlay.setOptions({
                fillColor: "#BCDCF9",
                strokeColor: "#57ACF9",
              });
            }
            event.overlay.getPaths().forEach(function (path, index) {
              path.addListener("set_at", syncSelectedPolygon);
              path.addListener("insert_at", syncSelectedPolygon);
              path.addListener("remove_at", syncSelectedPolygon);
            });
            event.overlay.addListener("dragend", syncSelectedPolygon);
          } else {
            event.overlay.setMap(null);
          }
        }
      );

      drawingManager.setMap(map);

      setTimeout(() => {
        const input = document.getElementById("pac-input") as HTMLInputElement;
        const activeMap = mapRef.current;
        if (input && activeMap && window.google?.maps?.places) {
          const autocomplete = new window.google.maps.places.Autocomplete(input, {
            types: [],
          });
          autocomplete.bindTo("bounds", activeMap);

          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            if (!place.geometry || !place.geometry.location) return;

            activeMap.panTo(place.geometry.location);
            activeMap.setZoom(14);

            new window.google.maps.Marker({
              map: activeMap,
              position: place.geometry.location,
            });
          });
        }
      }, 0);
    };

    // Cargar el script de Google Maps
    const startMap = () => {
      void (window as any).initMap?.();
    };
    const existingScript = document.getElementById(
      GOOGLE_MAPS_SCRIPT_ID
    ) as HTMLScriptElement | null;

    if (window.google?.maps?.importLibrary) {
      startMap();
    } else if (existingScript) {
      existingScript.addEventListener("load", startMap, { once: true });
    } else {
      const script = document.createElement("script");
      script.id = GOOGLE_MAPS_SCRIPT_ID;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&libraries=drawing,places,geometry&v=weekly&loading=async`;
      script.async = true;
      script.defer = true;
      script.onload = startMap;
      script.onerror = () => {
        console.error("No se pudo cargar Google Maps. Revisa VITE_GOOGLE_MAPS_API_KEY.");
      };
      document.head.appendChild(script);
    }

    return () => {
      // Limpia la función global al desmontar el componente
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    Generator.prototype.rand = Math.floor(Math.random() * 26) + Date.now();

    Generator.prototype.getId = function () {
      return this.rand++;
    };

    var idGen = new Generator();
    let id = idGen.getId();

    // This example requires the Drawing library. Include the libraries=drawing
    // parameter when you first load the API. For example:
    // function initMap() {
    //   map = new window.google.maps.Map(document.getElementById("map"), {
    //     center: centroInicio,
    //     zoom: 12,
    //     mapTypeId: "satellite",
    //     zoomControl: true,
    //     mapTypeControl: true,
    //     mapTypeControlOptions: {
    //       style: window.google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
    //       mapTypeIds: [
    //         window.google.maps.MapTypeId.ROADMAP,
    //         window.google.maps.MapTypeId.SATELLITE,
    //         window.google.maps.MapTypeId.TERRAIN,
    //         window.google.maps.MapTypeId.HYBRID,
    //       ],
    //     },
    //     scaleControl: true,
    //     streetViewControl: false,
    //     rotateControl: false,
    //     fullscreenControl: false,
    //     gestureHandling: "greedy",
    //   });
    //   bounds = new window.google.maps.LatLngBounds();
    //   // Create the initial InfoWindow.
    //   let infoWindow = new window.google.maps.InfoWindow({
    //     content: "Comience a dibujar su polígono",
    //     position: centroInicio,
    //   });

    //   infoWindow.open(map);
    //   // Configure the click listener.
    //   map.addListener("click", (mapsMouseEvent) => {
    //     // Close the current InfoWindow.
    //     infoWindow.close();
    //     // Create a new InfoWindow.
    //     infoWindow = new window.google.maps.InfoWindow({
    //       position: mapsMouseEvent.latLng,
    //     });
    //     infoWindow.setContent(
    //       JSON.stringify(mapsMouseEvent.latLng.toJSON(), null, 2)
    //     );
    //     infoWindow.open(map);

    //     const punto = mapsMouseEvent.latLng.toJSON();
    //     Paths.push(punto);

    //     // Actualizar el estado con los nuevos Paths
    //     setPolygonPaths([...Paths]);
    //   });

    //   //Enviar polígono para su procesamiento
    //   const buttonSend = document.createElement("div");
    //   AddButton(
    //     buttonSend,
    //     "Click para procesar el polígono",
    //     'Procesar el terreno <i class="bi bi-cloud-upload-fill fa-2x"></i>',
    //     () => {
    //       if (isValid) {
    //         console.log(Paths);
    //         var jsonData = Paths;
    //         var fileName = "coordenadas" + Date.now();
    //         // Convertir el objeto JSON en una cadena JSON
    //         const jsonStr = JSON.stringify(jsonData, null, 2);

    //         // Crear un Blob a partir de la cadena JSON
    //         const blob = new Blob([jsonStr], { type: "application/json" });

    //         // Crear un enlace <a> para descargar el archivo
    //         const url = URL.createObjectURL(blob);
    //         const link = document.createElement("a");
    //         link.href = url;
    //         link.download = fileName || "data.json";

    //         // Simular un clic en el enlace para iniciar la descarga
    //         document.body.appendChild(link);
    //         // link.click();

    //         // Limpiar el enlace y liberar el objeto URL
    //         document.body.removeChild(link);
    //         URL.revokeObjectURL(url);

    //         const pathsEncoded = encodeURIComponent(jsonStr);
    //         // coordinates.s = Paths;
    //         sessionStorage.setItem("coordenadas", JSON.stringify(Paths[0]));
    //         const centroide = calcularCentroide(Paths[0]);
    //         sessionStorage.setItem("centroide", JSON.stringify(centroide));

    //         const areaSelec = sessionStorage.getItem("areaSelec");
    //         const areaDecimales = parseFloat(areaSelec || "0").toFixed(2);

    //         // dispatch(updateProject({ key: "coordinates", value: Paths[0] }));

    //         // updateProject("coordinates", sessionStorage.getItem("coordenadas"));
    //         // updateProject("coordinatesCenter", centroide);

    //         alert(
    //           "Tamaño del área: " +
    //           areaDecimales +
    //           "m2\nCoordenadas: " +
    //           sessionStorage.getItem("coordenadas") +
    //           "\nCentroide: " +
    //           sessionStorage.getItem("centroide")
    //         );

    //         // PoligonoInfoModal.openModal()

    //         // window.$('#poligonoInfoModal').modal('show')

    //         /*var d = new Object();
    //                 d.Paths = Paths;
    //                 d.id = id;
    //                 window.$.ajax({
    //                     type: "POST",
    //                     data: JSON.stringify(d),
    //                     url: "/Home/PathsProcess",
    //                     contentType: 'application/json; charset=utf-8'
    //                 }).done(function (data) {
    //                     for (i = 0; i < Paths.length; i++) {
    //                         for (j = 0; j < Paths[i].length; j++) {
    //                             bounds.extend(new window.google.maps.LatLng(Paths[i][j].lat, Paths[i][j].lng));
    //                         }
    //                     }
    //                     map.fitBounds(bounds);
    //                     window.$("#container").html(data);
    //                 });*/
    //       } else {
    //         alert("El polígono debe ser menor o igual a " + maxArea + "m2");
    //       }
    //     },
    //     map
    //   );

    //   const buttonMesh = document.createElement("div");
    //   AddButton(
    //     buttonMesh,
    //     "Click para mostrar la malla",
    //     '<i class="bi bi-hash fa-2x"></i>',
    //     () => {
    //       var data = JSON.stringify({ id: "@(ViewBag.id)" });
    //       window.$.ajax({
    //         type: "POST",
    //         data: data,
    //         url: "/Home/getMesh",
    //         contentType: "application/json; charset=utf-8",
    //       }).done(function (data) {
    //         console.log(data);
    //         console.log(
    //           window.jQuery.isEmptyObject(window.jQuery.parseJSON(data))
    //         );
    //         if (!window.jQuery.isEmptyObject(window.jQuery.parseJSON(data))) {
    //           var jsonData = window.jQuery.parseJSON(data);
    //           const polygonCoords = jsonData.polygons[0];
    //           // Construct the polygon.
    //           const polygon = new window.google.maps.Polygon({
    //             paths: polygonCoords,
    //             strokeColor: "#FF0000",
    //             strokeOpacity: 0.8,
    //             strokeWeight: 2,
    //             fillColor: "#FF0000",
    //             fillOpacity: 0.35,
    //           });
    //           polygon.setMap(map);

    //           if (jsonData.lines.length > 0 && jsonData.lines[0].length > 0) {
    //             jsonData.lines.forEach((lines) =>
    //               lines.forEach((line) => {
    //                 //console.log(line.pointStart.lat)
    //                 var line = new window.google.maps.Polyline({
    //                   path: [
    //                     {
    //                       lat: line.pointStart.lat,
    //                       lng: line.pointStart.lng,
    //                     },
    //                     {
    //                       lat: line.pointEnd.lat,
    //                       lng: line.pointEnd.lng,
    //                     },
    //                   ],
    //                   //geodesic: line.geodesic
    //                   geodesic: true,
    //                   strokeColor: line.strokeColor,
    //                   strokeOpacity: line.strokeOpacity,
    //                   strokeWeight: line.strokeWeight,
    //                 });
    //                 line.setMap(map);

    //                 for (let i = 0; i < jsonData.polygons.length; i++) {
    //                   for (let j = 0; j < jsonData.polygons[i].length; j++) {
    //                     bounds.extend(
    //                       new window.google.maps.LatLng(
    //                         jsonData.polygons[i][j].lat,
    //                         jsonData.polygons[i][j].lng
    //                       )
    //                     );
    //                   }
    //                 }

    //                 map.fitBounds(bounds);
    //               })
    //             );
    //           } else {
    //             alert(
    //               "No se ha terminado de procesar la malla, vuelva a intentarlo más tarde."
    //             );
    //           }
    //         } else {
    //           alert("Primero debe enviar el polígono creado.");
    //         }
    //       });
    //     },
    //     map
    //   );

    //   const buttonMeshEj = document.createElement("div");
    //   AddButton(
    //     buttonMeshEj,
    //     "Click para mostrar la malla de ejemplo",
    //     '<i class="bi bi-hash fa-2x"><sub>ej:<sub></i>',
    //     () => {
    //       var data = JSON.stringify({ id: "1637034373219" });
    //       window.$.ajax({
    //         type: "POST",
    //         data: data,
    //         url: "/Home/getMesh",
    //         contentType: "application/json; charset=utf-8",
    //       }).done(function (data) {
    //         //console.log(data);
    //         var jsonData = window.jQuery.parseJSON(data);
    //         const polygonCoords = jsonData.polygons[0];
    //         // Construct the polygon.
    //         const polygon = new window.google.maps.Polygon({
    //           paths: polygonCoords,
    //           strokeColor: "#FF0000",
    //           strokeOpacity: 0.8,
    //           strokeWeight: 2,
    //           fillColor: "#FF0000",
    //           fillOpacity: 0.35,
    //         });
    //         polygon.setMap(map);

    //         jsonData.lines.forEach((lines) =>
    //           lines.forEach((line) => {
    //             //console.log(line.pointStart.lat)
    //             var line = new window.google.maps.Polyline({
    //               path: [
    //                 {
    //                   lat: line.pointStart.lat,
    //                   lng: line.pointStart.lng,
    //                 },
    //                 {
    //                   lat: line.pointEnd.lat,
    //                   lng: line.pointEnd.lng,
    //                 },
    //               ],
    //               //geodesic: line.geodesic
    //               geodesic: true,
    //               strokeColor: line.strokeColor,
    //               strokeOpacity: line.strokeOpacity,
    //               strokeWeight: line.strokeWeight,
    //             });
    //             line.setMap(map);

    //             for (let i = 0; i < jsonData.polygons.length; i++) {
    //               for (let j = 0; j < jsonData.polygons[i].length; j++) {
    //                 bounds.extend(
    //                   new window.google.maps.LatLng(
    //                     jsonData.polygons[i][j].lat,
    //                     jsonData.polygons[i][j].lng
    //                   )
    //                 );
    //               }
    //             }

    //             // The Center of the Bermuda Triangle - (25.3939245, -72.473816)
    //             //console.log(bounds.getCenter());

    //             map.fitBounds(bounds);
    //           })
    //         );
    //       });

    //       window.$.ajax({
    //         type: "POST",
    //         data: data,
    //         url: "/Home/getReport",
    //         contentType: "application/json; charset=utf-8",
    //       }).done(function (data) {
    //         window.$("#container").html(data);
    //       });
    //     },
    //     map
    //   );

    //   const buttonDataLocal = document.createElement("div");
    //   AddButton(
    //     buttonDataLocal,
    //     "Click para abrir el menú",
    //     '<i class="bi bi-menu-up fa-2x"></i>',
    //     () => {
    //       window.$("#menuModal").modal("show");
    //     },
    //     map
    //   );

    //   map.controls[window.google.maps.ControlPosition.TOP_LEFT].push(
    //     buttonSend
    //   );
    //   map.controls[window.google.maps.ControlPosition.TOP_LEFT].push(
    //     buttonMesh
    //   );
    //   map.controls[window.google.maps.ControlPosition.TOP_LEFT].push(
    //     buttonMeshEj
    //   );
    //   //map.controls[window.google.maps.ControlPosition.LEFT_CENTER].push(buttonDataLocal);

    //   const drawingManager = new window.google.maps.drawing.DrawingManager({
    //     drawingMode: window.google.maps.drawing.OverlayType.POLYGON,
    //     drawingControl: true,
    //     drawingControlOptions: {
    //       position: window.google.maps.ControlPosition.BOTTOM_CENTER,

    //       drawingModes: [
    //         //window.google.maps.drawing.OverlayType.MARKER,
    //         //window.google.maps.drawing.OverlayType.CIRCLE,
    //         window.google.maps.drawing.OverlayType.POLYGON,
    //         //window.google.maps.drawing.OverlayType.POLYLINE,
    //         //window.google.maps.drawing.OverlayType.RECTANGLE,
    //       ],
    //     },
    //     markerOptions: {
    //       icon: "https://developers.google.com/maps/documentation/javascript/examples/full/images/beachflag.png",
    //     },
    //     polygonOptions: {
    //       fillColor: "#BCDCF9",
    //       strokeColor: "#57ACF9",
    //       fillOpacity: 0.5,
    //       strokeWeight: 2,
    //       clickable: true,
    //       editable: true,
    //       draggable: true,
    //       zIndex: 1,
    //     },
    //   });

    //   window.google.maps.event.addListener(
    //     drawingManager,
    //     "overlaycomplete",
    //     function (event) {
    //       /*if (event.type == 'circle') {
    //                 var radius = event.overlay.getRadius();
    //                 console.log(radius);
    //             }*/
    //       //console.log(Paths.length);
    //       if (event.type == "polygon" && Paths.length < 1) {
    //         var _polygon = event.overlay.getPaths();
    //         var path = new Array();
    //         _polygon.forEach((p) =>
    //           p.forEach((i) => {
    //             var p = new Object();
    //             p.lat = i.lat();
    //             p.lng = i.lng();
    //             path.push(p);
    //           })
    //         );
    //         Paths.push(path);

    //         //console.log(window.google.maps.geometry.spherical.computeArea(event.overlay.getPath()));
    //         var area = window.google.maps.geometry.spherical.computeArea(
    //           event.overlay.getPath()
    //         );
    //         sessionStorage.setItem("areaSelec", area);
    //         if (area > maxArea) {
    //           isValid = false;
    //           event.overlay.setOptions({
    //             fillColor: "##fb0000",
    //             strokeColor: "#fb0000",
    //           });
    //         } else {
    //           isValid = true;
    //           event.overlay.setOptions({
    //             fillColor: "#BCDCF9",
    //             strokeColor: "#57ACF9",
    //           });
    //         }
    //         event.overlay.getPaths().forEach(function (path, index) {
    //           path.addListener("set_at", function () {
    //             var _area = window.google.maps.geometry.spherical.computeArea(
    //               event.overlay.getPath()
    //             );
    //             sessionStorage.setItem("areaSelec", _area);
    //             if (_area > maxArea) {
    //               isValid = false;
    //               event.overlay.setOptions({
    //                 fillColor: "##fb0000",
    //                 strokeColor: "#fb0000",
    //               });
    //             } else {
    //               isValid = true;
    //               event.overlay.setOptions({
    //                 fillColor: "#BCDCF9",
    //                 strokeColor: "#57ACF9",
    //               });
    //             }
    //           });
    //         });
    //       } else {
    //         event.overlay.setMap(null);
    //       }
    //     }
    //   );

    //   drawingManager.setMap(map);
    // }

    // window.initMap = initMap;
  }, []);

  const usarPoligonoPrueba = () => {
    let coordenadas = [
      { lat: -36.414751, lng: -72.511329 },
      { lat: -36.415254, lng: -72.512766 },
      { lat: -36.415266, lng: -72.514048 },
      { lat: -36.41583, lng: -72.515521 },
      { lat: -36.415858, lng: -72.516124 },
      { lat: -36.416431, lng: -72.518011 },
      { lat: -36.416573, lng: -72.51895 },
      { lat: -36.416403, lng: -72.519597 },
      { lat: -36.416389, lng: -72.521145 },
      { lat: -36.418564, lng: -72.521567 },
      { lat: -36.420214, lng: -72.521722 },
      { lat: -36.421316, lng: -72.520872 },
      { lat: -36.422568, lng: -72.519273 },
      { lat: -36.422834, lng: -72.517201 },
      { lat: -36.420746, lng: -72.512437 },
      { lat: -36.418379, lng: -72.511805 },
      { lat: -36.417377, lng: -72.511321 },
      { lat: -36.414751, lng: -72.511329 }, // Cierra el polígono
    ];

    const activeMap = mapRef.current;

    if (!MAPS_API_KEY || !window.google || !activeMap) {
      sessionStorage.setItem("areaSelec", "12400000");
      procesarCoordenadas(coordenadas, "demo-polygon", "demo-ready");
      return;
    }

    let polygon = new google.maps.Polygon({
      paths: coordenadas,
      fillColor: "#BCDCF9",
      strokeColor: "#57ACF9",
      fillOpacity: 0.5,
      strokeWeight: 2,
      clickable: true,
      editable: true,
      draggable: true,
    });

    polygon.setMap(activeMap);

    const demoBounds = new google.maps.LatLngBounds();
    boundsRef.current = demoBounds;

    for (let i = 0; i < coordenadas.length; i++) {
      let latLng = new google.maps.LatLng(
        coordenadas[i].lat,
        coordenadas[i].lng
      );
      demoBounds.extend(latLng);
    }

    isValid = true;
    isValidRef.current = true;
    selectedPolygonRef.current = polygon;
    pathsRef.current = [coordenadas];
    activeMap.fitBounds(demoBounds);

    let area = window.google.maps.geometry.spherical.computeArea(
      polygon.getPath()
    );

    sessionStorage.setItem("areaSelec", area);

    // Simula el flujo normal de procesamiento
    sessionStorage.setItem("coordenadas", JSON.stringify(coordenadas));
    const centroide = calcularCentroide(coordenadas);
    sessionStorage.setItem("centroide", JSON.stringify(centroide));

    const areaSelec = sessionStorage.getItem("areaSelec");
    const areaDecimales = parseFloat(areaSelec || "0").toFixed(2);

    // Si quieres, puedes llamar a generarMiniatura aquí:
    generarMiniatura([coordenadas]);
    persistProcessingRequest(coordenadas, "demo-polygon", "demo-ready");

    // Y actualizar el proyecto en redux:
    dispatch(updateProject({ key: "coordinates", value: coordenadas }));
    dispatch(updateProject({ key: "coordinatesCenter", value: centroide }));

    alert(
      "Tamaño del área: " +
      m2ToHa(parseFloat(areaDecimales)) +
      " hectáreas\nCoordenadas: " +
      sessionStorage.getItem("coordenadas") +
      "\nCentroide: " +
      sessionStorage.getItem("centroide")
    );

    handleButtonProcesar();
  };

  const AddButton = (controlDiv, title, innerHTML, fn, map) => {
    // Set CSS for the control border.
    const controlUI = document.createElement("div");
    controlUI.style.backgroundColor = "#fff";
    controlUI.style.border = "2px solid #fff";
    controlUI.style.borderRadius = "3px";
    controlUI.style.boxShadow = "0 2px 6px rgba(0,0,0,.3)";
    controlUI.style.cursor = "pointer";
    controlUI.style.marginTop = "10px";
    controlUI.style.marginBottom = "22px";
    controlUI.style.marginRight = "10px";
    controlUI.style.textAlign = "center";
    controlUI.title = title;
    controlDiv.appendChild(controlUI);
    // Set CSS for the control interioViewBag.
    const controlText = document.createElement("div");
    controlText.style.color = "rgb(25,25,25)";
    controlText.style.fontFamily = "Roboto,Arial,sans-serif";
    controlText.style.fontSize = "16px";
    controlText.style.lineHeight = "28px";
    controlText.style.paddingLeft = "2px";
    controlText.style.paddingRight = "2px";
    controlText.innerHTML = innerHTML;
    controlUI.appendChild(controlText);
    // Setup the click event listeners: simply set the map to Chicago.
    controlUI.addEventListener("click", fn);
  };

  const generarMiniatura = (coordenadas: any) => {
    if (!MAPS_API_KEY) {
      dispatch(updateProject({ key: "thumbnail", value: "" }));
      return "";
    }

    console.log("Polígono válido, generando miniatura...");
    console.log(coordenadas);
    let miniatura;

    if (!coordenadas || coordenadas.length === 0) return "";

    let coords = coordenadas;

    const first = coords[0];
    const last = coords[coords.length - 1];
    if (first.lat !== last.lat || first.lng !== last.lng) {
      coords.push(first);
    }
    const pathCoords = coords.map(p => `${p.lat},${p.lng}`).join("|");
    miniatura = (`https://maps.googleapis.com/maps/api/staticmap?size=400x300&maptype=satellite&path=color:0x57ACF9FF|weight:2|${pathCoords}&key=${MAPS_API_KEY}`);
    setMiniaturaPoligono(miniatura);
    dispatch(updateProject({ key: "thumbnail", value: miniatura }));
  }

  const m2ToHa = (m2: number) => {
    return (m2 / 10000).toFixed(2);
  }

  const persistProcessingRequest = (
    coordenadas: any[],
    source = "manual-polygon",
    status = "queued"
  ) => {
    const centroid = calcularCentroide(coordenadas);
    const rawArea = Number(sessionStorage.getItem("areaSelec") || "0");
    const areaM2 = Number.isFinite(rawArea) && rawArea > 0 ? rawArea : undefined;
    const request = createProcessingRequest({
      source,
      polygon: coordenadas.map(({ lat, lng }) => ({ lat, lng })),
      centroid,
      areaM2,
      status,
    });
    saveProcessingRequest(request);
    return request;
  };

  function generateKmlFromPolygon(coordinates: any[]) {
    const coordsString = coordinates.map(c => `${c.lng},${c.lat},0`).join(' ');
    return `<?xml version="1.0" encoding="UTF-8"?>
  <kml xmlns="http://www.opengis.net/kml/2.2">
    <Document>
      <Placemark>
        <Polygon>
          <outerBoundaryIs>
            <LinearRing>
              <coordinates>
                ${coordsString}
              </coordinates>
            </LinearRing>
          </outerBoundaryIs>
        </Polygon>
      </Placemark>
    </Document>
  </kml>`;
  }

  async function exportKmz(coordinates: any[]) {
    const kml = generateKmlFromPolygon(coordinates);
    const zip = new JSZip();
    zip.file("doc.kml", kml);
    const kmzBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(kmzBlob);

    // Descargar el archivo
    const a = document.createElement("a");
    a.href = url;
    a.download = "poligono.kmz";
    a.click();
    URL.revokeObjectURL(url);
  }

  const procesarCoordenadas = (
    coordenadas: any,
    source = "manual-polygon",
    status = "queued"
  ) => {
    sessionStorage.setItem("coordenadas", JSON.stringify(coordenadas));
    const centroide = calcularCentroide(coordenadas);
    sessionStorage.setItem("centroide", JSON.stringify(centroide));

    const areaSelec = sessionStorage.getItem("areaSelec");
    const areaDecimales = parseFloat(areaSelec || "0").toFixed(2);

    persistProcessingRequest(coordenadas, source, status);

    dispatch(updateProject({ key: "coordinates", value: coordenadas }));
    dispatch(updateProject({ key: "coordinatesCenter", value: centroide }));

    alert(
      "Tamaño del área: " +
      m2ToHa(parseFloat(areaDecimales)) +
      " hectáreas\nCoordenadas: " +
      sessionStorage.getItem("coordenadas") +
      "\nCentroide: " +
      sessionStorage.getItem("centroide")
    );

    generarMiniatura(coordenadas);
    // exportKmz(coordenadas);
    handleButtonProcesar();
  }

  if (!MAPS_API_KEY) {
    return (
      <div className="divMap map-local-mode">
        <ImportarDatos procesarCoordenadas={procesarCoordenadas} />
        <button className="btn btn-primary" onClick={usarPoligonoPrueba}>
          Usar coordenadas de prueba
        </button>
        <input
          id="pac-input"
          className="form-control"
          type="text"
          placeholder="Buscar ciudad o localidad..."
        />
        <div className="local-map-toolbar" aria-label="Controles de mapa">
          <button className="map-toggle">Mapa</button>
          <button className="map-toggle active">Satélite</button>
          <button className="map-process-button" onClick={usarPoligonoPrueba}>
            Procesar el terreno <i className="bi bi-cloud-upload-fill"></i>
          </button>
        </div>
        <div className="local-map-canvas" role="img" aria-label="Mapa local de terreno de prueba">
          <div className="local-map-grid"></div>
          <svg className="local-map-polygon" viewBox="0 0 420 260" aria-hidden="true">
            <polygon points="120,78 330,44 336,186 124,220" />
            <circle cx="120" cy="78" r="7" />
            <circle cx="330" cy="44" r="7" />
            <circle cx="336" cy="186" r="7" />
            <circle cx="124" cy="220" r="7" />
          </svg>
          <div className="local-map-tip">
            <button type="button" aria-label="Cerrar">×</button>
            Comience a dibujar su polígono
          </div>
          <div className="local-map-name">Cordillera de Nahuelbuta</div>
        </div>
      </div>
    );
  }

  return (
    <div className="divMap">
      <ImportarDatos procesarCoordenadas={procesarCoordenadas} />
      {/* <div>
        <button className="btn btn-primary" onClick={generarMiniatura}>Generar miniatura</button>
        <img
          src={miniaturaPoligono}
          alt="Miniatura polígono"
          onLoad={() => console.log("Miniatura cargada")}
          onError={() => console.log("Error al cargar la miniatura")}
        />
      </div> */}
      <button className="btn btn-primary" onClick={usarPoligonoPrueba}>
        Usar coordenadas de prueba
      </button>
      <input
        id="pac-input"
        className="form-control"
        type="text"
        placeholder="Buscar ciudad o localidad..."
      // style={{
      //   position: "absolute",
      //   top: 20,
      //   left: 20,
      //   zIndex: 10,
      //   width: 300,
      //   maxWidth: "80%",
      // }}
      />
      {/* <button className="btn btn-primary disabled">
        Ir a Diseño Hidrológico
      </button> */}
      <div id="map" style={{ width: "100%", height: "100vh" }}></div>
      {/* <ButtonModal></ButtonModal>
      <SearchForm></SearchForm> */}

      {/* <VistaModelo3D coordinates={polygonPaths} /> */}
    </div>
  );
};

export default MapaPoligono;
