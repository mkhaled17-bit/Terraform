FROM nginx:alpine

RUN rm /etc/nginx/conf.d/default.conf

RUN mkdir -p /var/www/lms_app

COPY ./etc/nginx/conf.d/frontend.conf /etc/nginx/conf.d/frontend.conf

COPY . /var/www/lms_app

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]


