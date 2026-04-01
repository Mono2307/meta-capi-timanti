FROM node:18

WORKDIR /app

COPY package.json ./

RUN npm install

COPY . .

# DEBUG: show what's actually there
RUN ls -la
RUN ls -la node_modules || echo "NO NODE_MODULES"

EXPOSE 3000

CMD ["node", "server.js"]
