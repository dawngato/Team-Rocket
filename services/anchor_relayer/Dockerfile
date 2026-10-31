FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir fastapi uvicorn pydantic httpx python-dotenv web3 eth_account requests hexbytes cryptography
COPY . .
EXPOSE 8087
CMD ["python", "run.py"]
