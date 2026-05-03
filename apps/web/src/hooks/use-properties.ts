'use client';

import { useApi } from './use-api';

export interface PropertyOption {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  type?: string;
  status?: string;
}

interface PropertiesResponse {
  properties: PropertyOption[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * GET /properties returns a paginated envelope `{ properties, total, page, pageSize }`,
 * not a raw array. This hook unwraps that for callers that just need the list
 * (e.g. dropdowns).
 */
export function useProperties(pageSize = 500) {
  const { data, loading, error, refetch } = useApi<PropertiesResponse>(
    `/properties?pageSize=${pageSize}`,
  );
  return {
    properties: data?.properties ?? [],
    total: data?.total ?? 0,
    loading,
    error,
    refetch,
  };
}
