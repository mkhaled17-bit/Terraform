FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=5000
ENV DB=mongodb://admin:supersecret@lms_mongo:27017/lms
ENV SECRET_KEY=supersecretkey

EXPOSE 5000   

CMD ["python", "run.py"]
