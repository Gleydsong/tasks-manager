FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma

RUN npm install
RUN npx prisma generate

COPY src ./src
COPY jest.config.ts ./jest.config.ts

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
