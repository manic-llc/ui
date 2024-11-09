type DataType = 'json' | 'blob';

const API_ROOT = `${import.meta.env.VITE_API}/api`;

export const ROUTES: any[] = [];

export type Route = (typeof ROUTES)[number];

const DEFAULT_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

export async function get(path: Route, type: DataType = 'json', headers: Record<string, unknown> = {}) {
  return fetch(`${API_ROOT}/${path}`, {
    method: 'GET',
    headers: {
      ...DEFAULT_HEADERS,
      ...headers,
    },
  }).then(res => (type === 'json' ? res.json() : res.blob()));
}

export async function post(path: Route, data: object = {}, headers: Record<string, unknown> = {}) {
  return fetch(`${API_ROOT}/${path}`, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      ...DEFAULT_HEADERS,
      ...headers,
    },
  }).then(res => res.json());
}

export async function postFile(path: Route, body: any) {
  return fetch(`${API_ROOT}/${path}`, {
    method: 'POST',
    body,
  }).then(res => res.json());
}

export async function put(path: Route, data: object = {}, headers: Record<string, unknown> = {}) {
  return fetch(`${API_ROOT}/${path}`, {
    method: 'PUT',
    body: JSON.stringify(data),
    headers: {
      ...DEFAULT_HEADERS,
      ...headers,
    },
  }).then(res => res.json());
}

export async function del(path: Route, data: object = {}, headers: Record<string, unknown> = {}) {
  return fetch(`${API_ROOT}/${path}`, {
    method: 'DELETE',
    headers: {
      ...DEFAULT_HEADERS,
      ...headers,
    },
  }).then(res => res.json());
}

type HeaderHelpers = {
  get: () => Record<string, unknown>;
  set?: (key: string, value: unknown) => void;
};

export function createNamespacedAPI(namespace: string, helpers: { headers: HeaderHelpers; refresh: () => unknown }) {
  const base = `${namespace}`;

  const methods: any = {
    async get(path: string, type: DataType = 'json') {
      try {
        const response = await fetch(`${base}/${path}`, {
          method: 'GET',
          headers: {
            ...DEFAULT_HEADERS,
            ...helpers?.headers?.get?.(),
          },
        }).then(res => (type === 'json' ? res.json() : res.blob()));

        if (response?.error?.status === 401 && (await helpers.refresh())) return methods.get(path, type);
        return response;
      } catch (e: any) {
        if (e?.error?.status === 401 && (await helpers.refresh())) return methods.get(path, type);
      }
    },

    async post(path: string, data: object) {
      try {
        const response = await fetch(`${base}/${path}`, {
          method: 'POST',
          body: JSON.stringify(data),
          headers: {
            ...DEFAULT_HEADERS,
            ...helpers?.headers?.get?.(),
          },
        }).then(res => res.json());

        if (response?.error?.status === 401 && (await helpers.refresh())) return methods.post(path, data);
        return response;
      } catch (e: any) {
        if (e?.error?.status === 401 && (await helpers.refresh())) return methods.post(path, data);
      }
    },

    async put(path: string, data: object = {}) {
      try {
        const response = await fetch(`${base}/${path}`, {
          method: 'PUT',
          body: JSON.stringify(data),
          headers: {
            ...DEFAULT_HEADERS,
            ...helpers?.headers?.get?.(),
          },
        }).then(res => res.json());
        if (response?.error?.status === 401 && (await helpers.refresh())) return methods.put(path, data);
        return response;
      } catch (e: any) {
        if (e?.error?.status === 401 && (await helpers.refresh())) return methods.put(path, data);
      }
    },
  };

  return methods;
}
