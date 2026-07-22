# Contributing

## Getting started

```bash
git clone https://github.com/omar-hindawi98/goldsrc-query.git
cd goldsrc-query
npm install
```

## Development workflow

```bash
npm run dev          # compile in watch mode
npm test             # run unit tests
npm run test:watch   # run unit tests in watch mode
npm run check        # lint + format (auto-fix)
```

## E2E tests

E2E tests require Docker and an **x86-64 host** — HLDS does not run under QEMU on Apple Silicon.

```bash
npm run test:e2e
```

The Docker container is defined in `docker-compose.yml` and starts a HLDS server automatically.

## Commits

This project follows [Conventional Commits](https://www.conventionalcommits.org). Your commit message must match the format:

```
<type>(<scope>): <description>

feat(rcon): add reconnect support
fix(udp): handle truncated split packets
docs: update README examples
```

Common types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.

Commit messages are validated automatically on commit via Husky + commitlint.

## Pull requests

- Keep PRs focused — one concern per PR
- Add or update tests for any changed behaviour
- Make sure `npm run check:ci`, `npm run build`, and `npm test` all pass before opening a PR
- Fill in the PR template (What / Why / How to test)

## Releasing

Releases are automated via [Release Please](https://github.com/googleapis/release-please). Merging a PR with conventional commits to `main` will open or update a release PR automatically. No manual versioning needed.
