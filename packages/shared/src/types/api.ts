export interface ApiResponse<T> {
  data: T;
  meta: {
    requestId: string;
  };
}

export interface ApiListResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    requestId: string;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Array<{
      field: string;
      message: string;
    }>;
  };
  meta: {
    requestId: string;
  };
}
