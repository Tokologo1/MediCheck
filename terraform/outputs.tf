# =============================================================================
# MediCheck — Outputs
# =============================================================================

output "service_url" {
  description = "Public URL of the deployed Cloud Run service"
  value       = google_cloud_run_v2_service.app.uri
}

output "cloud_sql_connection_name" {
  description = "Cloud SQL connection name (used by Cloud Run)"
  value       = google_sql_database_instance.main.connection_name
}

output "artifact_registry_image_base" {
  description = "Base image path for the Docker image"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${var.repo_name}/${var.service_name}"
}

output "cloud_build_command" {
  description = "Command to build and push the Docker image"
  value       = "gcloud builds submit . --config=cloudbuild.yaml --substitutions=_REGION=${var.region},_REPO_NAME=${var.repo_name},_SERVICE_NAME=${var.service_name} --project=${var.project_id} --timeout=20m"
}

output "github_workload_identity_provider" {
  description = "GitHub production environment secret GCP_WORKLOAD_IDENTITY_PROVIDER"
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "github_deployer_service_account" {
  description = "GitHub production environment secret GCP_SERVICE_ACCOUNT"
  value       = google_service_account.github_deployer.email
}

output "cloud_build_source_bucket" {
  description = "GitHub repository variable CLOUD_BUILD_SOURCE_BUCKET"
  value       = google_storage_bucket.cloud_build_source.name
}
