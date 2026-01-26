FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY . /app

CMD ["bash","-lc","uvicorn app_improved:app --host 0.0.0.0 --port ${PORT:-8000}"]

RUN python -c "import pptx; print('python-pptx OK')"

RUN apt-get update && apt-get install -y libreoffice && rm -rf /var/lib/apt/lists/*
