import JSZip from "jszip";
import React from "react";

const ImportarDatos: React.FC<{ procesarCoordenadas: (coords: any) => void }> = ({ procesarCoordenadas }) => {
    const extensionesPermitidas = [".kml", ".kmz"];
    const [fileImported, setFileImported] = React.useState<File | null>(null);
    const [fileText, setFileText] = React.useState<string | null>(null);

    const extractCoordinates = (kmlText: string): string[] => {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(kmlText, "text/xml");
        // Busca todos los Placemark
        const placemarks = xmlDoc.getElementsByTagName("Placemark");
        let coords: string[] = [];
        let foundPolygon = false;

        for (let i = 0; i < placemarks.length; i++) {
            // Busca si este Placemark tiene un Polygon
            const polygon = placemarks[i].getElementsByTagName("Polygon")[0];
            if (polygon) {
                foundPolygon = true;
                // Extrae las coordenadas solo de este polígono
                const coordinatesElements = polygon.getElementsByTagName("coordinates");
                for (let j = 0; j < coordinatesElements.length; j++) {
                    const text = coordinatesElements[j].textContent?.trim();
                    if (text) {
                        coords = coords.concat(
                            text.split(/\s+/).filter(Boolean)
                        );
                    }
                }
            }
        }

        if (!foundPolygon) {
            alert("El archivo no contiene ningún polígono.");
        }
        return coords;
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const ext = file.name.split('.').pop()?.toLowerCase();

        setFileImported(file);

        let kmlText = "";
        switch (ext) {
            case "kmz":
                const arrayBuffer = await file.arrayBuffer();
                const zip = await JSZip.loadAsync(arrayBuffer);
                const kmlFile = zip.file(/\.kml$/i)[0];
                if (kmlFile) {
                    kmlText = await kmlFile.async("text");
                } else {
                    alert("El archivo KMZ no contiene un archivo KML.");
                    return;
                }
                break;
            case "kml":
                kmlText = await file.text();
                break;
            default:
                alert("Solo se permiten archivos " + extensionesPermitidas.join(", ") + ".");
                return;
        }

        setFileText(kmlText);
        const coords = extractCoordinates(kmlText);
        if (coords.length === 0) {
            alert("No se encontraron coordenadas en el archivo KML.");
            return;
        }
        console.log("Coordenadas extraídas:", coords);

        // setFileText(coords.join("\n"));
        let coordenadasTest = coords.join("\n");
        const parsedCoords = parseKmlCoordinates(coordenadasTest);

        setFileText(JSON.stringify(parsedCoords, null, 2));
        procesarCoordenadas(parsedCoords);
    };

    function parseKmlCoordinates(coordString: string) {
        // Separa por espacios y filtra vacíos
        return coordString
            .trim()
            .split(/\s+/)
            .map(pair => {
                const [lng, lat, z] = pair.split(",").map(Number);
                return { lat, lng };
            });
    }

    return (
        <div className="mb-3">
            <input className="form-control" type="file" id="inputFile" accept={extensionesPermitidas.join(", ")} onChange={handleFileChange} />
            {fileText && (
                <pre className="card overflow-auto" style={{ maxHeight: '200px' }}>{fileText}</pre>
            )}

        </div>
    );
};

export default ImportarDatos;