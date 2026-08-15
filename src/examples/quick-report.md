---
name: quick-report
description: Load a YAML file, extract records, map fields, output as markdown
---

# Quick Report from Config File

Load a YAML file, extract all members, map fields to a table, and output markdown.

**Tool:** `munge` (linear pipeline)

```json
{
  "pipeline": [
    { "load": { "path": "team.yaml" } },
    { "records": { "jsonpath": "$.members[*]" } },
    { "map": { "fields": [
      { "label": "Name", "value": [{ "jsonpath": "$.name" }] },
      { "label": "Role", "value": [{ "jsonpath": "$.role" }] },
      { "label": "Skills", "value": [{ "jsonpath": "$.skills" }] }
    ]}},
    { "output": { "format": "markdown" } }
  ]
}
```

**Steps:**
1. `load` — read file, parse YAML
2. `records` — extract each member from array
3. `map` — pick fields, apply transform per field
4. `output` — render as markdown table

**Data shape expected:**
```yaml
members:
  - name: Alice
    role: Engineer
    skills: [Python, Go]
  - name: Bob
    role: Designer
    skills: [Figma, CSS]
```