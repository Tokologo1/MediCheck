# Dedicated runtime identity. Do not run Cloud Run with the default App Engine
# service account, which may carry unrelated project permissions.
resource "google_service_account" "runtime" {
  project      = var.project_id
  account_id   = "medicheck-runtime"
  display_name = "MediCheck Cloud Run runtime"
}

resource "google_project_iam_member" "runtime_cloud_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.runtime.email}"
}
