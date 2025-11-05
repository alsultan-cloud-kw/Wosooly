#!/bin/bash
echo "⏳ Waiting for Redis..."
until python -c "import redis, os; redis.Redis.from_url(os.getenv('REDIS_URL')).ping()"; do
  sleep 2
done

echo "✅ Redis is ready, starting Celery worker..."
celery -A celery_app.celery worker --loglevel=info
