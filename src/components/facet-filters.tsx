import * as React from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { FacetValue } from "@/types/search"

interface FacetFiltersProps {
  facetKey: string
  displayName: string
  values: FacetValue[]
  selectedValues: string[]
  isExpanded: boolean
  isRangeFilter: boolean
  rangeMin?: number
  rangeMax?: number
  rangeBounds?: { min: number; max: number }
  searchQuery: string
  onToggleExpansion: () => void
  onValueChange: (value: string, checked: boolean) => void
  onRangeChange: (min?: number, max?: number) => void
  onSearch: (query: string) => void
}

export function FacetFilters({
  facetKey,
  displayName,
  values,
  selectedValues,
  isExpanded,
  isRangeFilter,
  rangeMin,
  rangeMax,
  rangeBounds,
  searchQuery,
  onToggleExpansion,
  onValueChange,
  onRangeChange,
  onSearch
}: FacetFiltersProps) {
  const visibleValues = isExpanded ? values : values.slice(0, 5)
  const hasMore = values.length > 5

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">{displayName}</h4>
        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleExpansion}
            className="h-6 w-6 p-0"
          >
            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {isRangeFilter && rangeBounds ? (
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Range: {rangeBounds.min} - {rangeBounds.max}
            </div>
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground">Min</label>
                  <Input
                    type="number"
                    placeholder="Min"
                    value={rangeMin || ""}
                    onChange={(e) => {
                      const min = e.target.value ? parseFloat(e.target.value) : undefined
                      onRangeChange(min, rangeMax)
                    }}
                    className="h-8 text-xs"
                    min={rangeBounds.min}
                    max={rangeBounds.max}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground">Max</label>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={rangeMax || ""}
                    onChange={(e) => {
                      const max = e.target.value ? parseFloat(e.target.value) : undefined
                      onRangeChange(rangeMin, max)
                    }}
                    className="h-8 text-xs"
                    min={rangeBounds.min}
                    max={rangeBounds.max}
                  />
                </div>
              </div>
              {(rangeMin !== undefined || rangeMax !== undefined) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRangeChange(undefined, undefined)}
                  className="h-6 text-xs w-full"
                >
                  Clear Range
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
            <Input
              placeholder={`Search ${displayName}...`}
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              className="h-8 text-xs"
            />

            <div className="space-y-1">
              {visibleValues.map(({ value, count }) => (
                <div key={value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${facetKey}-${value}`}
                    checked={selectedValues.includes(value)}
                    onCheckedChange={(checked) => onValueChange(value, checked as boolean)}
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
                onClick={onToggleExpansion}
                className="h-6 text-xs text-muted-foreground hover:text-foreground w-full"
              >
                Show {values.length - 5} more
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
