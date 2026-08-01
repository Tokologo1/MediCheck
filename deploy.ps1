# =============================================================================
# MediCheck ? GCP Cloud Run Deployment Script
# =============================================================================
# Services deployed:
#   - Artifact Registry (Docker image repo)
#   - Cloud SQL (PostgreSQL 16)
#   - Secret Manager (JWT secrets, DB URL)
#   - Cloud Build (image build)
#   - Cloud Run Job (DB migrations + seeding)
#   - Cloud Run Service (Next.js app)
# =============================================================================

param(
  [string]$ProjectId    = "project-fbd1d979-ca47-4901-bbf",
  [string]$Region       = "us-central1",
  [string]$ServiceName  = "medicheck-web",
  [string]$RepoName     = "medicheck",
  [string]$SqlInstance  = "medicheck-db",
  [string]$SqlTier      = "db-f1-micro",
  [string]$DbName       = "medicheck",
  [string]$DbUser       = "medicheck",
  [switch]$SkipAuth,
  [switch]$SkipSql,
  [switch]$SkipBuild,
  [switch]$SkipMigrate,
  [switch]$SeedDatabase
)

$ErrorActionPreference = "Stop"

# Resolve gcloud from PATH. This supports both the standard installer and a custom SDK location.
$GcloudCommand = Get-Command gcloud.cmd -ErrorAction SilentlyContinue
if (-not $GcloudCommand) { $GcloudCommand = Get-Command gcloud.exe -ErrorAction SilentlyContinue }
if (-not $GcloudCommand) { throw "gcloud CLI not found. Install Google Cloud SDK and add it to PATH." }
function gcloud { & $script:GcloudCommand.Source @args }

Write-Host ""
Write-Host "+==============================================+" -ForegroundColor Cyan
Write-Host "|     MediCheck ? GCP Deployment Script        |" -ForegroundColor Cyan
Write-Host "+==============================================+" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Project  : $ProjectId" -ForegroundColor White
Write-Host "  Region   : $Region" -ForegroundColor White
Write-Host "  Service  : $ServiceName" -ForegroundColor White
Write-Host "  SQL Tier : $SqlTier" -ForegroundColor White
Write-Host ""

# ---------------------------------------------
# STEP 1: GCP Authentication
# ---------------------------------------------
if (-not $SkipAuth) {
  Write-Host "[AUTH] [1/8] Authenticating with GCP..." -ForegroundColor Yellow
  gcloud auth login --update-adc
  gcloud config set project $ProjectId
  gcloud config set run/region $Region
  Write-Host "[OK] Authenticated and project set to: $ProjectId" -ForegroundColor Green
} else {
  Write-Host "[SKIP]  [1/8] Skipping auth (--SkipAuth)" -ForegroundColor Gray
  gcloud config set project $ProjectId
}

# ---------------------------------------------
# STEP 2: Enable Required APIs
# ---------------------------------------------
Write-Host ""
Write-Host "[API] [2/8] Enabling required GCP APIs..." -ForegroundColor Yellow

$apis = @(
  "run.googleapis.com",
  "sqladmin.googleapis.com",
  "secretmanager.googleapis.com",
  "artifactregistry.googleapis.com",
  "cloudbuild.googleapis.com",
  "servicenetworking.googleapis.com",
  "cloudresourcemanager.googleapis.com"
)

foreach ($api in $apis) {
  Write-Host "  Enabling $api..." -ForegroundColor Gray
  gcloud services enable $api --project=$ProjectId --quiet
}
Write-Host "[OK] All APIs enabled." -ForegroundColor Green

# ---------------------------------------------
# STEP 3: Artifact Registry
# ---------------------------------------------
Write-Host ""
Write-Host "[REGISTRY] [3/8] Setting up Artifact Registry..." -ForegroundColor Yellow

