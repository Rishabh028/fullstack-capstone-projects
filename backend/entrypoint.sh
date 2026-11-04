#!/bin/bash
set -e

echo "Waiting for PostgreSQL..."
until python -c "import psycopg2; psycopg2.connect(host='${DB_HOST:-db}', port='${DB_PORT:-5432}', dbname='${DB_NAME:-saas_pm}', user='${DB_USER:-postgres}', password='${DB_PASSWORD:-postgres}')" 2>/dev/null; do
  echo "PostgreSQL not ready, waiting..."
  sleep 2
done
echo "PostgreSQL is ready!"

echo "Checking/creating migrations..."
python manage.py makemigrations --noinput

echo "Running migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Starting application..."
exec "$@"
