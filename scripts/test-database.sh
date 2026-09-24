#!/bin/sh
set -eu
: "${ESPADA_TEST_DATABASE_URL:?Set ESPADA_TEST_DATABASE_URL to an EMPTY, disposable local PostgreSQL database. Never use a real Supabase project.}"
node --import tsx scripts/generate-seed.ts
psql "$ESPADA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/bootstrap.sql -f supabase/migrations/001_learning.sql -f supabase/migrations/002_russian_curriculum.sql -f supabase/migrations/003_topic_videos.sql -f supabase/migrations/004_teacher_reports.sql -f supabase/seed.sql -f supabase/tests/demo-fixtures.sql -f supabase/tests/permissions.sql -f supabase/tests/videos.sql -f supabase/tests/reports.sql
