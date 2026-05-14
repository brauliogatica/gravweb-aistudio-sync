import React, { useEffect, useState } from "react";
import { checkRhinoComputeHealth } from "../../services/rhinoComputeService";

const INTERVAL_MS = 20000;

const CheckStatus: React.FC = () => {
  const [status, setStatus] = useState<
    "checking" | "available" | "unavailable" | "not-configured"
  >("checking");

  const checkStatus = async () => {
    const health = await checkRhinoComputeHealth();
    console.log("Estado de Rhino Compute:", health);
    setStatus(
      health.status === "not-configured"
        ? "not-configured"
        : health.available
          ? "available"
          : "unavailable"
    );
    return health.available;
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-center" style={{ minWidth: 220 }}>
      {status === "checking" && (
        <span className="text-secondary">
          <i className="bi bi-arrow-repeat me-2"></i>Verificando servicio...
        </span>
      )}
      {status === "available" && (
        <span className="text-success">
          <i className="bi bi-check-circle me-2"></i>Servicio disponible
        </span>
      )}
      {status === "not-configured" && (
        <span className="text-secondary">
          <i className="bi bi-dash-circle me-2"></i>Rhino no configurado
        </span>
      )}
      {status === "unavailable" && (
        <span className="text-danger">
          <i className="bi bi-exclamation-triangle me-2"></i>Servicio no disponible
        </span>
      )}
    </div>
  );
};

export default CheckStatus;
