import type {
  ProcessingRequest,
  ProcessingRequestSource,
  ProcessingRequestStatus,
  TerrainPoint,
} from "../types/types";

const STORAGE_KEY = "gravweb.processingRequest.v1";

const canUseSessionStorage = () =>
  typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";

export const createProcessingRequest = ({
  source,
  polygon,
  centroid,
  areaM2,
  status,
}: {
  source: ProcessingRequestSource;
  polygon: TerrainPoint[];
  centroid?: TerrainPoint;
  areaM2?: number;
  status?: ProcessingRequestStatus;
}): ProcessingRequest => ({
  id: `terrain-${Date.now()}`,
  source,
  createdAt: new Date().toISOString(),
  polygon,
  centroid,
  areaM2,
  status: status ?? "queued",
});

export const saveProcessingRequest = (request: ProcessingRequest) => {
  if (!canUseSessionStorage()) return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(request));
};

export const loadProcessingRequest = (): ProcessingRequest | null => {
  if (!canUseSessionStorage()) return null;

  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as ProcessingRequest;
    if (!Array.isArray(parsed.polygon) || !parsed.id || !parsed.source) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const clearProcessingRequest = () => {
  if (!canUseSessionStorage()) return;
  window.sessionStorage.removeItem(STORAGE_KEY);
};
