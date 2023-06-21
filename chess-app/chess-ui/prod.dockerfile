FROM node:current-alpine3.17

EXPOSE 3000

RUN mkdir -p /app/public /app/src

WORKDIR /app

COPY package.json /app/package.json
COPY package-lock.json /app/package-lock.json
COPY dist /dist

RUN npm install

CMD ["node", "dist/src/app.js"]
