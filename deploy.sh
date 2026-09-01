#!/usr/bin/env bash
# =============================================================================
# MediCheck – GCP Cloud Run Deployment Script (macOS/Linux)
# =============================================================================

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-project-fbd1d979-ca47-4901-bbf}"
REGION="${REGION:-us-central1}"
SERVICE_NAME="${SERVICE_NAME:-medicheck-web}"
REPO_NAME="${REPO_NAME:-medicheck}"
SQL_INSTANCE="${SQL_INSTANCE:-medicheck-db}"
SQL_TIER="${SQL_TIER:-db-g1-small}"
DB_NAME="${DB_NAME:-medicheck}"
DB_USER="${DB_USER:-medicheck}"
SKIP_AUTH=false
SKIP_SQL=false
SKIP_BUILD=false
SKIP_MIGRATE=false
SEED_DATABASE=false

for arg in "$@"; do
  case "$arg" in
    --skip-auth)      SKIP_AUTH=true ;;
    --skip-sql)       SKIP_SQL=true ;;
    --skip-build)     SKIP_BUILD=true ;;
    --skip-migrate)   SKIP_MIGRATE=true ;;
    --seed-database)  SEED_DATABASE=true ;;
    --project=*)      PROJECT_ID="${arg#*=}" ;;
    --region=*)       REGION="${arg#*=}" ;;
    --service=*)      SERVICE_NAME="${arg#*=}" ;;
    --repo=*)         REPO_NAME="${arg#*=}" ;;
    --sql-instance=*) SQL_INSTANCE="${arg#*=}" ;;
    --sql-tier=*)     SQL_TIER="${arg#*=}" ;;
    *) echo "Unknown flag: $arg" ;;
  esac
done

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; GRAY='\033[0;37m'; RESET='\033[0m'

echo ""
echo -e "${CYAN}+==============================================+${RESET}"
echo -e "${CYAN}|     MediCheck – GCP Deployment Script        |${RESET}"
echo -e "${CYAN}+==============================================+${RESET}"
echo ""
echo "  Project  : $PROJECT_ID"
echo "  Region   : $REGION"
echo "  Service  : $SERVICE_NAME"
echo "  SQL Tier : $SQL_TIER"
echo ""

if ! command -v gcloud &>/dev/null; then
  echo -e "${RED}[ERROR] gcloud CLI not found. Install Google Cloud SDK and add it to PATH.${RESET}"
  exit 1
fi

# STEP 1: Auth
if [ "$SKIP_AUTH" = false ]; then
  echo -e "${YELLOW}[AUTH] [1/8] Authenticating with GCP...${RESET}"
  gcloud auth login --update-adc
  gcloud config set project "$PROJECT_ID"
  gcloud config set run/region "$REGION"
  echo -e "${GREEN}[OK] Authenticated and project set to: $PROJECT_ID${RESET}"
else
  echo -e "${GRAY}[SKIP] [1/8] Skipping auth (--skip-auth)${RESET}"
  gcloud config set project "$PROJECT_ID"
fi

# STEP 2: Enable APIs
echo ""
echo -e "${YELLOW}[API] [2/8] Enabling required GCP APIs...${RESET}"
APIS=(
  run.googleapis.com sqladmin.googleapis.com secretmanager.googleapis.com
  artifactregistry.googleapis.com cloudbuild.googleapis.com
  servicenetworking.googleapis.com cloudresourcemanager.googleapis.com
)
for api in "${APIS[@]}"; do
  echo -e "${GRAY}  Enabling $api...${RESET}"
  gcloud services enable "$api" --project="$PROJECT_ID" --quiet
done
echo -e "${GREEN}[OK] All APIs enabled.${RESET}"

# STEP 3: Artifact Registry
echo ""
echo -e "${YELLOW}[REGISTRY] [3/8] Setting up Artifact Registry...${RESET}"
if ! gcloud artifacts repositories describe "$REPO_NAME" --location="$REGION" --project="$PROJECT_ID" &>/dev/null; then
  gcloud artifacts repositories create "$REPO_NAME" \
    --repository-format=docker --location="$REGION" \
    --description="MediCheck container images" --project="$PROJECT_ID"
  echo -e "${GREEN}[OK] Artifact Registry '$REPO_NAME' created.${RESET}"
else
  echo -e "${GREEN}[OK] Artifact Registry '$REPO_NAME' already exists.${RESET}"
fi
gcloud auth configure-docker "$REGION-docker.pkg.dev" --quiet
IMAGE_BASE="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$SERVICE_NAME"

