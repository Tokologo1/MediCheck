# =============================================================================
# MediCheck -- GCP Teardown Script
# =============================================================================
# Deletes ALL cloud resources for MediCheck in the correct dependency order.
#
# WARNING: This permanently destroys all data including the Cloud SQL DB.
#
# Usage:
#   .\teardown.ps1                    # Interactive confirmation
#   .\teardown.ps1 -Force             # Skip confirmation (CI/CD)
#   .\teardown.ps1 -WhatIf            # Dry-run: show what would be deleted
#
# Resources deleted (in order):
#   1. Cloud Run Service  (medicheck-web)
#   2. Cloud Run Job      (medicheck-migrate)
#   3. Cloud SQL          (medicheck-db -- instance, database, user)
#   4. Artifact Registry  (medicheck)
#   5. Secret Manager     (medicheck-db-url, medicheck-jwt-access-secret,
#                          medicheck-jwt-refresh-secret)
# =============================================================================

param(
  [string]$ProjectId   = "project-fbd1d979-ca47-4901-bbf",
  [string]$Region      = "us-central1",
  [string]$ServiceName = "medicheck-web",
  [string]$JobName     = "medicheck-migrate",
  [string]$RepoName    = "medicheck",
  [string]$SqlInstance = "medicheck-db",
  [string]$DbName      = "medicheck",
  [string]$DbUser      = "medicheck",
  [switch]$Force,
  [switch]$WhatIf
)

$ErrorActionPreference = "Stop"

# Call gcloud directly via its CMD wrapper (avoids nested powershell hang)
$GcloudCmd = "$env:USERPROFILE\google-cloud-sdk\google-cloud-sdk\bin\gcloud.cmd"
if (-not (Test-Path $GcloudCmd)) {
  # Fallback: assume gcloud is on PATH
  $GcloudCmd = "gcloud"
}
function gcloud { & $GcloudCmd @args }

# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------
function Write-Step ([string]$msg) {
  Write-Host ""
  Write-Host $msg -ForegroundColor Yellow
}

function Write-Ok ([string]$msg) {
  Write-Host "  [OK]   $msg" -ForegroundColor Green
}

function Write-Skip ([string]$msg) {
  Write-Host "  [SKIP] $msg (not found -- skipping)" -ForegroundColor Gray
}

function Write-Dry ([string]$msg) {
  Write-Host "  [WHATIF] Would delete: $msg" -ForegroundColor Cyan
}

function Remove-Resource ([string]$label, [scriptblock]$checkCmd, [scriptblock]$deleteCmd) {
  $null = & $checkCmd 2>&1
  if ($LASTEXITCODE -eq 0) {
    if ($WhatIf) {
      Write-Dry $label
    } else {
      & $deleteCmd
      Write-Ok "$label deleted."
    }
  } else {
    Write-Skip $label
  }
}

