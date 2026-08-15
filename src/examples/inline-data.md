---
name: inline-data
description: Use inline string data instead of a file with load_string
---

# Inline Data — No File Needed

Use `load_string` to supply data inline instead of reading from disk.

**Tool:** `munge` (linear pipeline)

```json
{
  "pipeline": [
    { "load_string": { "data": "{\"users\": [{\"name\": \"Alice\"}]}" } },
    { "records": { "jsonpath": "$.users[*]" } },
    { "map": { "fields": [
      { "label": "Name", "value": [{ "jsonpath": "$.name" }] }
    ]}},
    { "output": { "format": "markdown" } }
  ]
}
```

**Steps:**
1. `load_string` — parse JSON from inline string (also supports YAML)
2. `records` — extract users
3. `map` — pick name field
4. `output` — markdown table

**Tip:** Great for quick ad-hoc analysis. No file I/O, no path resolution.