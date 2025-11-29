## create net
docker network create lms-net

## run mongo container
```
docker run -d \
  --name mongo-lms \
  --network lms-net \
  -p 27017:27017 \
  -v mongo_data:/data/db \
  mongo:latest
```

## run backend container
#### Update your Flask/Mongo connection string to:
 
> DB=mongodb://mongo-lms:27017/lms

```
docker run -d \
  --name backend-lms \
  --network lms-net \
  -p 4040:80 \
  backend-lms:latest \
  sh -c "cd /app && python3 run.py"
```

## run ui container
```
docker run -d \
  --name ui \
  --network lms-net \
  -p 4242:80 \
  ui-lms:latest \
  nginx -g "daemon off;"
```

## Verify network connectivity
```
docker network inspect lms-net
```
