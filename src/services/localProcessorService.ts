import type {
  LocalProcessorHealth,
  LocalProcessorResponse,
  ProcessingRequest,
} from "../types/types";

export const getLocalProcessorUrl = () => {
  const rawUrl = process.env.REACT_APP_LOCAL_PROCESSOR_URL ?? "";
  return rawUrl.trim().replace(/\/+$/, "");
};

export const hasLocalProcessor = () => getLocalProcessorUrl().length > 0;

export const checkLocalProcessorHealth =
  async (): Promise<LocalProcessorHealth> => {
    const baseUrl = getLocalProcessorUrl();

    if (!baseUrl) {
      return {
        available: false,
        status: "not-configured",
        message: "Local processor URL is not configured.",
      };
    }

    try {
      const response = await fetch(`${baseUrl}/health`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        return {
          available: false,
          status: String(response.status),
          message: "Local processor health check failed.",
        };
      }

      const payload = (await response.json().catch(() => ({}))) as {
        status?: string;
        message?: string;
      };

      return {
        available: true,
        status: payload.status ?? "available",
        message: payload.message,
      };
    } catch (error) {
      return {
        available: false,
        status: "unreachable",
        message:
          error instanceof Error
            ? error.message
            : "Local processor is unreachable.",
      };
    }
  };

export const submitProcessingRequest = async (
  request: ProcessingRequest
): Promise<LocalProcessorResponse> => {
  const baseUrl = getLocalProcessorUrl();

  if (!baseUrl) {
    return {
      ok: false,
      message: "Local processor URL is not configured.",
    };
  }

  try {
    const response = await fetch(`${baseUrl}/process-terrain`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(request),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      jobId?: string;
      message?: string;
    };

    if (!response.ok) {
      return {
        ok: false,
        message: payload.message ?? "Local processor rejected the request.",
      };
    }

    return {
      ok: true,
      jobId: payload.jobId,
      message: payload.message,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Local processor request failed.",
    };
  }
};
