import type { ApiClient } from './client';
import { backendApi } from './backendApi';

/** Single entry point used by every screen. The app always talks to the real Supabase backend (no sample data). */
export const api: ApiClient = backendApi;
