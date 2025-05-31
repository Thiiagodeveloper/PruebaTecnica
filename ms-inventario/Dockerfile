# Usar este Dockerfile para ms-productos/Dockerfile y ms-inventario/Dockerfile

# --- Fase de Build (builder) ---
FROM node:22 AS builder  
WORKDIR /usr/src/app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar TODAS las dependencias
RUN npm install

# Copiar el resto del código fuente
COPY . .

# Ejecutar el script de build
RUN npm run build

# --- Fase de Producción (final) ---
FROM node:22 AS production_stage 
WORKDIR /usr/src/app

# Copiar package.json y package-lock.json para instalar solo dependencias de producción
COPY package*.json ./
RUN npm install --only=production --ignore-scripts --prefer-offline

# Copiar los artefactos de build (la carpeta 'dist') desde la fase 'builder'
COPY --from=builder /usr/src/app/dist ./dist

# Establecer el entorno a producción
ENV NODE_ENV production

# El puerto se expone en docker-compose.yml
# CMD se define en docker-compose.yml o aquí
CMD ["node", "dist/main.js"]