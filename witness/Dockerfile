FROM python:3.12-slim
WORKDIR /opt
RUN pip install --no-cache-dir fastapi uvicorn pydantic python-dotenv
COPY . ./witness
EXPOSE 8086
CMD ["uvicorn", "witness.app:app", "--host", "0.0.0.0", "--port", "8086"]
