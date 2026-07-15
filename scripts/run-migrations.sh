#!/bin/sh
# scripts/run-migrations.sh
# Push Prisma schema and optional seeding for Cloud Run Jobs
# NOTE: This project uses `prisma db push` (schema push) rather than migration files.
# For production migration-based workflows, run `npx prisma migrate dev --name init` locally first.
set -e

echo "🔄 Pushing Prisma schema to database..."
npx prisma db push --accept-data-loss

echo "✅ Schema push complete."

# Run seeding only if SEED_DATABASE=true is set
if [ "$SEED_DATABASE" = "true" ]; then
  echo "🌱 Seeding database..."
  npx tsx prisma/seed.ts
  echo "✅ Seeding complete."
fi

echo "🎉 Database setup finished."
