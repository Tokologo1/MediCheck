# =============================================================================
# MediCheck — Cloud SQL (PostgreSQL 16)
# =============================================================================

# Generate a strong random password for the DB user
resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*+-"
}

# Cloud SQL instance
resource "google_sql_database_instance" "main" {
  name             = var.sql_instance_name
  project          = var.project_id
  region           = var.region
  database_version = "POSTGRES_16"

  # Allow terraform destroy to delete this instance
  deletion_protection = false

  settings {
    tier              = var.sql_tier
    availability_type = "ZONAL"
    disk_autoresize   = true
    disk_type         = "PD_SSD"
    disk_size         = 10

    backup_configuration {
      enabled            = true
      start_time         = "03:00"
      binary_log_enabled = false # Not supported on PostgreSQL

      backup_retention_settings {
        retained_backups = 7
        retention_unit   = "COUNT"
      }
    }

    maintenance_window {
      day          = 7 # Sunday
      hour         = 4
      update_track = "stable"
    }

    database_flags {
      name  = "max_connections"
      value = "25"
    }

    ip_configuration {
      ipv4_enabled = true
    }
  }

  depends_on = [google_project_service.apis]
}

# PostgreSQL database
resource "google_sql_database" "medicheck" {
  name     = var.db_name
  instance = google_sql_database_instance.main.name
  project  = var.project_id
}

# PostgreSQL user
resource "google_sql_user" "medicheck" {
  name     = var.db_user
  instance = google_sql_database_instance.main.name
  project  = var.project_id
  password = random_password.db_password.result
}

# Compose the DATABASE_URL for Cloud Run (Unix socket path)
locals {
  database_url = "postgresql://${var.db_user}:${random_password.db_password.result}@localhost/${var.db_name}?host=/cloudsql/${google_sql_database_instance.main.connection_name}&schema=public"
}
