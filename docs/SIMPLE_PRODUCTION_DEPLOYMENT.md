# Simple InfraWatch production deployment

This guide covers the routine deployment path from local source code to GitHub, private GHCR, and the production Ubuntu server.

Use this shortened process only for ordinary application changes that do not require a special database migration or infrastructure change. It intentionally excludes database backup and recovery procedures.

## Deployment flow

```text
Local source code
  -> infra-watch GitHub main
  -> GitHub Actions private GHCR image
  -> production image.env
  -> Docker Compose application update
```

## 1. Commit and push the application code

**Run in Windows Command Prompt:**

```bat
cd "C:\Users\Acer Nitro\Documents\InfraWatch\infra-watch"

git switch main
git pull --ff-only origin main
git status --short --branch
```

Run the quality checks:

```bat
bun test
bun run lint
bunx tsc --noEmit
bun run build
git diff --check
```

Stage only the files intended for this release. Replace the example paths with the files you changed:

```bat
git add path\to\changed-file path\to\another-file
git status
git diff --cached
```

Commit and push:

```bat
git commit -m "fix: describe the change"
git push origin main
```

Get the exact application commit SHA:

```bat
git rev-parse origin/main
```

Copy the complete 40-character SHA. It will be used as `APP_SHA` in the next step.

## 2. Build and publish the private Docker image

**Run in Windows Command Prompt:**

```bat
cd "C:\Users\Acer Nitro\Documents\InfraWatch\infra-watch-deploy"

git switch main
git pull --ff-only origin main
```

Start the GitHub Actions workflow. Replace `APP_SHA` with the 40-character SHA copied above:

```bat
gh workflow run build-staging.yml --ref main -f app_ref=APP_SHA
```

Find the new workflow run:

```bat
gh run list --workflow build-staging.yml --event workflow_dispatch --limit 3
```

Copy the numeric ID of the newest run. Replace `RUN_ID` in the next command with that number; do not enter the text `RUN_ID` literally.

```bat
gh run watch RUN_ID --exit-status
```

Continue only when every workflow step succeeds. Open the workflow summary:

```bat
gh run view RUN_ID --web
```

Copy the complete immutable image coordinate shown under **Immutable image**:

```text
ghcr.io/bafe-pkmdd/infra-watch-staging@sha256:<64-character-digest>
```

Always deploy the `@sha256:` coordinate. Do not deploy the moving `:staging` tag.

## 3. Connect to the production Ubuntu server

**Run in Windows Command Prompt:**

```bat
ssh -i "%USERPROFILE%\.ssh\infra_watch_ed25519" -o IdentitiesOnly=yes infra-watch@192.168.2.236
```

Enter the SSH key passphrase when prompted. Continue only after the prompt changes to something similar to:

```text
infra-watch@infra-watch:~$
```

## 4. Open and validate the deployment checkout

**Run on the Ubuntu server:**

```bash
cd "$HOME/infra-watch-deploy"

git status --short --branch
git pull --ff-only origin main

sudo docker compose --env-file ./image.env config --quiet
sudo docker compose --env-file ./image.env ps postgres18 app caddy
```

Continue only when PostgreSQL and the current application are healthy and Compose validation reports no error.

## 5. Set the new immutable image

Replace `PASTE_COMPLETE_IMMUTABLE_IMAGE_HERE` with the full GHCR coordinate copied from the workflow summary:

```bash
new_image='PASTE_COMPLETE_IMMUTABLE_IMAGE_HERE'

printf 'INFRAWATCH_IMAGE=%s\n' "$new_image" > image.env
chmod 600 image.env
```

Example format only:

```text
ghcr.io/bafe-pkmdd/infra-watch-staging@sha256:<64-character-digest>
```

## 6. Pull and deploy the application

**Run on the Ubuntu server:**

```bash
sudo docker compose --env-file ./image.env config --quiet &&
sudo docker compose --env-file ./image.env pull app &&
sudo docker compose --env-file ./image.env \
  up -d --no-deps --wait --wait-timeout 180 app &&
sudo docker compose --env-file ./image.env restart caddy
```

This updates only the application image. It does not recreate PostgreSQL.

## 7. Verify production

```bash
sudo docker compose --env-file ./image.env ps postgres18 app caddy

app_id="$(
  sudo docker compose --env-file ./image.env ps -q app
)"

sudo docker inspect \
  --format 'deployed_image={{.Config.Image}} health={{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' \
  "$app_id"

sudo docker compose --env-file ./image.env \
  logs --no-color --tail=100 app

curl -fsSI https://infra-watch.bafe.gov.ph
```

Expected results:

- The deployed image is the new immutable `@sha256:` coordinate.
- The application reports `health=healthy`.
- PostgreSQL remains healthy.
- Caddy remains running.
- The public HTTPS request returns `200` or an expected redirect.

Finally, open the site and perform a hard refresh with `Ctrl+F5`:

```text
https://infra-watch.bafe.gov.ph
```

## Quick command map

| Where | Purpose |
|---|---|
| Windows `infra-watch` checkout | Test, commit, and push application code |
| Windows `infra-watch-deploy` checkout | Build and publish the private GHCR image |
| Ubuntu `~/infra-watch-deploy` | Pull and deploy the immutable image |

Never commit or display production environment files, credentials, private keys, TLS keys, or database connection strings.
