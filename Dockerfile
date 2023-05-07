FROM node:12

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . . 

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080
CMD ["node","server.js"]
