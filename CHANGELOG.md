# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-07-26

### Added
- Encode/decode transforms: `base64_encode`, `base64_decode`, `url_encode`, `url_decode`, `html_escape`, `html_unescape`
- `bin/push-tag` utility script for pushing tags through tag protection rulesets

## [1.0.0] - 2026-07-26

### Added
- Initial release
- `munge` — linear pipeline mode (load, records, map, sort, limit, group, output)
- `munge_graph` — DAG mode with joins, branching, multi-source
- `transform_value` — single-value transform pipeline
- Value transforms: `jsonpath`, `concat`, `template`, `regex`, `html_to_md`, `upper`, `lower`, `trim`, `to_number`, `to_string`, `to_date`, `format_number`, `format_date`, `round`, `truncate`
- Support for JSON, YAML, and CSV input
- Markdown, JSON, and YAML output
- MCP server integration for Claude Code
- npm provenance support for trusted publishing