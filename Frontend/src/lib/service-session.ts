const API_BASE = (import.meta.env.VITE_BACKEND_URL || "http://localhost:8000").replace(/\/$/, "");
const FRONTEND_INSTANCE_URL = "/__loadmind_frontend_instance";
const STORAGE_KEY = "loadmind.serviceInstances.v1";
const SERVICE_CHECK_TIMEOUT_MS = 1200;

type ServiceInstances = {
  backend?: string;
  frontend?: string;
};

type BackendHealth = {
  instance_id?: string;
};

type FrontendInstance = {
  instanceId?: string;
};

export async function didServiceRestart(): Promise<boolean> {
  const stored = readStoredInstances();
  const current = await fetchCurrentInstances();
  const changed =
    Boolean(current.backend && stored.backend && current.backend !== stored.backend) ||
    Boolean(current.frontend && stored.frontend && current.frontend !== stored.frontend);

  if (current.backend || current.frontend) {
    writeStoredInstances({ ...stored, ...current });
  }

  return changed;
}

async function fetchCurrentInstances(): Promise<ServiceInstances> {
  const [backend, frontend] = await Promise.all([fetchBackendInstance(), fetchFrontendInstance()]);
  return { backend, frontend };
}

async function fetchBackendInstance(): Promise<string | undefined> {
  const body = await fetchJsonWithTimeout<BackendHealth>(`${API_BASE}/health`);
  return body?.instance_id || undefined;
}

async function fetchFrontendInstance(): Promise<string | undefined> {
  const configuredInstance = import.meta.env.VITE_FRONTEND_INSTANCE_ID;

  const body = await fetchJsonWithTimeout<FrontendInstance>(FRONTEND_INSTANCE_URL);
  return body?.instanceId || configuredInstance || undefined;
}

async function fetchJsonWithTimeout<T>(url: string): Promise<T | null> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), SERVICE_CHECK_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

function readStoredInstances(): ServiceInstances {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}") as ServiceInstances;
  } catch {
    return {};
  }
}

function writeStoredInstances(instances: ServiceInstances) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(instances));
}
