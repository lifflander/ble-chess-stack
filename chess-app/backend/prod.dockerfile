FROM node:current-alpine3.17

EXPOSE 5000

RUN mkdir -p /app/public /app/src

COPY package.json /app/package.json
COPY package-lock.json /app/package-lock.json
COPY dist /app/public
COPY .well-known /app/public/src/.well-known

WORKDIR app

RUN npm install

CMD ["node", "/app/public/src/app.js"]