$registryExists = gcloud artifacts repositories describe $RepoName --location=$Region --project=$ProjectId 2>&1
if ($LASTEXITCODE -ne 0) {
  gcloud artifacts repositories create $RepoName `
    --repository-format=docker `
    --location=$Region `
    --description="MediCheck container images" `
    --project=$ProjectId
  Write-Host "[OK] Artifact Registry '$RepoName' created." -ForegroundColor Green
} else {
  Write-Host "[OK] Artifact Registry '$RepoName' already exists." -ForegroundColor Green
}

# Configure Docker to authenticate with Artifact Registry
gcloud auth configure-docker "$Region-docker.pkg.dev" --quiet

$ImageBase = "$Region-docker.pkg.dev/$ProjectId/$RepoName/$ServiceName"

# ---------------------------------------------
# STEP 4: Cloud SQL (PostgreSQL 16)
# ---------------------------------------------
if (-not $SkipSql) {
  Write-Host ""
  Write-Host "[SQL]  [4/8] Setting up Cloud SQL (PostgreSQL 16)..." -ForegroundColor Yellow
  Write-Host "  [WARN]  This may take 5?10 minutes for first-time provisioning..." -ForegroundColor DarkYellow

  $sqlExists = gcloud sql instances describe $SqlInstance --project=$ProjectId 2>&1
  if ($LASTEXITCODE -ne 0) {
    gcloud sql instances create $SqlInstance `
      --database-version=POSTGRES_16 `
      --tier=$SqlTier `
      --region=$Region `
      --storage-auto-increase `
      --storage-type=SSD `
      --storage-size=10GB `
      --backup-start-time=03:00 `
      --maintenance-window-day=SUN `
      --maintenance-window-hour=04 `
      --database-flags=max_connections=25 `
      --project=$ProjectId
    Write-Host "[OK] Cloud SQL instance '$SqlInstance' created." -ForegroundColor Green
  } else {
    Write-Host "[OK] Cloud SQL instance '$SqlInstance' already exists." -ForegroundColor Green
  }

  # Create database
  $dbExists = gcloud sql databases describe $DbName --instance=$SqlInstance --project=$ProjectId 2>&1
  if ($LASTEXITCODE -ne 0) {
    gcloud sql databases create $DbName --instance=$SqlInstance --project=$ProjectId
    Write-Host "[OK] Database '$DbName' created." -ForegroundColor Green
  } else {
    Write-Host "[OK] Database '$DbName' already exists." -ForegroundColor Green
  }

  # Generate and set DB user password
  $DbPassword = -join ((65..90) + (97..122) + (48..57) + (33, 35, 36, 42, 43, 45) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
  gcloud sql users create $DbUser `
    --instance=$SqlInstance `
    --password=$DbPassword `
    --project=$ProjectId 2>&1 | Out-Null

  if ($LASTEXITCODE -ne 0) {
    # User may already exist ? update password
    gcloud sql users set-password $DbUser `
      --instance=$SqlInstance `
      --password=$DbPassword `
      --project=$ProjectId
  }
  Write-Host "[OK] Database user '$DbUser' configured." -ForegroundColor Green

  # Get Cloud SQL connection name
  $ConnectionName = gcloud sql instances describe $SqlInstance `
    --project=$ProjectId `
    --format="value(connectionName)"

  # Build the database URL (using Cloud SQL Unix socket path for Cloud Run)
  $DbUrl = "postgresql://${DbUser}:${DbPassword}@localhost/${DbName}?host=/cloudsql/${ConnectionName}&schema=public"

  # Store DB info for secrets step
  $script:ConnectionName = $ConnectionName
  $script:DbUrl = $DbUrl
  $script:DbPassword = $DbPassword
} else {
  Write-Host "[SKIP]  [4/8] Skipping Cloud SQL creation (--SkipSql)" -ForegroundColor Gray
  $script:ConnectionName = gcloud sql instances describe $SqlInstance --project=$ProjectId --format="value(connectionName)"
  # Prompt for existing DB URL
  $script:DbUrl = Read-Host "  Enter existing DATABASE_URL for Cloud SQL"
}

# ---------------------------------------------
# STEP 5: Secret Manager
# ---------------------------------------------
Write-Host ""
Write-Host "[SECRET] [5/8] Configuring Secret Manager..." -ForegroundColor Yellow

# Generate strong JWT secrets
$JwtAccessSecret  = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object { [char]$_ })
$JwtRefreshSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object { [char]$_ })

function Set-GcpSecret {
  param([string]$SecretName, [string]$SecretValue)
  $exists = gcloud secrets describe $SecretName --project=$ProjectId 2>&1
  if ($LASTEXITCODE -ne 0) {
    $SecretValue | gcloud secrets create $SecretName `
      --replication-policy=automatic `
      --project=$ProjectId `
      --data-file=-
    Write-Host "  [OK] Secret '$SecretName' created." -ForegroundColor Green
  } else {
    $SecretValue | gcloud secrets versions add $SecretName `
      --project=$ProjectId `
      --data-file=-
    Write-Host "  [OK] Secret '$SecretName' updated." -ForegroundColor Green
  }
}

Set-GcpSecret -SecretName "medicheck-db-url"           -SecretValue $script:DbUrl
Set-GcpSecret -SecretName "medicheck-jwt-access-secret"  -SecretValue $JwtAccessSecret
Set-GcpSecret -SecretName "medicheck-jwt-refresh-secret" -SecretValue $JwtRefreshSecret

Write-Host "[OK] All secrets stored in Secret Manager." -ForegroundColor Green

# ---------------------------------------------
# STEP 6: Build Docker Image with Cloud Build
# ---------------------------------------------
if (-not $SkipBuild) {
  Write-Host ""
  Write-Host "[BUILD] [6/8] Building Docker image with Cloud Build..." -ForegroundColor Yellow
  Write-Host "  [WARN]  This may take 5?10 minutes on first build..." -ForegroundColor DarkYellow

  gcloud builds submit . `
    --config=cloudbuild.yaml `
    --substitutions="_REGION=$Region,_REPO_NAME=$RepoName,_SERVICE_NAME=$ServiceName" `
    --project=$ProjectId `
    --timeout=20m

  if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Cloud Build failed. Check logs above." -ForegroundColor Red
    exit 1
  }
  Write-Host "[OK] Docker image built and pushed to Artifact Registry." -ForegroundColor Green
} else {
  Write-Host "[SKIP]  [6/8] Skipping build (--SkipBuild)" -ForegroundColor Gray
}

