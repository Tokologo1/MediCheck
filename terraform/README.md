# MediCheck — Terraform IaC

This directory contains the full Terraform configuration for the MediCheck GCP infrastructure. It replaces the imperative `deploy.ps1` script with a declarative, repeatable IaC setup.

---

## Prerequisites

1. **Terraform ≥ 1.6** — [Install Terraform](https://developer.hashicorp.com/terraform/install)
2. **gcloud CLI** — authenticated with ADC:
   ```powershell
   gcloud auth application-default login
   ```
3. **Docker image built** — the Terraform config references `:latest` in Artifact Registry. You must trigger a Cloud Build before the Cloud Run service can start:
   ```powershell
   gcloud builds submit . `
     --config=cloudbuild.yaml `
     --substitutions=_REGION=us-central1,_REPO_NAME=medicheck,_SERVICE_NAME=medicheck-web `
     --project=project-fbd1d979-ca47-4901-bbf `
     --timeout=20m
   ```

---

## File Structure

| File | Purpose |
|------|---------|
| `main.tf` | Provider + backend configuration |
| `variables.tf` | All input variables |
| `outputs.tf` | Service URL, DB connection name |
| `apis.tf` | Enable required GCP APIs |
| `artifact_registry.tf` | Docker image repository |
| `cloudsql.tf` | PostgreSQL 16 instance, DB, user, password |
| `secrets.tf` | Secret Manager secrets + IAM bindings |
| `cloudrun.tf` | Cloud Run Service (Next.js) + Job (migrations) |
| `terraform.tfvars.example` | Example variable values |

---

## Usage

### 1. Provision the full stack

```powershell
# From the medicheck/ root:
cd terraform

# Copy and review variables
cp terraform.tfvars.example terraform.tfvars

# Initialise Terraform
terraform init

# Preview changes
terraform plan

# Apply — provisions everything
terraform apply
```

After `terraform apply`, run the Cloud Build command printed in the `cloud_build_command` output to build and push the Docker image. Then execute the migration job:

```powershell
gcloud run jobs execute medicheck-migrate --region=us-central1 --project=project-fbd1d979-ca47-4901-bbf --wait
```

### 2. Tear down everything

```powershell
terraform destroy
```

This cleanly removes all resources: Cloud Run Service, Cloud Run Job, Cloud SQL, Artifact Registry, and all Secret Manager secrets.

### 3. Re-deploy after a code change

```powershell
# 1. Build new image
gcloud builds submit . --config=cloudbuild.yaml --project=project-fbd1d979-ca47-4901-bbf

# 2. Trigger a new Cloud Run revision (forces a redeploy of :latest)
gcloud run services update medicheck-web --region=us-central1 --project=project-fbd1d979-ca47-4901-bbf
```

---

## Remote State (Optional — Recommended for Teams)

By default, state is stored locally in `terraform.tfstate`. To migrate to a GCS bucket:

1. Create a GCS bucket (once):
   ```powershell
   gcloud storage buckets create gs://your-tf-state-bucket --project=project-fbd1d979-ca47-4901-bbf --location=us-central1
   ```

2. Update `main.tf` to replace the comment block with:
   ```hcl
   backend "gcs" {
     bucket = "your-tf-state-bucket"
     prefix = "medicheck/state"
   }
   ```

3. Run:
   ```powershell
   terraform init -migrate-state
   ```

---

## Teardown via Script (Alternative)

To delete without Terraform state, use the `teardown.ps1` in the project root:

```powershell
# Dry-run first
.\teardown.ps1 -WhatIf

# Actual teardown
.\teardown.ps1
```
