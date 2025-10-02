import { SearchResult } from "@/types/search"

export function getFieldValue(
  result: SearchResult,
  fieldPath: string,
  isImageField = false
): string {
  if (!fieldPath) return ""

  let value: unknown = result
  const pathParts = fieldPath.split('.')

  for (const part of pathParts) {
    if (value === null || value === undefined) return ""

    if (part.includes('[') && part.includes(']')) {
      const fieldName = part.substring(0, part.indexOf('['))
      const indexMatch = part.match(/\[(\d+)\]/)
      const arrayIndex = indexMatch ? parseInt(indexMatch[1]) : 0

      value = (value as Record<string, unknown>)[fieldName]
      if (Array.isArray(value) && value.length > arrayIndex) {
        value = value[arrayIndex]
      } else {
        return ""
      }
    } else {
      value = (value as Record<string, unknown>)[part]
    }
  }

  if (value === null || value === undefined) return ""

  if (Array.isArray(value)) {
    if (isImageField) return value.length > 0 ? String(value[0]) : ""
    return value.map(item =>
      typeof item === 'object' ? JSON.stringify(item) : String(item)
    ).join(', ')
  }

  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>
    if (obj.amount !== undefined) return String(obj.amount)
    if (obj.value !== undefined) return String(obj.value)
    if (obj.price !== undefined) return String(obj.price)
    if (obj.cost !== undefined) return String(obj.cost)
    return JSON.stringify(value)
  }

  return String(value)
}

export function buildSearchFilters(
  selectedFacets: Record<string, string[]>,
  rangeFilters: Record<string, { min?: number; max?: number }>
): string[] {
  const facetFilters = Object.entries(selectedFacets)
    .filter(([, values]) => values.length > 0)
    .map(([key, values]) => values.map(value => `${key} = "${value}"`).join(" OR "))

  const rangeFilterQueries = Object.entries(rangeFilters)
    .filter(([, range]) => range.min !== undefined || range.max !== undefined)
    .map(([key, range]) => {
      const conditions = []
      if (range.min !== undefined) conditions.push(`${key} >= ${range.min}`)
      if (range.max !== undefined) conditions.push(`${key} <= ${range.max}`)
      return conditions.join(" AND ")
    })

  return [...facetFilters, ...rangeFilterQueries].filter(Boolean)
}
