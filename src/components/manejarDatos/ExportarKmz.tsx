import React from "react";
import JSZip from "jszip";

interface ExportarKmzProps {
  json: any;
  filename?: string;
  label?: string;
}

// Convierte array de puntos a string KML (long,lat,z)
function coordsToKmlString(coordsArr: any[]) {
  // y = longitud, x = latitud
  return coordsArr
    .map((c) => `${c.y},${c.x},${c.z ?? 0}`)
    .join(" ");
}

function generateKmlFromJson(json: any) {
  const proyecto = json.Proyectos[0]["1.0"] || json.Proyectos[0]["1"];
  const poligonoCoords = proyecto.poligono.map((p: any) => p.coordenates);
  const lineas = proyecto.lineas || [];

  let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <name>Polígono</name>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              ${coordsToKmlString(poligonoCoords)}
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
`;

  lineas.forEach((linea: any, idx: number) => {
    const points = linea.points.map((p: any) => p.coordenates);
    kml += `
    <Placemark>
      <name>Ruta ${idx + 1}</name>
      <LineString>
        <coordinates>
          ${coordsToKmlString(points)}
        </coordinates>
      </LineString>
    </Placemark>
    `;
  });

  kml += `
  </Document>
</kml>`;
  return kml;
}

const ExportarKmz: React.FC<ExportarKmzProps> = ({
  json,
  filename = "ruta_y_poligono.kmz",
  label = "Exportar KMZ",
}) => {
  const handleExport = async () => {
    const kml = generateKmlFromJson(json);
    const zip = new JSZip();
    zip.file("doc.kml", kml);
    const kmzBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(kmzBlob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button className="btn btn-primary" onClick={handleExport}>
      {label}
    </button>
  );
};

export default ExportarKmz;