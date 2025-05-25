FROM node:18-alpine

WORKDIR /app

COPY package.json vite.config.ts ./
COPY src ./src

RUN npm install

EXPOSE 5174

CMD ["npm", "run", "dev"]