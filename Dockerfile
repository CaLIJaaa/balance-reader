FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production && \
    npm install typescript ts-node @types/node --save-dev

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
