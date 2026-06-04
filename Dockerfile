FROM node:20-alpine

# Instalar dependencias necesarias para compilar sqlite3 en linux alpine (si es necesario)
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

EXPOSE 80

ENV PORT=80

CMD ["node", "server.js"]
