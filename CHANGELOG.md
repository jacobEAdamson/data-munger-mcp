# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.0] - 2026-08-15

### Added
- Examples tools: `examples_list` and `examples_show` — browse usage examples at runtime with drift protection
- `build` job in CI — runs `npm run build`, replaces `typecheck` (compilation + copy-examples.mjs verification)

### Fixed
- `jsonpath` transform accepts `{ path }` config shape, preserves arrays/objects for downstream iteration
- HTML transforms (`html_to_md`, `html_escape`, `html_unescape`) registered as Liquid filters in template node
- `csv` format added to `munge`/`munge_graph` output schema
- Usage examples added to `describe_transforms` for all transforms
- `map` node preserves arrays/objects instead of `JSON.stringify` — enables `{{Skills | join: ", "}}` in templates
- `perRecord` option added to template Zod schema in `munge` and `munge_graph` tools

## [1.4.0] - 2026-07-29

### Added
- CSV output via `papaparse` — `output` node now supports `"csv"` format
- `perRecord` option on `template` node — template renders per-record with record as top-level Liquid context

### Fixed
- `jsonpath` transform returns empty in `transform_value` and `easy_convert` — jp.value passed {} as record
- `easy_munge` template now renders against mapped fields — `perRecord: true` enables direct field reference ({{field}})

## [1.3.0] - 2026-07-28

### Added
- `easy_munge` — flat-schema wrapper around `munge` pipeline: load file, extract records via jsonpath, pick fields, optionally template, output
- `easy_convert` — single-transform wrapper: apply base64/url/html/string transforms to a value or file contents

## [1.2.0] - 2026-07-26

### Added
- Date transforms: `date_add`, `date_diff`, `date_truncate`, `date_tz` — powered by date-fns
- `to_date` now accepts custom parse formats (`dd/MM/yyyy`) and timezone option
- `format_date` now uses date-fns format tokens (`yyyy-MM-dd`) with optional timezone
- `describe_transforms` — introspect all 25 value transforms with config shapes
- `describe_pipeline` — introspect all 10 pipeline node types with wiring info
- `describe_data` — infer schema of inline data or files (fields, types, samples)
- `bin/release-prepare` — create a release PR with version bump + changelog
- `bin/release` — tag and publish after PR merges

### Changed
- Transform metadata co-located in source files as static `transformMeta` constants
- Node metadata co-located in source files as static `nodeMeta` constants
- `describe_pipeline` reads from registry instead of hardcoded array

### Dependencies
- Added `date-fns` ^4.1.0
- Added `date-fns-tz` ^3.2.0

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
