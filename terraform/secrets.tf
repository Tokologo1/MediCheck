# =============================================================================
# MediCheck — Secret Manager
# =============================================================================
# All secrets are auto-generated and stored in Secret Manager.
# Cloud Run pulls them at runtime via volume mounts — no plaintext env vars.
# =============================================================================

# ── Generate JWT secrets ──────────────────────────────────────────────────────
resource "random_password" "jwt_access_secret" {
  length  = 64
  special = false # Alphanumeric only — avoids shell escaping issues
}

resource "random_password" "jwt_refresh_secret" {
  length  = 64
  special = false
}

# ── Secret Manager resources ──────────────────────────────────────────────────

resource "google_secret_manager_secret" "db_url" {
  secret_id = "medicheck-db-url"
  project   = var.project_id

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "db_url" {
  secret      = google_secret_manager_secret.db_url.id
  secret_data = local.database_url

  depends_on = [google_sql_user.medicheck]
}

resource "google_secret_manager_secret" "jwt_access" {
  secret_id = "medicheck-jwt-access-secret"
  project   = var.project_id

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "jwt_access" {
  secret      = google_secret_manager_secret.jwt_access.id
  secret_data = random_password.jwt_access_secret.result
}

resource "google_secret_manager_secret" "jwt_refresh" {
  secret_id = "medicheck-jwt-refresh-secret"
  project   = var.project_id

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "jwt_refresh" {
  secret      = google_secret_manager_secret.jwt_refresh.id
  secret_data = random_password.jwt_refresh_secret.result
}

# ── IAM: Grant Cloud Run SA access to all secrets ────────────────────────────
locals {
  cloud_run_sa = google_service_account.runtime.email

  secret_ids = [
    google_secret_manager_secret.db_url.secret_id,
    google_secret_manager_secret.jwt_access.secret_id,
    google_secret_manager_secret.jwt_refresh.secret_id,
  ]
}

resource "google_secret_manager_secret_iam_member" "cloud_run_accessor" {
  for_each = toset(local.secret_ids)

  project   = var.project_id
  secret_id = each.value
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.cloud_run_sa}"
}
