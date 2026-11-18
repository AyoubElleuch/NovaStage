# Google Cloud architecture icons

62 service SVGs are bundled locally from the [official Google Cloud icon library](https://cloud.google.com/icons), retrieved on November 18, 2026.

- [Core product icons](https://services.google.com/fh/files/misc/core-products-icons.zip): the current multicolor artwork where available.
- [Legacy console icons](https://services.google.com/fh/files/misc/google-cloud-legacy-icons.zip): service-specific artwork for the remaining catalog entries.

The SVG contents are unmodified; filenames follow stable NovaStage service IDs. Google owns the artwork and trademarks. Follow the source library's usage guidance. No affiliation or endorsement is implied.

The toolbar cloud mark uses [Simple Icons' Google Cloud SVG](https://github.com/simple-icons/simple-icons/blob/develop/icons/googlecloud.svg) (CC0), matching the existing AWS mark's treatment.

Searchable names, aliases, categories and starter configuration live in src/lib/canvas/gcp-catalog.json. This curated canvas catalog covers compute, containers, storage, databases, networking, integration, analytics, AI, security, observability and developer tools; it is not a complete Google Cloud product inventory. Product naming follows [Google Cloud's product catalog](https://cloud.google.com/products), including Cloud Run functions and Gemini platform, with legacy names searchable as aliases. The Vertex AI artwork remains the icon supplied in Google's downloadable core package for that platform.

Keep service IDs stable when updating names or artwork. Validate new SVGs, provider metadata and search aliases with the cloud service tests.
