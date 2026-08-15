---
name: transform-value
description: Chain multiple transforms on a single value with transform_value
---

# Transform Value — Chain Transforms

Run a value through a pipeline of transforms. Great for formatting dates, numbers, or cleaning strings.

**Tool:** `transform_value`

**Format a date:**
```json
{
  "value": "2024-01-15",
  "transforms": [
    { "to_date": { "input_format": "yyyy-MM-dd" } },
    { "format_date": { "output_format": "MM/dd/yyyy" } }
  ]
}
```

**Base64 encode + URL encode:**
```json
{
  "value": "Hello World",
  "transforms": ["base64_encode", "url_encode"]
}
```

**Strip digits from a string:**
```json
{
  "value": "Order #1234",
  "transforms": [
    { "regex": { "pattern": "\\\\d+", "replace": "" } },
    "trim"
  ]
}
```

**Tip:** Each transform feeds its output to the next in sequence. Single-string transforms (`"lower"`) take no config. Object transforms (`{ "regex": {...} }`) pass config.