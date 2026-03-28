export interface ApiResponse<T> {
  data: T
  message: string
  success: boolean
}

export interface PaginationMeta {
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
  message: string
  success: boolean
}

export interface ApiErrorResponse {
  message: string
  success: false
  errorCode?: string
}
