"use client"

import * as React from "react"
import { MeiliSearch } from "meilisearch"
import { Search, ChevronDown, ChevronUp, ArrowUpDown, Star, Image, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"

interface SearchResult {
  id: string
  _rankingScore?: number
  [key: string]: unknown
}

interface FacetValue {
  value: string
  count: number
}


interface AdditionalField {
  id: string
  fieldName: string
  label?: string
}

interface DisplayConfig {
  indexUid: string
  primaryText: string
  secondaryText?: string
  imageUrl?: string
  additionalFields?: AdditionalField[]
}

interface FacetConfig {
  indexUid: string
  visibleFacets: string[]
  facetDisplayNames: Record<string, string> // facetKey -> display name
  facetOrder: string[] // ordered list of facet keys
  rangeFilters: Record<string, boolean> // facetKey -> whether to use range filter instead of discrete values
}

interface SortConfig {
  indexUid: string
  visibleSorts: string[]
  sortDisplayNames: Record<string, string> // sortKey -> display name
  sortOrder: string[] // ordered list of sort keys
  defaultSort?: string // default sort option
}






interface SearchInterfaceProps {
  meilisearchUrl?: string
  apiKey?: string
}

export function SearchInterface({
  meilisearchUrl = process.env.NEXT_PUBLIC_MEILISEARCH_URL || "http://localhost:7700",
  apiKey = process.env.NEXT_PUBLIC_MEILISEARCH_READ_API_KEY || "",
}: SearchInterfaceProps) {
  const [client] = React.useState(() => new MeiliSearch({ host: meilisearchUrl, apiKey }))
  const [selectedIndex] = React.useState(process.env.NEXT_PUBLIC_DEFAULT_INDEX || "")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [semanticRatio, setSemanticRatio] = React.useState(0.5)
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [facets, setFacets] = React.useState<Record<string, FacetValue[]>>({})
  const [selectedFacets, setSelectedFacets] = React.useState<Record<string, string[]>>({})
  const [rangeFilters, setRangeFilters] = React.useState<Record<string, { min?: number; max?: number }>>({})
  const [expandedFacets, setExpandedFacets] = React.useState<Record<string, boolean>>({})
  const [facetSearchQueries, setFacetSearchQueries] = React.useState<Record<string, string>>({})
  const [facetSearchResults, setFacetSearchResults] = React.useState<Record<string, FacetValue[]>>({})
  const [loading, setLoading] = React.useState(false)
  const [isInitialLoad, setIsInitialLoad] = React.useState(true)
  const [hasMore, setHasMore] = React.useState(false)
  const [loadingMore, setLoadingMore] = React.useState(false)
  const [showSuggestions, setShowSuggestions] = React.useState(false)
  const [uploadedImage, setUploadedImage] = React.useState<File | null>(null)
  const [imagePreview, setImagePreview] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Example queries for suggestions
  const exampleQueries = [
    "bag with a heart in the center",
    "retro sneakers",
    "warm clothes for a ski trip"
  ]

  // Fixed configurations for the products_2 index
  const [displayConfigs] = React.useState<Record<string, DisplayConfig>>({
    products_multimodal: {
      indexUid: 'products_multimodal',
      primaryText: 'name',
      secondaryText: 'brand',
      imageUrl: 'image_url',
      additionalFields: [
        { id: 'price-field', fieldName: 'price', label: 'Price' },
        { id: 'reviews-field', fieldName: 'reviews', label: 'Reviews' }
      ]
    }
  })
  const [facetConfigs] = React.useState<Record<string, FacetConfig>>({
    products_multimodal: {
      indexUid: 'products_multimodal',
      visibleFacets: ['color.original_name', 'category_page_id', 'brand'],
      facetDisplayNames: {
        'color.original_name': 'Color',
        'category_page_id': 'Category',
        'brand': 'Brand'
      },
      facetOrder: ['color.original_name', 'category_page_id', 'brand'],
      rangeFilters: {}
    }
  })
  const [sortConfigs] = React.useState<Record<string, SortConfig>>({
    products_multimodal: {
      indexUid: 'products_multimodal',
      visibleSorts: ['price.value:asc', 'price.value:desc', 'reviews.bayesian_avg:desc', 'reviews.bayesian_avg:asc'],
      sortDisplayNames: {
        'price.value:asc': 'Price: Low to High',
        'price.value:desc': 'Price: High to Low',
        'reviews.bayesian_avg:desc': 'Rating: Highest First',
        'reviews.bayesian_avg:asc': 'Rating: Lowest First'
      },
      sortOrder: ['reviews.bayesian_avg:desc', 'reviews.bayesian_avg:asc', 'price.value:asc', 'price.value:desc'],
      defaultSort: 'relevance'
    }
  })
  const [currentSort, setCurrentSort] = React.useState<string>("relevance")

  // Removed merchandising-related searchParams - now only using basic search functionality

  // Set default current sort from sort config
  React.useEffect(() => {
    const currentSortConfig = sortConfigs[selectedIndex]
    if (currentSortConfig?.defaultSort) {
      setCurrentSort(currentSortConfig.defaultSort)
    }
  }, [selectedIndex, sortConfigs])



  // Render star rating component
  const renderStars = (rating: number, count?: number) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 !== 0

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
        )
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <Star key={i} className="h-4 w-4 fill-yellow-400/50 text-yellow-400" />
        )
      } else {
        stars.push(
          <Star key={i} className="h-4 w-4 text-gray-300" />
        )
      }
    }

    return (
      <div className="flex items-center gap-1">
        <div className="flex">{stars}</div>
        <span className="text-sm font-medium">{rating.toFixed(2)}</span>
        {count && <span className="text-xs text-muted-foreground">({count})</span>}
      </div>
    )
  }

  // Get field value from result, supporting nested paths and complex types
  const getFieldValue = (result: SearchResult, fieldPath: string, isImageField = false): string => {
    if (!fieldPath) return ""
    
    // Handle nested field paths (e.g., "price.amount", "images[0]")
    let value: unknown = result
    const pathParts = fieldPath.split('.')
    
    for (const part of pathParts) {
      if (value === null || value === undefined) return ""
      
      // Handle array indexing like "images[0]"
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
    
    // Handle arrays (for cases where the final value is still an array)
    if (Array.isArray(value)) {
      // For image fields, return the first URL
      if (isImageField) {
        return value.length > 0 ? String(value[0]) : ""
      }
      // For other arrays, join with commas
      return value.map(item => 
        typeof item === 'object' ? JSON.stringify(item) : String(item)
      ).join(', ')
    }
    
    // Handle objects - try to extract meaningful value
    if (typeof value === 'object' && value !== null) {
      const obj = value as Record<string, unknown>
      // Check for common price object structures
      if (obj.amount !== undefined) return String(obj.amount)
      if (obj.value !== undefined) return String(obj.value)
      if (obj.price !== undefined) return String(obj.price)
      if (obj.cost !== undefined) return String(obj.cost)
      
      // For other objects, stringify but make it readable
      return JSON.stringify(value)
    }
    
    return String(value)
  }

  // Render result card based on display configuration
  const renderResultCard = (result: SearchResult, index: number) => {
    const config = displayConfigs[selectedIndex]
    
    if (!config) {
      // Fallback to default rendering
      return (
        <Card key={index}>
          <CardHeader>
            <CardTitle className="text-base">
              {String(result.title || result.name || `Item ${result.id}`)}
            </CardTitle>
            {result.description ? (
              <CardDescription>{String(result.description)}</CardDescription>
            ) : null}
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              {Object.entries(result)
                .filter(([key]) => !["id", "title", "name", "description"].includes(key))
                .slice(0, 3)
                .map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-muted-foreground capitalize">{key}:</span>
                    <span>{String(value)}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )
    }

    // Custom rendering based on configuration
    const primaryText = getFieldValue(result, config.primaryText)
    const secondaryText = config.secondaryText ? getFieldValue(result, config.secondaryText) : ""
    const imageUrl = config.imageUrl ? getFieldValue(result, config.imageUrl, true) : ""

    return (
      <Card key={index} className="overflow-hidden relative">
        {result._rankingScore !== undefined && (
          <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-mono border z-10">
            {result._rankingScore.toFixed(3)}
          </div>
        )}
        {imageUrl && (
          <div className="aspect-square w-full overflow-hidden">
            <img
              src={imageUrl}
              alt={primaryText}
              className="h-full w-full object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
              }}
            />
          </div>
        )}
        <CardHeader className={imageUrl ? "pb-2" : ""}>
          <CardTitle className="text-base line-clamp-2">
            {primaryText || "Untitled"}
          </CardTitle>
          {secondaryText && (
            <CardDescription className="line-clamp-2">
              {secondaryText}
            </CardDescription>
          )}
        </CardHeader>
        {config.additionalFields && config.additionalFields.length > 0 && (
          <CardContent className="pt-0">
            <div className="space-y-1">
              {config.additionalFields.map((field) => {
                // Special handling for reviews field
                if (field.fieldName === 'reviews') {
                  const reviewsData = result[field.fieldName] as { rating?: number; count?: number; bayesian_avg?: number }
                  if (!reviewsData) return null

                  const rating = reviewsData.bayesian_avg ?? reviewsData.rating ?? 0
                  const count = reviewsData.count

                  return (
                    <div key={field.id} className="text-sm line-clamp-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-muted-foreground">{field.label || field.fieldName}:</span>
                        {renderStars(rating, count)}
                      </div>
                    </div>
                  )
                }

                // Regular field handling
                const fieldValue = getFieldValue(result, field.fieldName)
                if (!fieldValue) return null
                return (
                  <div key={field.id} className="text-sm text-muted-foreground line-clamp-1">
                    <span className="font-medium">{field.label || field.fieldName}:</span> {fieldValue}
                  </div>
                )
              })}
            </div>
          </CardContent>
        )}
      </Card>
    )
  }



  const offsetRef = React.useRef(0)

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setUploadedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64Data = (reader.result as string).split(',')[1] // Remove data:image/...;base64, prefix
        setImagePreview(base64Data)
      }
      reader.readAsDataURL(file)
    }
  }

  const clearImage = () => {
    setUploadedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const performSearch = React.useCallback(async (query?: string, loadMore = false) => {
    if (!selectedIndex) {
      setResults([])
      setFacets({})
      return
    }

    const searchTerm = query !== undefined ? query : searchQuery
    const currentOffset = loadMore ? offsetRef.current : 0

    if (loadMore) {
      setLoadingMore(true)
    } else {
      setLoading(true)
      setIsInitialLoad(false)
      offsetRef.current = 0
    }

    try {
      const baseFilter = Object.entries(selectedFacets)
        .filter(([, values]) => values.length > 0)
        .map(([key, values]) => values.map(value => `${key} = "${value}"`).join(" OR "))
        .filter(filter => filter.length > 0)

      // Add range filters
      const rangeFilterQueries = Object.entries(rangeFilters)
        .filter(([, range]) => range.min !== undefined || range.max !== undefined)
        .map(([key, range]) => {
          const conditions = []
          if (range.min !== undefined) {
            conditions.push(`${key} >= ${range.min}`)
          }
          if (range.max !== undefined) {
            conditions.push(`${key} <= ${range.max}`)
          }
          return conditions.join(" AND ")
        })
        .filter(filter => filter.length > 0)

      const allFilters = [...baseFilter, ...rangeFilterQueries].filter(f => f)

      // Prepare sort parameter
      const sortParam = currentSort && currentSort !== "relevance" ? [currentSort] : undefined

      // Simple search - removed all merchandising logic
      const searchOptions: Record<string, unknown> = {
        facets: ["*"],
        filter: allFilters,
        limit: 12,
        offset: currentOffset,
        showRankingScore: true,
        rankingScoreThreshold: 0.78,
        ...(sortParam && { sort: sortParam }),
        ...(imagePreview && uploadedImage && {
          media: {
            image: {
              mime: uploadedImage.type,
              data: imagePreview
            }
          },
          hybrid: {
            embedder: 'voyage',
            semanticRatio: semanticRatio
          }
        }),
        ...(!imagePreview && searchTerm && {
          hybrid: {
            embedder: 'voyage',
            semanticRatio: semanticRatio
          }
        })
      }

      const searchResult = await client.index(selectedIndex).search(imagePreview ? null : searchTerm || "", searchOptions)
      const processedResults = searchResult.hits as SearchResult[]
      const facetDistribution = searchResult.facetDistribution || {}

      // Transform facetDistribution to our expected format
      const transformedFacets: Record<string, FacetValue[]> = {}
      Object.entries(facetDistribution).forEach(([facetKey, facetData]) => {
        transformedFacets[facetKey] = Object.entries(facetData as Record<string, number>).map(([value, count]) => ({
          value,
          count
        }))
      })

      if (loadMore) {
        setResults(prev => [...prev, ...processedResults])
        offsetRef.current = currentOffset + processedResults.length
      } else {
        setResults(processedResults)
        offsetRef.current = processedResults.length
      }

      setFacets(transformedFacets)
      setHasMore(processedResults.length === 12)
    } catch (error) {
      console.error("Search error:", error)
      if (!loadMore) {
        setResults([])
        setFacets({})
      }
    } finally {
      if (loadMore) {
        setLoadingMore(false)
      } else {
        setLoading(false)
      }
    }
  }, [client, selectedIndex, searchQuery, selectedFacets, rangeFilters, currentSort, semanticRatio, imagePreview, uploadedImage])

  React.useEffect(() => {
    const debounceTimer = setTimeout(performSearch, 150)
    return () => clearTimeout(debounceTimer)
  }, [performSearch])

  // Perform initial search when index is selected
  React.useEffect(() => {
    if (selectedIndex) {
      performSearch("")
    }
  }, [selectedIndex, performSearch])

  // Initialize expanded state for facets (collapsed by default)
  React.useEffect(() => {
    const facetKeys = Object.keys(facets)
    if (facetKeys.length > 0) {
      setExpandedFacets(prev => {
        const newExpanded = { ...prev }
        facetKeys.forEach(key => {
          if (!(key in newExpanded)) {
            newExpanded[key] = false // Collapsed by default
          }
        })
        return newExpanded
      })
    }
  }, [facets])

  const handleFacetChange = (facetKey: string, value: string, checked: boolean) => {
    setSelectedFacets(prev => ({
      ...prev,
      [facetKey]: checked
        ? [...(prev[facetKey] || []), value]
        : (prev[facetKey] || []).filter(v => v !== value)
    }))
  }

  const toggleFacetExpansion = (facetKey: string) => {
    setExpandedFacets(prev => ({
      ...prev,
      [facetKey]: !prev[facetKey]
    }))
  }

  const handleFacetSearch = async (facetKey: string, searchQuery: string) => {
    setFacetSearchQueries(prev => ({
      ...prev,
      [facetKey]: searchQuery
    }))

    if (!selectedIndex || !searchQuery.trim()) {
      // If no search query, clear the search results for this facet
      setFacetSearchResults(prev => ({
        ...prev,
        [facetKey]: []
      }))
      return
    }

    try {
      const index = client.index(selectedIndex)
      const result = await index.searchForFacetValues({
        facetName: facetKey,
        facetQuery: searchQuery,
        q: searchQuery, // Include the main search query for context
        filter: Object.entries(selectedFacets)
          .filter(([key, values]) => key !== facetKey && values.length > 0)
          .map(([key, values]) => values.map(value => `${key} = "${value}"`).join(" OR "))
          .filter(filter => filter.length > 0)
          .join(" AND ") || undefined
      })

      // Convert facet search results to our FacetValue format
      const facetValues: FacetValue[] = result.facetHits.map(hit => ({
        value: hit.value,
        count: hit.count
      }))

      setFacetSearchResults(prev => ({
        ...prev,
        [facetKey]: facetValues
      }))
    } catch (error) {
      console.error(`Failed to search facet values for ${facetKey}:`, error)
      setFacetSearchResults(prev => ({
        ...prev,
        [facetKey]: []
      }))
    }
  }

  const getFacetValues = (facetKey: string): FacetValue[] => {
    const searchQuery = facetSearchQueries[facetKey]
    if (searchQuery && searchQuery.trim()) {
      return facetSearchResults[facetKey] || []
    }
    return facets[facetKey] || []
  }

  const getVisibleFacets = (): Record<string, FacetValue[]> => {
    const facetConfig = facetConfigs[selectedIndex]
    if (!facetConfig) {
      return facets // Show all facets if no configuration
    }

    const visibleFacets: Record<string, FacetValue[]> = {}
    
    // Use facetOrder if available, otherwise use visibleFacets order
    const orderedKeys = facetConfig.facetOrder || facetConfig.visibleFacets
    
    orderedKeys.forEach(facetKey => {
      if (facetConfig.visibleFacets.includes(facetKey) && facets[facetKey]) {
        visibleFacets[facetKey] = facets[facetKey]
      }
    })

    return visibleFacets
  }

  const getFacetDisplayName = (facetKey: string): string => {
    const facetConfig = facetConfigs[selectedIndex]
    if (facetConfig && facetConfig.facetDisplayNames[facetKey]) {
      return facetConfig.facetDisplayNames[facetKey]
    }
    return facetKey // Default to the original key, capitalized will be handled in the render
  }

  const isRangeFilter = (facetKey: string): boolean => {
    const facetConfig = facetConfigs[selectedIndex]
    return facetConfig?.rangeFilters?.[facetKey] || false
  }

  const handleRangeFilterChange = (facetKey: string, min?: number, max?: number) => {
    setRangeFilters(prev => ({
      ...prev,
      [facetKey]: { min, max }
    }))
  }

  const getRangeFilterBounds = (facetKey: string): { min: number; max: number } => {
    const facetValues = facets[facetKey] || []
    const numericValues = facetValues
      .map(f => parseFloat(f.value))
      .filter(v => !isNaN(v))
      .sort((a, b) => a - b)
    
    return {
      min: numericValues.length > 0 ? numericValues[0] : 0,
      max: numericValues.length > 0 ? numericValues[numericValues.length - 1] : 100
    }
  }

  const getAvailableSorts = (): Array<{ value: string; label: string }> => {
    const sortConfig = sortConfigs[selectedIndex]
    
    if (!sortConfig || !sortConfig.visibleSorts.length) {
      // Default sorts if no configuration
      return [
        { value: "relevance", label: "Relevance" },
        { value: "_geoPoint(lat, lng):asc", label: "Distance (closest first)" },
        { value: "_geoPoint(lat, lng):desc", label: "Distance (farthest first)" }
      ]
    }

    // Use configured sorts
    const sorts = [{ value: "relevance", label: "Relevance" }]
    sortConfig.sortOrder.forEach(sortKey => {
      if (sortConfig.visibleSorts.includes(sortKey)) {
        const displayName = sortConfig.sortDisplayNames[sortKey] || sortKey
        // Sort keys already include direction, so use them directly
        sorts.push({ value: sortKey, label: displayName })
      }
    })
    
    return sorts
  }

  // Get sort display name (currently unused but kept for potential future use)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars

  // Query matching logic for pin rules
  // Removed all merchandising helper functions

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <img
              src="/meili_logo.svg"
              alt="Meilisearch"
              className="h-6 w-auto"
            />
            <span className="text-sm font-medium text-muted-foreground absolute left-1/2 -translate-x-1/2">Multimodal AI-powered search</span>
          </div>

        </div>
      </header>

      <div className="container mx-auto p-6">
        <div className="flex gap-4 mb-6">

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, brand, or image..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="pl-10 pr-10"
            />
            {loading && !isInitialLoad && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
            {showSuggestions && !searchQuery && (
              <div className="absolute top-full mt-2 w-full bg-popover border rounded-md shadow-md z-50">
                <div className="p-2">
                  <div className="text-xs font-medium text-muted-foreground px-2 py-1">Try searching for:</div>
                  {exampleQueries.map((query) => (
                    <button
                      key={query}
                      onClick={() => {
                        setSearchQuery(query)
                        setShowSuggestions(false)
                      }}
                      className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent rounded-sm transition-colors"
                    >
                      {query}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              title="Upload image for search"
            >
              <Image className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md">
            <span className="text-sm text-muted-foreground whitespace-nowrap">AI</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={semanticRatio}
              onChange={(e) => setSemanticRatio(parseFloat(e.target.value))}
              className="w-16 accent-primary"
            />
            <span className="text-sm text-muted-foreground w-8">{Math.round(semanticRatio * 100)}%</span>
          </div>
        </div>

        {imagePreview && uploadedImage && (
          <div className="mb-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="relative w-24 h-24 rounded overflow-hidden border">
                    <img
                      src={`data:${uploadedImage.type};base64,${imagePreview}`}
                      alt="Uploaded"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Searching with uploaded image</p>
                    <p className="text-xs text-muted-foreground">Image-to-image search active</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex gap-6">
          <div className="w-64 space-y-4">
          <h3 className="font-semibold text-sm">Sort</h3>
          <div className="flex items-center gap-1">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <Select value={currentSort} onValueChange={setCurrentSort}>
              <SelectTrigger className="w-40 border-none shadow-none">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                {getAvailableSorts().map(sort => (
                  <SelectItem key={sort.value} value={sort.value}>
                    {sort.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
            {Object.keys(facets).length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Filters</h3>
                {Object.entries(getVisibleFacets()).map(([facetKey]) => {
                  const isExpanded = expandedFacets[facetKey] || false
                  const currentFacetValues = getFacetValues(facetKey)
                  const visibleValues = isExpanded ? currentFacetValues : currentFacetValues.slice(0, 5)
                  const hasMore = currentFacetValues.length > 5
                  
                  return (
                    <div key={facetKey} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">{getFacetDisplayName(facetKey)}</h4>
                        {hasMore && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleFacetExpansion(facetKey)}
                            className="h-6 w-6 p-0"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        {isRangeFilter(facetKey) ? (
                          // Range filter UI
                          <div className="space-y-3">
                            <div className="text-xs text-muted-foreground">
                              Range: {getRangeFilterBounds(facetKey).min} - {getRangeFilterBounds(facetKey).max}
                            </div>
                            <div className="space-y-2">
                              <div className="flex gap-2">
                                <div className="flex-1">
                                  <label className="text-xs text-muted-foreground">Min</label>
                                  <Input
                                    type="number"
                                    placeholder="Min"
                                    value={rangeFilters[facetKey]?.min || ""}
                                    onChange={(e) => {
                                      const min = e.target.value ? parseFloat(e.target.value) : undefined
                                      handleRangeFilterChange(facetKey, min, rangeFilters[facetKey]?.max)
                                    }}
                                    className="h-8 text-xs"
                                    min={getRangeFilterBounds(facetKey).min}
                                    max={getRangeFilterBounds(facetKey).max}
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="text-xs text-muted-foreground">Max</label>
                                  <Input
                                    type="number"
                                    placeholder="Max"
                                    value={rangeFilters[facetKey]?.max || ""}
                                    onChange={(e) => {
                                      const max = e.target.value ? parseFloat(e.target.value) : undefined
                                      handleRangeFilterChange(facetKey, rangeFilters[facetKey]?.min, max)
                                    }}
                                    className="h-8 text-xs"
                                    min={getRangeFilterBounds(facetKey).min}
                                    max={getRangeFilterBounds(facetKey).max}
                                  />
                                </div>
                              </div>
                              {(rangeFilters[facetKey]?.min !== undefined || rangeFilters[facetKey]?.max !== undefined) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRangeFilterChange(facetKey, undefined, undefined)}
                                  className="h-6 text-xs w-full"
                                >
                                  Clear Range
                                </Button>
                              )}
                            </div>
                          </div>
                        ) : (
                          // Regular discrete values UI
                          <>
                            <Input
                              placeholder={`Search ${getFacetDisplayName(facetKey)}...`}
                              value={facetSearchQueries[facetKey] || ""}
                              onChange={(e) => handleFacetSearch(facetKey, e.target.value)}
                              className="h-8 text-xs"
                            />
                            
                            <div className="space-y-1">
                              {visibleValues.map(({ value, count }) => (
                                <div key={value} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`${facetKey}-${value}`}
                                    checked={selectedFacets[facetKey]?.includes(value) || false}
                                    onCheckedChange={(checked) =>
                                      handleFacetChange(facetKey, value, checked as boolean)
                                    }
                                  />
                                  <label
                                    htmlFor={`${facetKey}-${value}`}
                                    className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                                  >
                                    {value} ({count})
                                  </label>
                                </div>
                              ))}
                            </div>
                            
                            {hasMore && !isExpanded && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleFacetExpansion(facetKey)}
                                className="h-6 text-xs text-muted-foreground hover:text-foreground w-full"
                              >
                                Show {currentFacetValues.length - 5} more
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex-1">
            {loading && isInitialLoad && (
              <div className="text-center py-8">
                <div className="text-muted-foreground">Searching...</div>
              </div>
            )}

            {!loading && results.length === 0 && selectedIndex && (
              <div className="text-center py-8">
                <div className="text-muted-foreground">
                  {searchQuery ? "No results found" : "No documents in this index"}
                </div>
              </div>
            )}

            {!loading && results.length === 0 && !selectedIndex && (
              <div className="text-center py-8">
                <div className="text-muted-foreground">Select an index to browse documents</div>
              </div>
            )}

            {!loading && results.length > 0 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.map((result, index) => renderResultCard(result, index))}
                </div>
                {hasMore && (
                  <div className="flex justify-center mt-6">
                    <Button
                      onClick={() => performSearch(undefined, true)}
                      disabled={loadingMore}
                      variant="outline"
                      size="lg"
                    >
                      {loadingMore ? "Loading..." : "Load More"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}



