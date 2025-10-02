# Multimodal AI-Powered Search

A modern search interface built with Next.js and Meilisearch, showcasing **multimodal AI search** capabilities. This demo allows users to search products using both text queries and image uploads, powered by Meilisearch's hybrid search with semantic embeddings.

## ✨ Features

- 🔍 **Hybrid Search**: Combines full-text and semantic search with adjustable AI ratio
- 🖼️ **Image-to-Image Search**: Upload images to find visually similar products
- 🔤 **Text-to-Image Search**: 
- 📊 **Ranking Scores**: Visible relevancy scores for transparency

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- A running Meilisearch instance
- Products indexed with multimodal embeddings (e.g., using Voyage embedder)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd demo-multimodal
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
# .env.local
NEXT_PUBLIC_MEILISEARCH_URL=meilisearch_url
NEXT_PUBLIC_MEILISEARCH_READ_API_KEY=your_api_key
NEXT_PUBLIC_DEFAULT_INDEX=products_multimodal
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔧 Configuration

### Search Configuration

The search interface supports extensive configuration through constants in `search-interface.tsx`:

```typescript
// Display configuration - controls how results are rendered
const DISPLAY_CONFIGS = {
  products_multimodal: {
    primaryText: 'name',
    secondaryText: 'brand',
    imageUrl: 'image_url',
    additionalFields: [...]
  }
}

// Facet configuration - controls which filters are shown
const FACET_CONFIGS = {
  products_multimodal: {
    visibleFacets: ['color.original_name', 'category_page_id', 'brand'],
    facetDisplayNames: {...},
    facetOrder: [...],
    rangeFilters: {}
  }
}

// Sort configuration
const SORT_CONFIGS = {
  products_multimodal: {
    visibleSorts: ['price.value:asc', 'reviews.bayesian_avg:desc', ...],
    sortDisplayNames: {...},
    defaultSort: 'relevance'
  }
}
```

### Search Parameters

Key search parameters can be adjusted:

- `RESULTS_LIMIT`: Number of results per page (default: 12)
- `SEARCH_DEBOUNCE_MS`: Debounce delay for queries (default: 150ms)
- `RANKING_SCORE_THRESHOLD`: Minimum score for results (default: 0.65)

## 🎨 Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) with App Router
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **Search Engine**: [Meilisearch](https://www.meilisearch.com/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Multi-modal AI model**: [VOYAGE AI voyage-multimodal-3](https://docs.voyageai.com/docs/multimodal-embeddings)


## 🛠️ Development

### Build for Production
```bash
npm run build
npm start
```

### Linting
```bash
npm run lint
```

## 🔗 Resources

- [Meilisearch documentation](https://www.meilisearch.com/docs)
- [Multimodal search guide](https://www.meilisearch.com/docs/learn/ai_powered_search/image_search_with_multimodal_embeddings)

## 🤖 Meilisearch embedder configuration
```json
{
    "default": {
        "source": "rest",
        "apiKey": "pa-iVXXXXXX...",
        "dimensions": 1024,
        "binaryQuantized": false,
        "url": "https://api.voyageai.com/v1/multimodalembeddings",
        "indexingFragments": {
            "picture": {
                "value": {
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": "{{doc.image_url}}"
                        }
                    ]
                }
            },
            "text": {
                "value": {
                    "content": [
                        {
                            "type": "text",
                            "text": "A {% if doc.color and doc.color.original_name %} {{ doc.color.original_name }}{% endif %} {%- if doc.product_type %} {{ doc.product_type }}{% else %} product{% endif %} {% if doc.brand %}by {{ doc.brand }}{% endif %} {% if doc.name %}called {{ doc.name }}{% endif %} {% if doc.gender %}for {{ doc.gender }}{% endif %}. {%- if doc.description and doc.description != \"\" %}. {{ doc.description }}{% endif %}."
                        }
                    ]
                }
            }
        },
        "searchFragments": {
            "image": {
                "value": {
                    "content": [
                        {
                            "type": "image_base64",
                            "image_base64": "data:{{media.image.mime}};base64,{{media.image.data}}"
                        }
                    ]
                }
            },
            "text": {
                "value": {
                    "content": [
                        {
                            "type": "text",
                            "text": "{{q}}"
                        }
                    ]
                }
            }
        },
        "request": {
            "inputs": [
                "{{fragment}}",
                "{{..}}"
            ],
            "model": "voyage-multimodal-3"
        },
        "response": {
            "data": [
                {
                    "embedding": "{{embedding}}"
                },
                "{{..}}"
            ]
        },
        "headers": {}
    }
}
```

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!