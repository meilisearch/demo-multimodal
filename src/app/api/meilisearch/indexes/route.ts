import { MeiliSearch } from "meilisearch"
import { NextResponse } from "next/server"

export async function GET() {
  try {
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

    const indexes = await client.getIndexes()
    
    const indexData = indexes.results.map(index => ({
      uid: index.uid,
      primaryKey: index.primaryKey,
      createdAt: index.createdAt,
      updatedAt: index.updatedAt,
    }))

    return NextResponse.json({
      indexes: indexData,
      count: indexes.results.length,
    })
  } catch (error) {
    console.error("Failed to fetch Meilisearch indexes:", error)
    return NextResponse.json(
      { error: "Failed to fetch indexes from Meilisearch" },
      { status: 500 }
    )
  }
}