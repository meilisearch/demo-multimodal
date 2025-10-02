import * as React from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onFocus: () => void
  onBlur: () => void
  loading?: boolean
  showSuggestions: boolean
  suggestions: string[]
  onSuggestionClick: (suggestion: string) => void
  placeholder?: string
}

export function SearchBar({
  value,
  onChange,
  onFocus,
  onBlur,
  loading = false,
  showSuggestions,
  suggestions,
  onSuggestionClick,
  placeholder = "Search by name, brand, or image..."
}: SearchBarProps) {
  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        className="pl-10 pr-10"
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
      {showSuggestions && !value && (
        <div className="absolute top-full mt-2 w-full bg-popover border rounded-md shadow-md z-50">
          <div className="p-2">
            <div className="text-xs font-medium text-muted-foreground px-2 py-1">
              Try searching for:
            </div>
            {suggestions.map((query) => (
              <button
                key={query}
                onClick={() => onSuggestionClick(query)}
                className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent rounded-sm transition-colors"
              >
                {query}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
