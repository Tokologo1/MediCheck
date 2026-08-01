# =============================================================================
# MediCheck — Terraform IaC
# Provider & Backend Configuration
# =============================================================================
# Uses Application Default Credentials (ADC).
# Run: gcloud auth application-default login
# =============================================================================

terraform {
  required_version = ">= 1.6.0"

  backend "gcs" {
    bucket = "project-fbd1d979-ca47-4901-bbf-medicheck-tf-state"
    prefix = "medicheck/production"
  }

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # ── Local state (default) ──────────────────────────────────────────────────
  # Remote state is stored in the production GCS bucket above.
  # For another environment, use a separate state prefix or bucket:
  #
  #   backend "gcs" {
  #     bucket = "your-tf-state-bucket-name"
  #     prefix = "medicheck/state"
  #   }
  #
  # Then run: terraform init -migrate-state
  # ──────────────────────────────────────────────────────────────────────────
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Current project data — used for IAM bindings
data "google_project" "project" {
  project_id = var.project_id
}
