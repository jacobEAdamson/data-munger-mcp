---
name: easy-munge
description: Simplified munge with easy_munge — just path + jsonpath + fields
---

# Easy Munge — No Pipeline Syntax

Use `easy_munge` for quick data extraction without writing pipeline JSON.

**Tool:** `easy_munge` (simplified wrapper)

```json
{
  "path": "team.yaml",
  "jsonpath": "$.members[*]",
  "fields": ["name", "role", "email"],
  "output": "markdown"
}
```

**Optional extras:**
- `format` — override format detection (`"yaml"`, `"json"`, `"csv"`)
- `fieldMapping` — override auto-generated jsonpaths: `{ "role": "$.job_title" }`
- `template` — render each record with a Liquid template: `"{{name}} — {{role}}"`
- `outputPath` — write output to file instead of returning inline

**Tip:** `easy_munge` generates the same pipeline as `munge` internally. Builds `$.<fieldName>` jsonpath for each field automatically.