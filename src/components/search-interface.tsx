"use client"

import * as React from "react"
import { MeiliSearch } from "meilisearch"
import { ArrowUpDown, Image } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { SearchBar } from "@/components/search-bar"
import { ResultCard } from "@/components/result-card"
import { ImageUploadBanner } from "@/components/image-upload-banner"
import { FacetFilters } from "@/components/facet-filters"
import {
  SearchResult,
  FacetValue,
  DisplayConfig,
  FacetConfig,
  SortConfig
} from "@/types/search"
import { buildSearchFilters } from "@/lib/search-utils"

interface SearchInterfaceProps {
  meilisearchUrl?: string
  apiKey?: string
}

// Configuration constants
const DISPLAY_CONFIGS: Record<string, DisplayConfig> = {
  'fashion-products-v2': {
    indexUid: 'fashion-products-v2',
    primaryText: 'productDisplayName',
    secondaryText: 'brandName',
    imageUrl: 'imageUrls.default',
    additionalFields: [
      { id: 'price-field', fieldName: 'price', label: 'Price' },
      { id: 'category-field', fieldName: 'masterCategory', label: 'Category' },
      { id: 'color-field', fieldName: 'baseColour', label: 'Color' }
    ]
  }
}

const FACET_CONFIGS: Record<string, FacetConfig> = {
  'fashion-products-v2': {
    indexUid: 'fashion-products-v2',
    visibleFacets: ['gender', 'masterCategory', 'baseColour', 'season', 'usage'],
    facetDisplayNames: {
      'gender': 'Gender',
      'masterCategory': 'Category',
      'baseColour': 'Color',
      'season': 'Season',
      'usage': 'Usage'
    },
    facetOrder: ['gender', 'masterCategory', 'baseColour', 'season', 'usage'],
    rangeFilters: {}
  }
}

const SORT_CONFIGS: Record<string, SortConfig> = {
  'fashion-products-v2': {
    indexUid: 'fashion-products-v2',
    visibleSorts: ['price:asc', 'price:desc'],
    sortDisplayNames: {
      'price:asc': 'Price: Low to High',
      'price:desc': 'Price: High to Low'
    },
    sortOrder: ['price:asc', 'price:desc'],
    defaultSort: 'relevance'
  }
}

const EXAMPLE_QUERIES = [
  "steel cufflinks for men",
  "casual summer accessories",
  "designer fashion items"
]

const RESULTS_LIMIT = 12
const SEARCH_DEBOUNCE_MS = 150
const RANKING_SCORE_THRESHOLD = 0.6

