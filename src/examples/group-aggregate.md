---
name: group-aggregate
description: Group records by a field and aggregate (sum, count, avg, min, max)
---

# Group and Aggregate

Group orders by status and calculate revenue sum + order count per group.

**Tool:** `munge` (linear pipeline)

```json
{
  "pipeline": [
    { "load": { "path": "orders.json" } },
    { "records": { "jsonpath": "$.orders[*]" } },
    { "group": { "by": "status", "agg": [
      { "field": "total", "op": "sum", "as": "total_revenue" },
      { "field": "id", "op": "count", "as": "order_count" }
    ]}},
    { "output": { "format": "markdown" } }
  ]
}
```

**Steps:**
1. `load` — read orders JSON
2. `records` — extract each order
3. `group` — group by `status`, compute sum of totals and count of orders
4. `output` — markdown

**Aggregate ops:** `sum`, `count`, `avg`, `min`, `max`. The `as` field renames the column.