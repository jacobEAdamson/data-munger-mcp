---
name: join-pipelines
description: Join two data sources on a key field using munge_graph DAG mode
---

# Join Two Data Sources

Join users and orders into combined report. Uses `munge_graph` DAG mode for multi-source.

**Tool:** `munge_graph` (DAG pipeline)

```json
{
  "nodes": [
    { "id": "u",  "load": { "path": "users.yaml" } },
    { "id": "o",  "load": { "path": "orders.yaml" } },
    { "id": "r1", "records": { "from": "u", "jsonpath": "$.users[*]" } },
    { "id": "r2", "records": { "from": "o", "jsonpath": "$.orders[*]" } },
    { "id": "j",  "join": { "inputs": { "left": "r1", "right": "r2" }, "on": "user_id" } },
    { "id": "m",  "map": { "from": "j", "fields": [
      { "label": "Name", "value": [{ "jsonpath": "$.name" }] },
      { "label": "Total", "value": [
        { "jsonpath": "$.total" },
        "to_number",
        { "format_number": { "decimals": 2, "prefix": "$" } }
      ]}
    ]}},
    { "id": "out", "output": { "from": "m", "format": "markdown" } }
  ]
}
```

**Steps:**
1. Two `load` nodes — one per file
2. Two `records` nodes — extract arrays from each source
3. `join` — left/right inner join on `user_id`
4. `map` — pick fields, chain transforms (jsonpath → to_number → format_number)
5. `output` — markdown table

**Join types:** `inner` (default), `left`, `right`.

**Tip:** `munge_graph` requires explicit node IDs and `from` references. Use `munge` when you have one source.