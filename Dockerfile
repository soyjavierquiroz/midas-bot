FROM node:18

WORKDIR /opt/projects/midas-bot

# Instalar ffmpeg
RUN apt-get update && apt-get install -y ffmpeg && apt-get clean

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 4000

CMD ["npm", "start"]
