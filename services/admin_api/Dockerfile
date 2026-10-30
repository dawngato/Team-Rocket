FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir fastapi uvicorn sqlalchemy alembic pydantic psycopg2-binary httpx python-dotenv
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8083
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8083"]
