import React, { useEffect, useState } from "react";
import ioReq from "../rhinoCompute/io_req.json";

const CHECK_URL = process.env.REACT_APP_RHINO_COMPUTE_URL + "/io";
const RHINO_COMPUTE_KEY = process.env.REACT_APP_RHINO_COMPUTE_KEY;
const INTERVAL_MS = 20000;

const CheckStatus: React.FC = () => {
    const [status, setStatus] = useState<null | boolean>(null);
    const ioReqContent = { ...ioReq.Content };

    const raw = JSON.stringify(ioReqContent);

    const myHeaders = new Headers();
    myHeaders.append("RhinoComputeKey", RHINO_COMPUTE_KEY as string);
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("ngrok-skip-browser-warning", "ngrok-skip");

    const requestOptions: RequestInit = {
        method: "POST",
        headers: myHeaders,
        body: raw,
        redirect: "follow",
    };

    const checkStatus = async () => {
        try {
            const response = await fetch(CHECK_URL);
            console.log("Estado del servicio:", response.status);
            if (!response.ok) {
                setStatus(false);
                return false;
            }
            setStatus(true);
            return true;
        } catch (error) {
            console.error("Error al verificar el estado del servicio:", error);
            setStatus(false);
            return false;
        }
    };

    useEffect(() => {
        checkStatus();
        const interval = setInterval(checkStatus, INTERVAL_MS);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="text-center" style={{ minWidth: 220 }}>
            {status === null && (
                <span className="text-secondary">
                    <i className="bi bi-arrow-repeat me-2"></i>Verificando servicio...
                </span>
            )}
            {status === true && (
                <span className="text-success">
                    <i className="bi bi-check-circle me-2"></i>Servicio disponible
                </span>
            )}
            {status === false && (
                <span className="text-danger">
                    <i className="bi bi-exclamation-triangle me-2"></i>Servicio no disponible
                </span>
            )}
        </div>
    );
};

export default CheckStatus;