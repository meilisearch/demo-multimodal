import { MeiliSearch } from "meilisearch"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ indexUid: string }> }
) {
  try {
    const { indexUid } = await params
    const meilisearchUrl = process.env.MEILISEARCH_URL || "http://localhost:7700"
    const adminApiKey = process.env.MEILISEARCH_ADMIN_API_KEY || ""

    if (!adminApiKey) {
      return NextResponse.json(
        { error: "Meilisearch admin API key not configured" },
        { status: 500 }
      )
    }

    const client = new MeiliSearch({
      host: meilisearchUrl,
      apiKey: adminApiKey,
    })

    const index = client.index(indexUid)
    const stats = await index.getStats()
    const settings = await index.getSettings()
    
    // Extract field distribution from stats
    const fieldDistribution = stats.fieldDistribution || {}
    const availableFields = Object.keys(fieldDistribution)
    
    // Get filterable attributes and normalize them
    const rawFilterableAttributes = settings.filterableAttributes || []
    const filterableAttributes: string[] = []
    
    rawFilterableAttributes.forEach((attr: unknown) => {
      if (typeof attr === 'string') {
        filterableAttributes.push(attr)
      } else if (attr && typeof attr === 'object' && attr !== null && 'attributePatterns' in attr && Array.isArray((attr as { attributePatterns: string[] }).attributePatterns)) {
        // Handle complex filterable attribute objects
        filterableAttributes.push(...(attr as { attributePatterns: string[] }).attributePatterns)
      }
    })
    
    // Get sortable attributes and normalize them
    const rawSortableAttributes = settings.sortableAttributes || []
    const sortableAttributes: string[] = []
    
    rawSortableAttributes.forEach((attr: unknown) => {
      if (typeof attr === 'string') {
        sortableAttributes.push(attr)
      } else if (attr && typeof attr === 'object' && attr !== null && 'attributePatterns' in attr && Array.isArray((attr as { attributePatterns: string[] }).attributePatterns)) {
        // Handle complex sortable attribute objects
        sortableAttributes.push(...(attr as { attributePatterns: string[] }).attributePatterns)
      }
    })
    
    return NextResponse.json({
      indexUid,
      numberOfDocuments: stats.numberOfDocuments,
      fieldDistribution,
      availableFields,
      filterableAttributes,
      sortableAttributes,
      isIndexing: stats.isIndexing,
    })
  } catch (error) {
    const { indexUid } = await params
    console.error(`Failed to fetch stats for index ${indexUid}:`, error)
    return NextResponse.json(
      { error: `Failed to fetch stats for index ${indexUid}` },
      { status: 500 }
    )
  }
}