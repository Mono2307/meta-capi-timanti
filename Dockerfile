FROM node:18

WORKDIR /app

# Copy everything FIRST
COPY . .

# Install dependencies AFTER copy
RUN npm install

EXPOSE 3000

CMD ["node", "server.js"]
