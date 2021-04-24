
interface PaginationData {
    totalCount: number
    totalPages: number
    firstPage: number
    lastPage: number
    page: number
}

export interface PaginationQuery {
    pageNumber: number
    pageSize: number
}

export interface PaginatedResponse<T> {
    items: T[]
    paginationData: PaginationData
}