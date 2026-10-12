import type { ApiClient } from './client';
import { mockApi } from './mockApi';
import { backendApi } from './backendApi';

/** Single entry point used by every screen. Swap the backend via VITE_USE_MOCK. */
export const api: ApiClient = import.meta.env.VITE_USE_MOCK === 'false' ? backendApi : mockApi;
