import { Star } from "lucide-react"

interface StarRatingProps {
  rating: number
  count?: number
}

export function StarRating({ rating, count }: StarRatingProps) {
  const stars = []
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 !== 0

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(<Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />)
    } else if (i === fullStars && hasHalfStar) {
      stars.push(<Star key={i} className="h-4 w-4 fill-yellow-400/50 text-yellow-400" />)
    } else {
      stars.push(<Star key={i} className="h-4 w-4 text-gray-300" />)
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