# ---------------------------------------------
# STEP 7: Run Prisma Migrations (Cloud Run Job)
# ---------------------------------------------
if (-not $SkipMigrate) {
  Write-Host ""
  Write-Host "[MIGRATE] [7/8] Running Prisma migrations via Cloud Run Job..." -ForegroundColor Yellow

  $MigrateJobName = "medicheck-migrate"
  $SeedEnv = if ($SeedDatabase) { "SEED_DATABASE=true" } else { "SEED_DATABASE=false" }

  # Create or update the migration job
  $jobExists = gcloud run jobs describe $MigrateJobName --region=$Region --project=$ProjectId 2>&1
  if ($LASTEXITCODE -ne 0) {
    gcloud run jobs create $MigrateJobName `
      --image="$ImageBase`:latest-migrate" `
      --region=$Region `
      --project=$ProjectId `
      --set-cloudsql-instances=$script:ConnectionName `
      --set-secrets="DATABASE_URL=medicheck-db-url:latest" `
      --set-env-vars="NODE_ENV=production,$SeedEnv" `
      --command="/bin/sh" `
      --args="-c,sh scripts/run-migrations.sh" `
      --max-retries=1 `
      --parallelism=1 `
      --task-timeout=10m `
      --service-account="$ProjectId@appspot.gserviceaccount.com"
  } else {
    gcloud run jobs update $MigrateJobName `
      --image="$ImageBase`:latest-migrate" `
      --region=$Region `
      --project=$ProjectId `
      --set-cloudsql-instances=$script:ConnectionName `
      --set-secrets="DATABASE_URL=medicheck-db-url:latest" `
      --set-env-vars="NODE_ENV=production,$SeedEnv"
  }

  # Execute the migration job
  gcloud run jobs execute $MigrateJobName `
    --region=$Region `
    --project=$ProjectId `
    --wait

  if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Migration job failed. Check Cloud Run Job logs." -ForegroundColor Red
    exit 1
  }
  Write-Host "[OK] Prisma migrations applied successfully." -ForegroundColor Green
} else {
  Write-Host "[SKIP]  [7/8] Skipping migrations (--SkipMigrate)" -ForegroundColor Gray
}

# ---------------------------------------------
# STEP 8: Deploy Cloud Run Service
# ---------------------------------------------
Write-Host ""
Write-Host "[DEPLOY] [8/8] Deploying to Cloud Run..." -ForegroundColor Yellow

gcloud run deploy $ServiceName `
  --image="$ImageBase`:latest" `
  --region=$Region `
  --project=$ProjectId `
  --platform=managed `
  --allow-unauthenticated `
  --port=3000 `
  --min-instances=0 `
  --max-instances=10 `
  --concurrency=80 `
  --cpu=1 `
  --memory=512Mi `
  --set-cloudsql-instances=$script:ConnectionName `
  --set-secrets="DATABASE_URL=medicheck-db-url:latest,JWT_ACCESS_SECRET=medicheck-jwt-access-secret:latest,JWT_REFRESH_SECRET=medicheck-jwt-refresh-secret:latest" `
  --set-env-vars="NODE_ENV=production" `
  --timeout=60 `
  --service-account="$ProjectId@appspot.gserviceaccount.com"

if ($LASTEXITCODE -ne 0) {
  Write-Host "[FAIL] Cloud Run deployment failed. Check logs above." -ForegroundColor Red
  exit 1
}

# Get the deployed service URL
$ServiceUrl = gcloud run services describe $ServiceName `
  --region=$Region `
  --project=$ProjectId `
  --format="value(status.url)"

Write-Host "[OK] Cloud Run service deployed!" -ForegroundColor Green

# Update NEXT_PUBLIC_APP_URL now that we have the real URL
Write-Host ""
Write-Host "[LINK] Updating NEXT_PUBLIC_APP_URL to $ServiceUrl..." -ForegroundColor Yellow
gcloud run services update $ServiceName `
  --region=$Region `
  --project=$ProjectId `
  --update-env-vars="NEXT_PUBLIC_APP_URL=$ServiceUrl" `
  --quiet

# ---------------------------------------------
# DEPLOYMENT SUMMARY
# ---------------------------------------------
Write-Host ""
Write-Host "+======================================================+" -ForegroundColor Green
Write-Host "|        [SUCCESS] MediCheck Deployed Successfully!           |" -ForegroundColor Green
Write-Host "+======================================================+" -ForegroundColor Green
Write-Host ""
Write-Host "  [WEB] App URL     : $ServiceUrl" -ForegroundColor Cyan
Write-Host "  [SQL]  DB Instance : $SqlInstance ($Region)" -ForegroundColor Cyan
Write-Host "  [REGISTRY] Image       : $ImageBase`:latest" -ForegroundColor Cyan
Write-Host "  [SECRET] Secrets     : Secret Manager (medicheck-*)" -ForegroundColor Cyan
Write-Host ""
Write-Host "  [INFO] Demo Credentials:" -ForegroundColor White
Write-Host "     Admin : admin@medicheck.com / Admin@123" -ForegroundColor Gray
Write-Host "     User  : john@example.com / User@123" -ForegroundColor Gray
Write-Host ""
Write-Host "  [LOGS] GCP Console Links:" -ForegroundColor White
Write-Host "     Cloud Run  : https://console.cloud.google.com/run?project=$ProjectId" -ForegroundColor Gray
Write-Host "     Cloud SQL  : https://console.cloud.google.com/sql/instances?project=$ProjectId" -ForegroundColor Gray
Write-Host "     Logs       : https://console.cloud.google.com/logs?project=$ProjectId" -ForegroundColor Gray
Write-Host ""
