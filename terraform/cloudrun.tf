# =============================================================================
# MediCheck — Cloud Run Service + Migration Job
# =============================================================================

locals {
  image_base = "${var.region}-docker.pkg.dev/${var.project_id}/${var.repo_name}/${var.service_name}"
}

# ── Cloud Run Service (Next.js app) ──────────────────────────────────────────
resource "google_cloud_run_v2_service" "app" {
  name     = var.service_name
  project  = var.project_id
  location = var.region

  ingress = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = local.cloud_run_sa

    scaling {
      min_instance_count = var.cloud_run_min_instances
      max_instance_count = var.cloud_run_max_instances
    }

    # Attach Cloud SQL
    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.main.connection_name]
      }
    }

    containers {
      image = "${local.image_base}:latest"

      ports {
        container_port = 3000
      }

      resources {
        limits = {
          cpu    = var.cloud_run_cpu
          memory = var.cloud_run_memory
        }
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      # Pull DATABASE_URL from Secret Manager
      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_url.secret_id
            version = "latest"
          }
        }
      }

      # Pull JWT_ACCESS_SECRET from Secret Manager
      env {
        name = "JWT_ACCESS_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.jwt_access.secret_id
            version = "latest"
          }
        }
      }

      # Pull JWT_REFRESH_SECRET from Secret Manager
      env {
        name = "JWT_REFRESH_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.jwt_refresh.secret_id
            version = "latest"
          }
        }
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }

    timeout = "60s"
  }

  depends_on = [
    google_secret_manager_secret_iam_member.cloud_run_accessor,
    google_artifact_registry_repository.docker,
  ]
}

# Allow public (unauthenticated) access to the Cloud Run service
resource "google_cloud_run_v2_service_iam_member" "public_access" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.app.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Update NEXT_PUBLIC_APP_URL to the live service URL after first deploy
resource "google_cloud_run_v2_service" "app_url_patch" {
  name     = var.service_name
  project  = var.project_id
  location = var.region

  ingress = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = local.cloud_run_sa

    scaling {
      min_instance_count = var.cloud_run_min_instances
      max_instance_count = var.cloud_run_max_instances
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.main.connection_name]
      }
    }

    containers {
      image = "${local.image_base}:latest"

      ports {
        container_port = 3000
      }

      resources {
        limits = {
          cpu    = var.cloud_run_cpu
          memory = var.cloud_run_memory
        }
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "NEXT_PUBLIC_APP_URL"
        value = google_cloud_run_v2_service.app.uri
      }

      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_url.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "JWT_ACCESS_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.jwt_access.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "JWT_REFRESH_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.jwt_refresh.secret_id
            version = "latest"
          }
        }
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }

    timeout = "60s"
  }

  depends_on = [google_cloud_run_v2_service.app]
}

# ── Cloud Run Job (Prisma Migrations) ────────────────────────────────────────
resource "google_cloud_run_v2_job" "migrate" {
  name     = "medicheck-migrate"
  project  = var.project_id
  location = var.region

  template {
    template {
      service_account = local.cloud_run_sa
      max_retries     = 1

      timeout = "600s"

      volumes {
        name = "cloudsql"
        cloud_sql_instance {
          instances = [google_sql_database_instance.main.connection_name]
        }
      }

      containers {
        image   = "${local.image_base}:latest"
        command = ["/bin/sh"]
        args    = ["-c", "sh scripts/run-migrations.sh"]

        env {
          name  = "NODE_ENV"
          value = "production"
        }

        env {
          name  = "SEED_DATABASE"
          value = "false"
        }

        env {
          name = "DATABASE_URL"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.db_url.secret_id
              version = "latest"
            }
          }
        }

        volume_mounts {
          name       = "cloudsql"
          mount_path = "/cloudsql"
        }
      }
    }
  }

  depends_on = [
    google_secret_manager_secret_iam_member.cloud_run_accessor,
    google_artifact_registry_repository.docker,
  ]
}