# -----------------------------------------------------------------------------
# Banner
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "========================================================" -ForegroundColor Red
Write-Host "       MediCheck -- GCP TEARDOWN SCRIPT                " -ForegroundColor Red
Write-Host "========================================================" -ForegroundColor Red
Write-Host ""
Write-Host "  Project  : $ProjectId" -ForegroundColor White
Write-Host "  Region   : $Region"    -ForegroundColor White
if ($WhatIf) {
  Write-Host "  Mode     : DRY RUN (WhatIf) -- nothing will be deleted" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "  Resources to delete:" -ForegroundColor White
Write-Host "    * Cloud Run Service : $ServiceName"                                 -ForegroundColor Gray
Write-Host "    * Cloud Run Job     : $JobName"                                     -ForegroundColor Gray
Write-Host "    * Cloud SQL         : $SqlInstance (+ DB '$DbName', user '$DbUser')" -ForegroundColor Gray
Write-Host "    * Artifact Registry : $RepoName"                                    -ForegroundColor Gray
Write-Host "    * Secrets           : medicheck-db-url, medicheck-jwt-access-secret, medicheck-jwt-refresh-secret" -ForegroundColor Gray
Write-Host ""

# -----------------------------------------------------------------------------
# Confirmation
# -----------------------------------------------------------------------------
if (-not $Force -and -not $WhatIf) {
  Write-Host "  WARNING: This action is IRREVERSIBLE. All Cloud SQL data will be lost." -ForegroundColor Red
  Write-Host ""
  $confirm = Read-Host "  Type DELETE to confirm teardown"
  if ($confirm -ne "DELETE") {
    Write-Host ""
    Write-Host "  Teardown cancelled. No resources were deleted." -ForegroundColor Green
    exit 0
  }
}

# Set active project
gcloud config set project $ProjectId --quiet

# -----------------------------------------------------------------------------
# STEP 1: Cloud Run Service
# -----------------------------------------------------------------------------
Write-Step "[1/5] Deleting Cloud Run Service: $ServiceName..."
Remove-Resource `
  "Cloud Run Service '$ServiceName'" `
  { gcloud run services describe $ServiceName --region=$Region --project=$ProjectId } `
  { gcloud run services delete $ServiceName --region=$Region --project=$ProjectId --quiet }

# -----------------------------------------------------------------------------
# STEP 2: Cloud Run Job
# -----------------------------------------------------------------------------
Write-Step "[2/5] Deleting Cloud Run Job: $JobName..."
Remove-Resource `
  "Cloud Run Job '$JobName'" `
  { gcloud run jobs describe $JobName --region=$Region --project=$ProjectId } `
  { gcloud run jobs delete $JobName --region=$Region --project=$ProjectId --quiet }

# -----------------------------------------------------------------------------
# STEP 3: Cloud SQL
# -----------------------------------------------------------------------------
Write-Step "[3/5] Deleting Cloud SQL instance: $SqlInstance..."

$null = gcloud sql instances describe $SqlInstance --project=$ProjectId 2>&1
if ($LASTEXITCODE -eq 0) {
  if ($WhatIf) {
    Write-Dry "Cloud SQL instance '$SqlInstance' (+ all databases and users)"
  } else {
    Write-Host "  Disabling deletion protection on '$SqlInstance'..." -ForegroundColor Gray
    gcloud sql instances patch $SqlInstance `
      --project=$ProjectId `
      --no-deletion-protection `
      --quiet

    gcloud sql instances delete $SqlInstance `
      --project=$ProjectId `
      --quiet
    Write-Ok "Cloud SQL instance '$SqlInstance' deleted (all databases and users removed)."
  }
} else {
  Write-Skip "Cloud SQL instance '$SqlInstance'"
}

# -----------------------------------------------------------------------------
# STEP 4: Artifact Registry
# -----------------------------------------------------------------------------
Write-Step "[4/5] Deleting Artifact Registry repository: $RepoName..."
Remove-Resource `
  "Artifact Registry '$RepoName'" `
  { gcloud artifacts repositories describe $RepoName --location=$Region --project=$ProjectId } `
  { gcloud artifacts repositories delete $RepoName --location=$Region --project=$ProjectId --quiet }

# -----------------------------------------------------------------------------
# STEP 5: Secret Manager
# -----------------------------------------------------------------------------
Write-Step "[5/5] Deleting Secret Manager secrets..."

$secrets = @(
  "medicheck-db-url",
  "medicheck-jwt-access-secret",
  "medicheck-jwt-refresh-secret"
)

foreach ($secret in $secrets) {
  Remove-Resource `
    "Secret '$secret'" `
    { gcloud secrets describe $secret --project=$ProjectId } `
    { gcloud secrets delete $secret --project=$ProjectId --quiet }
}

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------
Write-Host ""
if ($WhatIf) {
  Write-Host "========================================================" -ForegroundColor Cyan
  Write-Host "  Dry-run complete. No resources were deleted.          " -ForegroundColor Cyan
  Write-Host "========================================================" -ForegroundColor Cyan
  Write-Host ""
  Write-Host "  Run without -WhatIf to perform actual teardown." -ForegroundColor White
} else {
  Write-Host "========================================================" -ForegroundColor Green
  Write-Host "  MediCheck GCP environment torn down successfully.     " -ForegroundColor Green
  Write-Host "========================================================" -ForegroundColor Green
  Write-Host ""
  Write-Host "  To re-provision, use:" -ForegroundColor White
  Write-Host "    terraform -chdir=terraform init" -ForegroundColor Gray
  Write-Host "    terraform -chdir=terraform apply" -ForegroundColor Gray
}
Write-Host ""
