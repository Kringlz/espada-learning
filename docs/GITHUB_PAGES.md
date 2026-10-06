# GitHub repository and free demo hosting

- Repository: [Kringlz/espada-learning](https://github.com/Kringlz/espada-learning)
- Website: [Espada Learning](https://kringlz.github.io/espada-learning/)
- Design preview: [Espada · Линия](https://kringlz.github.io/espada-learning/design-lab/preview.html?v=m)
- [Section illustrations](https://kringlz.github.io/espada-learning/design-lab/illustrations.html)

The public repository contains the app source, tests, migrations and documentation. Build output,
local records, uploaded videos, credentials and the original private brief are not committed.
The release history starts in [CHANGELOG.md](../CHANGELOG.md).

## Deployment

In repository Settings → Pages, set Source to **GitHub Actions**. The workflow
`.github/workflows/pages.yml` checks types and tests, builds the public local-data demo and deploys
it on pushes to `main`. Pull requests build and check without publishing. It uses GitHub's
short-lived deployment token; no personal access token or cloud secret belongs in this repository.

The project path is derived from the repository name, for example `/espada-learning`.
`app.config.ts` supplies that path to Expo, including scripts, fonts and bundled assets.
Ordinary local development uses the domain root. A renamed repository is handled by the next build.

Local reproduction:

```sh
npm ci
npm run check
EXPO_NO_DOTENV=1 EXPO_PUBLIC_DATA_MODE=demo GITHUB_PAGES_BASE_PATH=/espada-learning npm run build:pages
```

## Scope

Pages is static web hosting. The hosted app starts with synthetic demo accounts and keeps
changes/videos in that visitor's browser. It does not sync teacher/student devices, store real
accounts centrally or replace Supabase Auth/PostgreSQL/Storage. Localhost demo data is not copied
to the public site. Clearing the site's browser storage removes that visitor's demo data.

Do not enter real student records into this public demo. For a real pilot, configure the separate
backend described in [BACKEND.md](BACKEND.md) and change the hosting environment deliberately.

On GitHub Free, Pages requires a public repository. Reference:
https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
