# =============================================================================
# MediCheck — Input Variables
# =============================================================================

variable "project_id" {
  description = "GCP Project ID"
  type        = string
  default     = "project-fbd1d979-ca47-4901-bbf"
}

variable "region" {
  description = "GCP region for all resources"
  type        = string
  default     = "us-central1"
}

variable "service_name" {
  description = "Cloud Run service name"
  type        = string
  default     = "medicheck-web"
}

variable "repo_name" {
  description = "Artifact Registry Docker repository name"
  type        = string
  default     = "medicheck"
}

variable "sql_instance_name" {
  description = "Cloud SQL instance name"
  type        = string
  default     = "medicheck-db"
}

variable "sql_tier" {
  description = "Cloud SQL machine tier"
  type        = string
  default     = "db-f1-micro"
}

variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "medicheck"
}

variable "db_user" {
  description = "PostgreSQL database user"
  type        = string
  default     = "medicheck"
}

variable "cloud_run_min_instances" {
  description = "Minimum Cloud Run instances (0 = scale to zero)"
  type        = number
  default     = 0
}

variable "cloud_run_max_instances" {
  description = "Maximum Cloud Run instances"
  type        = number
  default     = 10
}

variable "cloud_run_memory" {
  description = "Cloud Run container memory limit"
  type        = string
  default     = "512Mi"
}

variable "cloud_run_cpu" {
  description = "Cloud Run container CPU limit"
  type        = string
  default     = "1"
}
