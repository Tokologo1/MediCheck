#!/bin/sh
# scripts/run-migrations.sh
# Apply committed Prisma migrations and optionally seed a Cloud Run Job.
# Production never uses `prisma db push --accept-data-loss`.
set -e

echo "🔄 Pushing Prisma schema to database..."
npx prisma migrate deploy

echo "✅ Schema push complete."

# Run seeding only if SEED_DATABASE=true is set
if [ "$SEED_DATABASE" = "true" ]; then
  echo "🌱 Seeding database..."
  npx tsx prisma/seed.ts
  echo "✅ Seeding complete."
fi

echo "🎉 Database setup finished."
