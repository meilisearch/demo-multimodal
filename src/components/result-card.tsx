import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { StarRating } from "@/components/star-rating"
import { SearchResult, DisplayConfig } from "@/types/search"
import { getFieldValue } from "@/lib/search-utils"

interface ResultCardProps {
  result: SearchResult
  config?: DisplayConfig
}

export function ResultCard({ result, config }: ResultCardProps) {
  if (!config) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {String(result.title || result.name || `Item ${result.id}`)}
          </CardTitle>
          {typeof result.description === 'string' && (
            <CardDescription>{result.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-1 text-sm">
            {Object.entries(result)
              .filter(([key]) => !["id", "title", "name", "description", "_rankingScore"].includes(key))
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

  const primaryText = getFieldValue(result, config.primaryText)
  const secondaryText = config.secondaryText ? getFieldValue(result, config.secondaryText) : ""
  const imageUrl = config.imageUrl ? getFieldValue(result, config.imageUrl, true) : ""

  return (
    <Card className="overflow-hidden relative">
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
              if (field.fieldName === 'reviews') {
                const reviewsData = result[field.fieldName] as {
                  rating?: number
                  count?: number
                  bayesian_avg?: number
                }
                if (!reviewsData) return null

                const rating = reviewsData.bayesian_avg ?? reviewsData.rating ?? 0
                const count = reviewsData.count

                return (
                  <div key={field.id} className="text-sm line-clamp-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-muted-foreground">
                        {field.label || field.fieldName}:
                      </span>
                      <StarRating rating={rating} count={count} />
                    </div>
                  </div>
                )
              }

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
