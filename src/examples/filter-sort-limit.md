---
name: filter-sort-limit
description: Filter records by condition, sort by field, limit to top N
---

# Filter, Sort, Limit

Filter active items with a JSONPath predicate, sort by name, take top 10.

**Tool:** `munge` (linear pipeline)

```json
{
  "pipeline": [
    { "load": { "path": "data.yaml" } },
    { "records": { "jsonpath": "$.items[?(@.status == 'active')]" } },
    { "sort": { "by": "name" } },
    { "limit": { "count": 10 } },
    { "output": { "format": "markdown" } }
  ]
}
```

**Steps:**
1. `load` — read file
2. `records` — filter with JSONPath predicate (`?(@.status == 'active')`)
3. `sort` — sort ascending by `name` field
4. `limit` — keep only first 10 records
5. `output` — markdown table

**Tip:** JSONPath filtering works on `$.items[?(@.field == 'value')]`. Supports numeric: `@.price > 100`.