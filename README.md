# thinwiki

A thin, opinionated headless wiki with few features.

- Git used as a backing store
- Markdown files with front matter used for pages
- index.md page in each directory is used as the page for the directory root, and also used to determine the nav link name
- Loads all pages into memory on startup, can be reloaded at runtime via a HTTP endpoint with an auth token

## Usage

Copy `.env.example` to `.env` and modify settings appropriately.

Alternatively, if using in a containerized environment, you can specify these settings via environment variables.
