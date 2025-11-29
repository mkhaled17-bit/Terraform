# LMS Docker Quick Start

## Frontend (Nginx)
```
docker build -t lms_frontend ./frontend
docker run -d --name lms_frontend -p 8080:80 lms_frontend
```
Access frontend: `http://localhost:8080`

## Backend (Python + MongoDB)
```
docker network create lms_network

docker run -d --name lms_mongo --network lms_network \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=supersecret \
  mongo:7

docker build -t lms_backend_image ./backend
docker run -d --name lms_backend --network lms_network \
  --env-file ./backend/.env \
  -p 5000:5000 lms_backend_image
```

#### Notes
 - Keep .env out of the image for security.
 - Use the same Docker network for backend and MongoDB.
