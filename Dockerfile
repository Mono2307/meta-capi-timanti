FROM node:18

WORKDIR /app

COPY . .

# FORCE clean install
RUN rm -rf node_modules
RUN npm install --verbose

EXPOSE 3000

CMD ["node", "server.js"]
