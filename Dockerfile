# Stage 1: Сборка приложения
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install -g @angular/cli@17
RUN npm ci
COPY . .
RUN ng build --configuration development

# Stage 2: Запуск nginx
FROM nginx:alpine

# Меняем конфиг nginx-а на собственный
COPY nginx.conf /etc/nginx/nginx.conf

# Копируем собранное приложение из предыдущего этапа в рабочую директорию nginx
COPY --from=build /app/dist/lab2/browser /usr/share/nginx/html
EXPOSE 8080

# Запускаем nginx
CMD ["nginx", "-g", "daemon off;"]