export function SearchInterface({
  meilisearchUrl = process.env.NEXT_PUBLIC_MEILISEARCH_URL || "http://localhost:7700",
  apiKey = process.env.NEXT_PUBLIC_MEILISEARCH_READ_API_KEY || "",
}: SearchInterfaceProps) {
  const [client] = React.useState(() => new MeiliSearch({ host: meilisearchUrl, apiKey }))
  const [selectedIndex] = React.useState(process.env.NEXT_PUBLIC_DEFAULT_INDEX || "")

  // Search state
  const [searchQuery, setSearchQuery] = React.useState("")
  const [semanticRatio, setSemanticRatio] = React.useState(0.5)
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [currentSort, setCurrentSort] = React.useState<string>("relevance")
  const [loading, setLoading] = React.useState(false)
  const [isInitialLoad, setIsInitialLoad] = React.useState(true)
  const [hasMore, setHasMore] = React.useState(false)
  const [loadingMore, setLoadingMore] = React.useState(false)

  // Facet state
  const [facets, setFacets] = React.useState<Record<string, FacetValue[]>>({})
  const [selectedFacets, setSelectedFacets] = React.useState<Record<string, string[]>>({})
  const [rangeFilters, setRangeFilters] = React.useState<Record<string, { min?: number; max?: number }>>({})
  const [expandedFacets, setExpandedFacets] = React.useState<Record<string, boolean>>({})
  const [facetSearchQueries, setFacetSearchQueries] = React.useState<Record<string, string>>({})
  const [facetSearchResults, setFacetSearchResults] = React.useState<Record<string, FacetValue[]>>({})

  // Image search state
  const [uploadedImage, setUploadedImage] = React.useState<File | null>(null)
  const [imagePreview, setImagePreview] = React.useState<string | null>(null)

  // UI state
  const [showSuggestions, setShowSuggestions] = React.useState(false)

  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const offsetRef = React.useRef(0)

  // Set default sort from config
  React.useEffect(() => {
    const sortConfig = SORT_CONFIGS[selectedIndex]
    if (sortConfig?.defaultSort) {
      setCurrentSort(sortConfig.defaultSort)
    }
  }, [selectedIndex])

  // Initialize expanded state for facets
  React.useEffect(() => {
    const facetKeys = Object.keys(facets)
    if (facetKeys.length > 0) {
      setExpandedFacets(prev => {
        const newExpanded = { ...prev }
        facetKeys.forEach(key => {
          if (!(key in newExpanded)) {
            newExpanded[key] = false
          }
        })
        return newExpanded
      })
    }
  }, [facets])

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setUploadedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64Data = (reader.result as string).split(',')[1]
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
      const filters = buildSearchFilters(selectedFacets, rangeFilters)
      const sortParam = currentSort && currentSort !== "relevance" ? [currentSort] : undefined

      const searchOptions: Record<string, unknown> = {
        facets: ["*"],
        filter: filters,
        limit: RESULTS_LIMIT,
        offset: currentOffset,
        showRankingScore: true,
        rankingScoreThreshold: RANKING_SCORE_THRESHOLD,
        ...(sortParam && { sort: sortParam }),
      }

      // Add hybrid search configuration
      if (imagePreview && uploadedImage) {
        searchOptions.media = {
          image: {
            mime: uploadedImage.type,
            data: imagePreview
          }
        }
        searchOptions.hybrid = {
          embedder: 'voyage',
          semanticRatio: 1.0  // Use 100% semantic for image search
        }
      } else if (searchTerm) {
        searchOptions.hybrid = {
          embedder: 'voyage',
          semanticRatio
        }
      }

      const searchResult = await client.index(selectedIndex).search(
        imagePreview ? null : searchTerm || "",
        searchOptions
      )

      const processedResults = searchResult.hits as SearchResult[]
      const facetDistribution = searchResult.facetDistribution || {}

      // Transform facet distribution
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
      setHasMore(processedResults.length === RESULTS_LIMIT)
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
  }, [client, selectedIndex, searchQuery, currentSort, semanticRatio, imagePreview, uploadedImage, selectedFacets, rangeFilters])

  React.useEffect(() => {
    const debounceTimer = setTimeout(performSearch, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(debounceTimer)
  }, [performSearch])

  React.useEffect(() => {
    if (selectedIndex) {
      performSearch("")
    }
  }, [selectedIndex, performSearch])

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
    setFacetSearchQueries(prev => ({ ...prev, [facetKey]: searchQuery }))

    if (!selectedIndex || !searchQuery.trim()) {
      setFacetSearchResults(prev => ({ ...prev, [facetKey]: [] }))
      return
    }

    try {
      const index = client.index(selectedIndex)
      const result = await index.searchForFacetValues({
        facetName: facetKey,
        facetQuery: searchQuery,
        q: searchQuery,
        filter: Object.entries(selectedFacets)
          .filter(([key, values]) => key !== facetKey && values.length > 0)
          .map(([key, values]) => values.map(value => `${key} = "${value}"`).join(" OR "))
          .filter(Boolean)
          .join(" AND ") || undefined
      })

      const facetValues: FacetValue[] = result.facetHits.map(hit => ({
        value: hit.value,
        count: hit.count
      }))

      setFacetSearchResults(prev => ({ ...prev, [facetKey]: facetValues }))
    } catch (error) {
      console.error(`Failed to search facet values for ${facetKey}:`, error)
      setFacetSearchResults(prev => ({ ...prev, [facetKey]: [] }))
    }
  }

  const handleRangeFilterChange = (facetKey: string, min?: number, max?: number) => {
    setRangeFilters(prev => ({ ...prev, [facetKey]: { min, max } }))
  }

  const getFacetValues = (facetKey: string): FacetValue[] => {
    const searchQuery = facetSearchQueries[facetKey]
    if (searchQuery?.trim()) {
      return facetSearchResults[facetKey] || []
    }
    return facets[facetKey] || []
  }

  const getVisibleFacets = (): Record<string, FacetValue[]> => {
    const facetConfig = FACET_CONFIGS[selectedIndex]
    if (!facetConfig) return facets

    const visibleFacets: Record<string, FacetValue[]> = {}
    const orderedKeys = facetConfig.facetOrder || facetConfig.visibleFacets

    orderedKeys.forEach(facetKey => {
      if (facetConfig.visibleFacets.includes(facetKey) && facets[facetKey]) {
        visibleFacets[facetKey] = facets[facetKey]
      }
    })

    return visibleFacets
  }

  const getFacetDisplayName = (facetKey: string): string => {
    const facetConfig = FACET_CONFIGS[selectedIndex]
    return facetConfig?.facetDisplayNames[facetKey] || facetKey
  }

  const isRangeFilter = (facetKey: string): boolean => {
    const facetConfig = FACET_CONFIGS[selectedIndex]
    return facetConfig?.rangeFilters?.[facetKey] || false
  }

  const getRangeFilterBounds = (facetKey: string): { min: number; max: number } => {
    const facetValues = facets[facetKey] || []
    const numericValues = facetValues
      .map(f => parseFloat(f.value))
      .filter(v => !isNaN(v))
      .sort((a, b) => a - b)

    return {
      min: numericValues[0] || 0,
      max: numericValues[numericValues.length - 1] || 100
    }
  }

  const getAvailableSorts = (): Array<{ value: string; label: string }> => {
    const sortConfig = SORT_CONFIGS[selectedIndex]

    if (!sortConfig?.visibleSorts.length) {
      return [{ value: "relevance", label: "Relevance" }]
    }

    const sorts = [{ value: "relevance", label: "Relevance" }]
    sortConfig.sortOrder.forEach(sortKey => {
      if (sortConfig.visibleSorts.includes(sortKey)) {
        sorts.push({
          value: sortKey,
          label: sortConfig.sortDisplayNames[sortKey] || sortKey
        })
      }
    })

    return sorts
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <img src="/meili_logo.svg" alt="Meilisearch" className="h-6 w-auto" />
            <span className="text-sm font-medium text-muted-foreground absolute left-1/2 -translate-x-1/2">
              Multimodal AI-powered search
            </span>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-6">
        <div className="flex gap-4 mb-6">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            loading={loading && !isInitialLoad}
            showSuggestions={showSuggestions}
            suggestions={EXAMPLE_QUERIES}
            onSuggestionClick={(query) => {
              setSearchQuery(query)
              setShowSuggestions(false)
            }}
          />

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
          <ImageUploadBanner
            imagePreview={imagePreview}
            imageType={uploadedImage.type}
            onClear={clearImage}
          />
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
                {Object.entries(getVisibleFacets()).map(([facetKey]) => (
                  <FacetFilters
                    key={facetKey}
                    facetKey={facetKey}
                    displayName={getFacetDisplayName(facetKey)}
                    values={getFacetValues(facetKey)}
                    selectedValues={selectedFacets[facetKey] || []}
                    isExpanded={expandedFacets[facetKey] || false}
                    isRangeFilter={isRangeFilter(facetKey)}
                    rangeMin={rangeFilters[facetKey]?.min}
                    rangeMax={rangeFilters[facetKey]?.max}
                    rangeBounds={isRangeFilter(facetKey) ? getRangeFilterBounds(facetKey) : undefined}
                    searchQuery={facetSearchQueries[facetKey] || ""}
                    onToggleExpansion={() => toggleFacetExpansion(facetKey)}
                    onValueChange={(value, checked) => handleFacetChange(facetKey, value, checked)}
                    onRangeChange={(min, max) => handleRangeFilterChange(facetKey, min, max)}
                    onSearch={(query) => handleFacetSearch(facetKey, query)}
                  />
                ))}
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
                  {results.map((result, index) => (
                    <ResultCard
                      key={`${result.id}-${index}`}
                      result={result}
                      config={DISPLAY_CONFIGS[selectedIndex]}
                    />
                  ))}
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
