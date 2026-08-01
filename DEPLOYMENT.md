# Deployment

Infrastructure is provisioned once with Terraform or `deploy.ps1`. Normal releases use the manual GitHub Actions workflow, which builds immutable application and migration images, runs migrations, then updates Cloud Run.

## GitHub setup

Repository: `https://github.com/Tokologo1/MediCheck`

Create a protected `production` GitHub environment. Configure these repository variables:

- `GCP_PROJECT_ID`
- `GCP_REGION` (optional; defaults to `us-central1`)
- `ARTIFACT_REPOSITORY` (optional; defaults to `medicheck`)
- `CLOUD_RUN_SERVICE` (optional; defaults to `medicheck-web`)
- `MIGRATION_JOB` (optional; defaults to `medicheck-migrate`)

Configure these `production` environment secrets for Google Workload Identity Federation:

- `GCP_WORKLOAD_IDENTITY_PROVIDER`: `projects/1023992607262/locations/global/workloadIdentityPools/github/providers/github`
- `GCP_SERVICE_ACCOUNT`: `medicheck-github-deployer@project-fbd1d979-ca47-4901-bbf.iam.gserviceaccount.com`

Grant that service account Cloud Build, Artifact Registry, Cloud Run, and service-account impersonation permissions. Do not store a JSON service-account key in GitHub.

## First migration

New databases run `prisma migrate deploy` automatically. An existing database created with `prisma db push` must be baselined once, after confirming its schema matches this repository:

```powershell
npx prisma migrate resolve --applied 20260801000000_init
```

Then use **Actions > Deploy to Cloud Run > Run workflow**. CI runs lint and production build on pull requests and `main` pushes.