# STEP 4: Cloud SQL
if [ "$SKIP_SQL" = false ]; then
  echo ""
  echo -e "${YELLOW}[SQL] [4/8] Setting up Cloud SQL (PostgreSQL 16)...${RESET}"
  echo -e "${YELLOW}  [WARN] This may take 5-10 minutes for first-time provisioning...${RESET}"

  if ! gcloud sql instances describe "$SQL_INSTANCE" --project="$PROJECT_ID" &>/dev/null; then
    gcloud sql instances create "$SQL_INSTANCE" \
      --database-version=POSTGRES_16 --tier="$SQL_TIER" --edition=ENTERPRISE --region="$REGION" \
      --storage-auto-increase --storage-type=SSD --storage-size=10GB \
      --backup-start-time=03:00 --maintenance-window-day=SUN \
      --maintenance-window-hour=04 --database-flags=max_connections=25 \
      --project="$PROJECT_ID"
    echo -e "${GREEN}[OK] Cloud SQL instance '$SQL_INSTANCE' created.${RESET}"
  else
    echo -e "${GREEN}[OK] Cloud SQL instance '$SQL_INSTANCE' already exists.${RESET}"
  fi

  if ! gcloud sql databases describe "$DB_NAME" --instance="$SQL_INSTANCE" --project="$PROJECT_ID" &>/dev/null; then
    gcloud sql databases create "$DB_NAME" --instance="$SQL_INSTANCE" --project="$PROJECT_ID"
    echo -e "${GREEN}[OK] Database '$DB_NAME' created.${RESET}"
  else
    echo -e "${GREEN}[OK] Database '$DB_NAME' already exists.${RESET}"
  fi

  set +o pipefail
  DB_PASSWORD=$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 32)
  set -o pipefail
  if ! gcloud sql users create "$DB_USER" --instance="$SQL_INSTANCE" \
      --password="$DB_PASSWORD" --project="$PROJECT_ID" &>/dev/null; then
    gcloud sql users set-password "$DB_USER" --instance="$SQL_INSTANCE" \
      --password="$DB_PASSWORD" --project="$PROJECT_ID"
  fi
  echo -e "${GREEN}[OK] Database user '$DB_USER' configured.${RESET}"

  CONNECTION_NAME=$(gcloud sql instances describe "$SQL_INSTANCE" \
    --project="$PROJECT_ID" --format="value(connectionName)")
  DB_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost/${DB_NAME}?host=/cloudsql/${CONNECTION_NAME}&schema=public"
else
  echo -e "${GRAY}[SKIP] [4/8] Skipping Cloud SQL creation (--skip-sql)${RESET}"
  CONNECTION_NAME=$(gcloud sql instances describe "$SQL_INSTANCE" \
    --project="$PROJECT_ID" --format="value(connectionName)")
  # Fetch existing DB URL from Secret Manager (set during a previous run)
  if DB_URL=$(gcloud secrets versions access latest \
      --secret="medicheck-db-url" --project="$PROJECT_ID" 2>/dev/null); then
    echo -e "${GREEN}  [OK] DATABASE_URL loaded from Secret Manager.${RESET}"
  else
    read -rp "  Enter existing DATABASE_URL for Cloud SQL: " DB_URL
  fi
fi

# STEP 5: Secret Manager
echo ""
echo -e "${YELLOW}[SECRET] [5/8] Configuring Secret Manager...${RESET}"
set +o pipefail
JWT_ACCESS_SECRET=$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 64)
JWT_REFRESH_SECRET=$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 64)
set -o pipefail

set_gcp_secret() {
  local name="$1" value="$2" tmp
  tmp=$(mktemp)
  printf '%s' "$value" > "$tmp"
  if ! gcloud secrets describe "$name" --project="$PROJECT_ID" &>/dev/null; then
    gcloud secrets create "$name" --replication-policy=automatic \
      --project="$PROJECT_ID" --data-file="$tmp"
    echo -e "${GREEN}  [OK] Secret '$name' created.${RESET}"
  else
    gcloud secrets versions add "$name" --project="$PROJECT_ID" --data-file="$tmp"
    echo -e "${GREEN}  [OK] Secret '$name' updated.${RESET}"
  fi
  rm -f "$tmp"
}

set_gcp_secret "medicheck-db-url"            "$DB_URL"
set_gcp_secret "medicheck-jwt-access-secret"  "$JWT_ACCESS_SECRET"
set_gcp_secret "medicheck-jwt-refresh-secret" "$JWT_REFRESH_SECRET"
echo -e "${GREEN}[OK] All secrets stored in Secret Manager.${RESET}"

# STEP 6: Cloud Build
if [ "$SKIP_BUILD" = false ]; then
  echo ""
  echo -e "${YELLOW}[BUILD] [6/8] Building Docker image with Cloud Build...${RESET}"
  echo -e "${YELLOW}  [WARN] This may take 5-10 minutes on first build...${RESET}"
  gcloud builds submit . \
    --config=cloudbuild.yaml \
    --substitutions="_REGION=$REGION,_REPO_NAME=$REPO_NAME,_SERVICE_NAME=$SERVICE_NAME" \
    --project="$PROJECT_ID" --timeout=20m
  echo -e "${GREEN}[OK] Docker image built and pushed to Artifact Registry.${RESET}"
else
  echo -e "${GRAY}[SKIP] [6/8] Skipping build (--skip-build)${RESET}"
