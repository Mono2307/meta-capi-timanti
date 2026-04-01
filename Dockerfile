FROM node:18

WORKDIR /app

# Install deps first (important for caching)
COPY package.json package-lock.json* ./

RUN npm install

# Then copy rest of code
COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
