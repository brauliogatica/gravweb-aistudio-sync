import { Coordinate } from "../../types/types";

export function calcularArea(poligono: Coordinate[]): number {
    let area = 0;
    for (let i = 0; i < poligono.length; i++) {
        const puntoActual = poligono[i];
        const puntoSiguiente = poligono[(i + 1) % poligono.length];
        area += (puntoActual.lat * puntoSiguiente.lng) - (puntoSiguiente.lat * puntoActual.lng);
    }
    if(area == 0){
        area = 0.00001;
    }
    return Math.abs(area / 2);
}

export function calcularCentroide(arrayPoligono: Coordinate[]): Coordinate {
    const poligono = arrayPoligono;
    let totalX = 0;
    let totalY = 0;
    let area = 0;

    for (let i = 0; i < poligono.length; i++) {
        const puntoActual = poligono[i];
        const puntoSiguiente = poligono[(i + 1) % poligono.length];
        const factor = (puntoActual.lat * puntoSiguiente.lng - puntoSiguiente.lat * puntoActual.lng);
        area += factor;
        totalX += (puntoActual.lat + puntoSiguiente.lat) * factor;
        totalY += (puntoActual.lng + puntoSiguiente.lng) * factor;
    }

    area = area / 2;

    if(area == 0){
        area = 0.00001;
    }

    const centroX = totalX / (6 * area);
    const centroY = totalY / (6 * area);

    return { lat: centroX, lng: centroY };
}