fi

# STEP 7: Migrations
if [ "$SKIP_MIGRATE" = false ]; then
  echo ""
  echo -e "${YELLOW}[MIGRATE] [7/8] Running Prisma migrations via Cloud Run Job...${RESET}"
  MIGRATE_JOB="medicheck-migrate"
  SEED_ENV="SEED_DATABASE=false"
  [ "$SEED_DATABASE" = true ] && SEED_ENV="SEED_DATABASE=true"

  if ! gcloud run jobs describe "$MIGRATE_JOB" --region="$REGION" --project="$PROJECT_ID" &>/dev/null; then
    gcloud run jobs create "$MIGRATE_JOB" \
      --image="${IMAGE_BASE}:latest-migrate" --region="$REGION" --project="$PROJECT_ID" \
      --set-cloudsql-instances="$CONNECTION_NAME" \
      --set-secrets="DATABASE_URL=medicheck-db-url:latest" \
      --set-env-vars="NODE_ENV=production,$SEED_ENV" \
      --command="/bin/sh" --args="-c,sh scripts/run-migrations.sh" \
      --max-retries=1 --parallelism=1 --task-timeout=10m \
      --service-account="medicheck-runtime@${PROJECT_ID}.iam.gserviceaccount.com"
  else
    gcloud run jobs update "$MIGRATE_JOB" \
      --image="${IMAGE_BASE}:latest-migrate" --region="$REGION" --project="$PROJECT_ID" \
      --set-cloudsql-instances="$CONNECTION_NAME" \
      --set-secrets="DATABASE_URL=medicheck-db-url:latest" \
      --set-env-vars="NODE_ENV=production,$SEED_ENV"
  fi

  gcloud run jobs execute "$MIGRATE_JOB" --region="$REGION" --project="$PROJECT_ID" --wait
  echo -e "${GREEN}[OK] Prisma migrations applied successfully.${RESET}"
else
  echo -e "${GRAY}[SKIP] [7/8] Skipping migrations (--skip-migrate)${RESET}"
fi

# STEP 8: Deploy
echo ""
echo -e "${YELLOW}[DEPLOY] [8/8] Deploying to Cloud Run...${RESET}"
gcloud run deploy "$SERVICE_NAME" \
  --image="${IMAGE_BASE}:latest" \
  --region="$REGION" --project="$PROJECT_ID" --platform=managed \
  --allow-unauthenticated --port=3000 \
  --min-instances=0 --max-instances=10 --concurrency=80 \
  --cpu=1 --memory=512Mi \
  --set-cloudsql-instances="$CONNECTION_NAME" \
  --set-secrets="DATABASE_URL=medicheck-db-url:latest,JWT_ACCESS_SECRET=medicheck-jwt-access-secret:latest,JWT_REFRESH_SECRET=medicheck-jwt-refresh-secret:latest" \
  --set-env-vars="NODE_ENV=production" --timeout=60 \
  --service-account="medicheck-runtime@${PROJECT_ID}.iam.gserviceaccount.com"

SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
  --region="$REGION" --project="$PROJECT_ID" --format="value(status.url)")

echo -e "${GREEN}[OK] Cloud Run service deployed!${RESET}"

echo ""
echo -e "${YELLOW}[LINK] Updating NEXT_PUBLIC_APP_URL to $SERVICE_URL...${RESET}"
gcloud run services update "$SERVICE_NAME" \
  --region="$REGION" --project="$PROJECT_ID" \
  --update-env-vars="NEXT_PUBLIC_APP_URL=$SERVICE_URL" --quiet

echo ""
echo -e "${GREEN}+======================================================+${RESET}"
echo -e "${GREEN}|        ✅ MediCheck Deployed Successfully!            |${RESET}"
echo -e "${GREEN}+======================================================+${RESET}"
echo ""
echo -e "${CYAN}  🌐 App URL     : $SERVICE_URL${RESET}"
echo -e "${CYAN}  🗄️  DB Instance : $SQL_INSTANCE ($REGION)${RESET}"
echo -e "${CYAN}  📦 Image       : ${IMAGE_BASE}:latest${RESET}"
echo -e "${CYAN}  🔐 Secrets     : Secret Manager (medicheck-*)${RESET}"
echo ""
echo "  ℹ️  Demo Credentials:"
echo -e "${GRAY}     Admin : admin@medicheck.com / Admin@123${RESET}"
echo -e "${GRAY}     User  : john@example.com / User@123${RESET}"
echo ""
echo "  📋 GCP Console Links:"
echo -e "${GRAY}     Cloud Run : https://console.cloud.google.com/run?project=$PROJECT_ID${RESET}"
echo -e "${GRAY}     Cloud SQL : https://console.cloud.google.com/sql/instances?project=$PROJECT_ID${RESET}"
echo -e "${GRAY}     Logs      : https://console.cloud.google.com/logs?project=$PROJECT_ID${RESET}"
echo ""
