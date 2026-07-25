#!/bin/sh
set -eu

echo "Waiting for PostgreSQL..."
attempt=1
until bun -e "const postgres=require('postgres');const sql=postgres(process.env.DATABASE_URL,{max:1,connect_timeout:5});sql\`select 1\`.then(()=>sql.end()).then(()=>process.exit(0)).catch(()=>process.exit(1))"; do
  if [ "$attempt" -ge 30 ]; then
    echo "PostgreSQL did not become ready after 30 attempts." >&2
    exit 1
  fi
  attempt=$((attempt + 1))
  sleep 2
done

if [ "${RUN_DB_MIGRATIONS:-true}" = "true" ]; then
  echo "Applying database migrations..."
  bun run drizzle-kit migrate
fi

echo "Starting InfraWatch..."
exec bun server.js
