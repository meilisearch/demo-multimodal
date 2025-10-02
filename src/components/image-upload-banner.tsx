import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface ImageUploadBannerProps {
  imagePreview: string
  imageType: string
  onClear: () => void
}

export function ImageUploadBanner({
  imagePreview,
  imageType,
  onClear
}: ImageUploadBannerProps) {
  return (
    <div className="mb-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative w-24 h-24 rounded overflow-hidden border">
              <img
                src={`data:${imageType};base64,${imagePreview}`}
                alt="Uploaded"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Searching with uploaded image</p>
              <p className="text-xs text-muted-foreground">Image-to-image search active</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClear}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
