---
name: easy-convert
description: Apply a single transform to a value or file with easy_convert
---

# Easy Convert — Single Transform

Apply one transform to a value or file. Simpler than `transform_value` — single transform, optional file read/write.

**Tool:** `easy_convert`

**Transform a value inline:**
```json
{
  "value": "Hello World",
  "transform": "lower"
}
```

**Read file, transform, return:**
```json
{
  "path": "content.html",
  "transform": "html_to_md"
}
```

**Read file, transform, write to new file:**
```json
{
  "path": "dirty.csv",
  "transform": "trim",
  "outputPath": "clean.csv"
}
```

**Available transforms:** `base64_encode`, `base64_decode`, `url_encode`, `url_decode`, `html_escape`, `html_unescape`, `html_to_md`, `upper`, `lower`, `trim`, `to_number`, `to_string`.