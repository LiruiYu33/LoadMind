const API_BASE = (import.meta.env.VITE_BACKEND_URL || "http://localhost:8000").replace(/\/$/, "");
const FRONTEND_INSTANCE_URL = "/__loadmind_frontend_instance";
const STORAGE_KEY = "loadmind.serviceInstances.v1";

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
  try {
    const response = await fetch(`${API_BASE}/health`, { cache: "no-store" });
    if (!response.ok) return undefined;
    const body = (await response.json()) as BackendHealth;
    return body.instance_id || undefined;
  } catch {
    return undefined;
  }
}

async function fetchFrontendInstance(): Promise<string | undefined> {
  const configuredInstance = import.meta.env.VITE_FRONTEND_INSTANCE_ID;

  try {
    const response = await fetch(FRONTEND_INSTANCE_URL, { cache: "no-store" });
    if (!response.ok) return configuredInstance || undefined;
    const body = (await response.json()) as FrontendInstance;
    return body.instanceId || configuredInstance || undefined;
  } catch {
    return configuredInstance || undefined;
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
