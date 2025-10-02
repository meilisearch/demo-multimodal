export interface SearchResult {
  id: string
  _rankingScore?: number
  [key: string]: unknown
}

export interface FacetValue {
  value: string
  count: number
}

export interface AdditionalField {
  id: string
  fieldName: string
  label?: string
}

export interface DisplayConfig {
  indexUid: string
  primaryText: string
  secondaryText?: string
  imageUrl?: string
  additionalFields?: AdditionalField[]
}

export interface FacetConfig {
  indexUid: string
  visibleFacets: string[]
  facetDisplayNames: Record<string, string>
  facetOrder: string[]
  rangeFilters: Record<string, boolean>
}

export interface SortConfig {
  indexUid: string
  visibleSorts: string[]
  sortDisplayNames: Record<string, string>
  sortOrder: string[]
  defaultSort?: string
}
