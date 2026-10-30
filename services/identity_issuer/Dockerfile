FROM python:3.12-slim
WORKDIR /opt
RUN pip install --no-cache-dir fastapi uvicorn sqlalchemy alembic pydantic argon2-cffi psycopg2-binary python-jose cryptography httpx python-dotenv
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . ./identity_issuer
EXPOSE 8081
CMD ["uvicorn", "identity_issuer.main:app", "--host", "0.0.0.0", "--port", "8081"]
