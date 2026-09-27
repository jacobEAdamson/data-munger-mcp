# Contributing

Thanks for your interest in data-munger-mcp!

## Report Bugs

Open an issue with:
- What you expected vs what happened
- Minimal input data to reproduce
- The tool and pipeline you ran

## Suggest Features

Open an issue describing the transform or workflow you want. Include example input/output if possible.

## Pull Requests

1. Branch from `master`
2. Run `npm ci` then `npm run build` to verify it compiles
3. Add tests for new transforms or tools
4. Run `npm test` — all tests must pass
5. Run `npm run lint` — zero errors, zero warnings
6. Open a PR against `master`

### Conventions

- Code: TypeScript, strict mode
- Tests: Jest, alongside source as `*.test.ts`
- Commits: conventional commits (`feat:`, `fix:`, `docs:`, etc.)
- Transforms: implement the `ValueTransform` interface in `src/transforms/`
- Pipelines: add example pipelines to `examples/` and register in `src/data/examples.ts`