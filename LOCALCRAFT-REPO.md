# LocalCraft Site Repo Manifest

This file is the canonical link between this customer site and its hosting infrastructure. Any agent (Claude session, build skill, operator) MUST read this file before any git operation against this repo.

If the values below don't match the actual `git remote -v` + `git config user.email`, STOP. Something is misconfigured.

## Quick reference

- **Customer slug**: madison-county-roofing
- **GitHub repo**: jakesebok/madison-county-roofing-website
- **Vercel project**: madison-county-roofing-website
- **Production URL**: https://madison-county-roofing-website.vercel.app
- **Git identity**: jake@localcraftdigital.com / jakesebok

```json
{
  "schema_version": 1,
  "slug": "madison-county-roofing",
  "repo_path": "/Users/jakesebok/Repos/clients/madison-county-roofing/output-assets/html",
  "github": {
    "owner": "jakesebok",
    "name": "madison-county-roofing-website",
    "url_https": "https://github.com/jakesebok/madison-county-roofing-website.git",
    "url_ssh": "git@github.com:jakesebok/madison-county-roofing-website.git",
    "visibility": "private"
  },
  "vercel": {
    "project_name": "madison-county-roofing-website",
    "production_url": "https://madison-county-roofing-website.vercel.app",
    "created_at": null
  },
  "git_identity": {
    "email": "jake@localcraftdigital.com",
    "name": "jakesebok"
  },
  "created_at": "2026-05-25T19:00:00Z",
  "created_by": "customer-site-git:manifest-bootstrap"
}
```

## How this manifest is used

- `customer-site-git` skill reads this file FIRST on every operation. Mismatches abort the op.
- This site was built before BUILD-STANDARDS §17. The manifest was backfilled via `operation=manifest-bootstrap` on 2026-05-25T19:00:00Z.
- `vercel.created_at` is null because the Vercel project predates the manifest; operator can fill in if they have the original creation timestamp.

## What to do if this file is missing

If this manifest goes missing in the future, regenerate via:

```
customer-site-git slug=madison-county-roofing operation=manifest-bootstrap
```

Then visually verify the contents before any other operation.
