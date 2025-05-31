#!/bin/bash
set -e # Termina el script inmediatamente si un comando falla

# Realiza la creación de la base de datos para el servicio de inventario
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE inventario_db;
EOSQL