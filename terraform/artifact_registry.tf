# =============================================================================
# MediCheck — Artifact Registry
# =============================================================================

resource "google_artifact_registry_repository" "docker" {
  project       = var.project_id
  location      = var.region
  repository_id = var.repo_name
  format        = "DOCKER"
  description   = "MediCheck container images"

  depends_on = [google_project_service.apis]
}

# Cloud Build runs with the default Compute service account in this project.
# Grant it push access only to this repository.
resource "google_artifact_registry_repository_iam_member" "cloud_build_writer" {
  project    = var.project_id
  location   = var.region
  repository = google_artifact_registry_repository.docker.name
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${data.google_project.project.number}-compute@developer.gserviceaccount.com"
}
