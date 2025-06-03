# Prueba Técnica: Sistema de Microservicios - Productos e Inventario

Este proyecto implementa un sistema de microservicios para la gestión de productos y su inventario, permitiendo la creación de productos y la simulación de compras que afectan el stock disponible. Ha sido desarrollado como parte de una prueba técnica, utilizando NestJS, Docker y PostgreSQL.

## 1. Arquitectura del Sistema

El sistema está compuesto por dos microservicios principales que interactúan entre sí y una base de datos PostgreSQL compartida (con esquemas o bases de datos lógicamente separadas por servicio). Todos los componentes están contenerizados usando Docker y orquestados con Docker Compose.

### Componentes Principales

* **`ms-productos` (Microservicio de Productos):**
* Responsable de gestionar la información de los productos (ID, nombre, precio, descripción).
* Expone endpoints para crear, listar y obtener detalles de productos.
* Desarrollado con NestJS.
* Puerto expuesto (localmente): `3001`.
* Documentación Swagger: `http://localhost:3001/api-docs`.

* **`ms-inventario` (Microservicio de Inventario):**
* Responsable de gestionar el stock de los productos y procesar las compras.
* Expone endpoints para consultar el stock de un producto, actualizarlo y realizar compras.
* Para consultas de stock y procesos de compra, interactúa con `ms-productos` para obtener detalles del producto (nombre, precio) y validar su existencia.
* Desarrollado con NestJS.
* Puerto expuesto (localmente): `3002`.
* Documentación Swagger: `http://localhost:3002/api-docs`.

* **`postgres-db` (Base de Datos):**
* Instancia de PostgreSQL corriendo en un contenedor Docker.
* Almacena los datos para `ms-productos` (en la base de datos `productos_db`) y para `ms-inventario` (en la base de datos `inventario_db`).
* Puerto expuesto (localmente): `5432`.

### Diagrama de Arquitectura

El cliente (Postman/Swagger UI) interactúa con `ms-productos` o `ms-inventario`. `ms-inventario` se comunica con `ms-productos` para obtener información de productos durante las consultas de inventario y el proceso de compra. Ambos microservicios se conectan a la instancia de `postgres-db`, cada uno a su respectiva base de datos lógica. Todo el sistema corre dentro de una red Docker gestionada por Docker Compose.

### Diagrama de Interacción (Flujo de Compra)

**descripción para el diagrama de secuencia:**

1. Cliente envía petición `POST /compras` a `ms-inventario`.
2. `ms-inventario` recibe la petición.
3. `ms-inventario` envía petición `GET /productos/{id}` a `ms-productos` (con API Key).
4. `ms-productos` valida el producto y devuelve sus detalles (precio, nombre).
5. `ms-inventario` verifica el stock local del producto.
6. Si hay stock suficiente, `ms-inventario` actualiza su base de datos (descuenta stock, registra la compra) en una transacción.
7. `ms-inventario` devuelve una respuesta de compra exitosa al cliente.

## 2. Decisiones Técnicas y Justificaciones

* **Lenguaje y Framework:** Se utilizó **TypeScript** con **NestJS**.
  * *Justificación:* NestJS provee una arquitectura modular y escalable, ideal para microservicios. Su uso de TypeScript mejora la calidad del código, la mantenibilidad y la experiencia de desarrollo gracias al tipado estático. Facilita la implementación de patrones como DTOs, guards, pipes y la integración con herramientas como TypeORM y Swagger.

* **Base de Datos:** Se eligió **PostgreSQL**.
  * *Justificación:* PostgreSQL es una base de datos relacional open-source robusta y con características avanzadas. Ofrece transacciones ACID, lo cual es crucial para operaciones como la gestión de inventario y el registro de compras, asegurando la consistencia de los datos. Para esta prueba, se optó por una única instancia de PostgreSQL con bases de datos lógicamente separadas (`productos_db`, `inventario_db`) para simplificar el setup de Docker Compose, aunque en un entorno de producción más grande podrían ser instancias separadas. Se descartó SQLite por ser más adecuada para desarrollo local o aplicaciones pequeñas sin concurrencia, y NoSQL porque la naturaleza relacional de los productos y el inventario (con posibles futuras relaciones y queries complejas) se beneficia de un esquema SQL.

* **Ubicación del Endpoint de Compra:** Se implementó en el **Microservicio de Inventario (`ms-inventario`)**.
  * *Justificación:* La consecuencia principal y más crítica de una compra es la modificación del inventario. Colocar esta lógica en `ms-inventario` mantiene una alta cohesión, ya que este servicio es el dueño de los datos de stock. Aunque `ms-inventario` necesita consultar a `ms-productos` para obtener detalles del producto (como precio y validación de existencia), esta es una dependencia aceptable y demuestra la comunicación inter-servicios. Alternativas como colocarlo en `ms-productos` (menor cohesión) o crear un servicio orquestador (mayor complejidad para esta prueba) se descartaron en favor de esta solución más equilibrada.

* **Estándar JSON API:** Todas las respuestas de la API se adhieren al estándar [JSON API (jsonapi.org)](https://jsonapi.org/).
  * *Justificación:* Usar un estándar para las respuestas API promueve la consistencia, facilita la integración por parte de los clientes y permite el uso de librerías y herramientas que entienden este formato.

* **Contenerización:** Se utilizó **Docker** para crear imágenes de los microservicios y **Docker Compose** para orquestar el entorno completo.
  * *Justificación:* Docker asegura entornos consistentes entre desarrollo y producción, simplifica el despliegue y el manejo de dependencias. Docker Compose facilita la definición y ejecución del sistema multi-contenedor (ambos servicios NestJS y la base de datos PostgreSQL) con un solo comando.

* **Autenticación entre Servicios:** Se implementó una autenticación básica mediante **API Keys** en los headers (`x-api-key`).
  * *Justificación:* Para esta prueba, proporciona un mecanismo simple pero efectivo para proteger los endpoints y demostrar el concepto de autenticación entre servicios. `ms-inventario` usa una API Key para acceder a `ms-productos`.

* **Comunicación entre Microservicios:** Se realiza mediante **HTTP/REST** con payloads JSON (siguiendo el estándar JSON API).
  * *Justificación:* Es un protocolo ampliamente entendido y soportado. NestJS facilita la creación de clientes HTTP (con `@nestjs/axios`) para esta comunicación.

---

## 3. Instrucciones de Instalación y Ejecución

### Prerrequisitos

* Git
* Docker (Docker Engine y Docker CLI)
* Docker Compose (usualmente viene con Docker Desktop o se instala como plugin de Docker CLI)
* Node.js y npm/yarn (opcional, solo si se desea ejecutar los servicios localmente fuera de Docker o para correr tests unitarios directamente)
* Un cliente API como Postman o Insomnia (o usar la UI de Swagger).

### Configuración

1. **Clonar el Repositorio:**

    ```bash
    git clone URL_DEL_REPOSITORIO
    cd PruebaTecnica_Microservicios
    ```

2. **Variables de Entorno:**
    * El archivo `docker-compose.yml` en la raíz del proyecto define las variables de entorno necesarias para cada servicio en el entorno Docker (credenciales de BD, URLs de otros servicios, API Keys).
    * Para desarrollo local fuera de Docker o para las pruebas E2E, cada microservicio (`ms-productos`, `ms-inventario`) tiene su propio archivo `.env` que debe configurarse. Ejemplos de estos archivos (`.env.example` o las instrucciones previas) indican las variables necesarias.
        * `ms-productos/.env`: Contiene `DB_HOST=localhost` para que las pruebas E2E puedan acceder al PostgreSQL en Docker.
        * `ms-inventario/.env`: Similar, para su base de datos y para la URL de `ms-productos` en el contexto de E2E (`PRODUCTOS_MS_URL_FOR_E2E_SETUP=http://localhost:3001/api/v1`).

3. **Script de Inicialización de Base de Datos:**
    * El archivo `init-db.sh` en la raíz del proyecto es utilizado por Docker Compose para crear la base de datos `inventario_db` dentro del contenedor PostgreSQL la primera vez que se inicia con un volumen vacío. Asegúrate de que tenga permisos de ejecución si clonas el repositorio en un entorno Linux/macOS:

        ```bash
        chmod +x init-db.sh
        ```

### Levantar el Entorno

 desde la carpeta raíz del proyecto (`tech-test-microservicios/`):
 ```bash
docker-compose up --build
 ```
**Acceso a los Servicios**
Una vez levantado el entorno con Docker Compose:

* Microservicio de Productos: http://localhost:3001
* Swagger UI: http://localhost:3001/api-docs (o la ruta configurada en main.ts)
* Microservicio de Inventario: http://localhost:3002
* Swagger UI: http://localhost:3002/api-docs (o la ruta configurada en main.ts)
* Base de Datos PostgreSQL: Accesible en localhost:5432 desde tu máquina host para clientes de BD como DBeaver o pgAdmin 
  usuario: admin, 
  pass: adminpass.

--- 

### 4. Documentación de la API (Swagger)
* Cada microservicio expone su propia documentación de API interactiva generada con Swagger/OpenAPI.
* Documentación de ms-productos: http://localhost:3001/api-docs
* Documentación de ms-inventario: http://localhost:3002/api-docs
* Desde estas interfaces, se pueden explorar todos los endpoints, ver los modelos de datos esperados, los códigos de respuesta y probar las APIs directamente (recordar configurar la API Key en el botón "Authorize" de Swagger si es necesario).

## 5. Pruebas
El proyecto incluye pruebas unitarias y una estructura para pruebas de integración/E2E.

## 6. Uso de Herramientas de IA

Para el desarrollo de esta prueba técnica, se utilizó como herramienta de asistencia de Inteligencia Artificial el modelo **Gemini de Google**.

El uso de esta herramienta se centró en las siguientes tareas específicas:

* **Revisión de Calidad del Código:** Se consultó a la IA para obtener sugerencias sobre posibles mejoras en la estructura del código, la aplicación de buenas prácticas y la identificación de posibles optimizaciones o refactorizaciones en los microservicios desarrollados.
* **Generación y Asistencia en Pruebas Unitarias:** Se empleó la IA para generar esqueletos de pruebas unitarias para los servicios y controladores. Además, se solicitó ayuda para plantear diferentes casos de prueba y para la creación de mocks y aserciones específicas, con el objetivo de alcanzar una alta cobertura y asegurar la fiabilidad de los componentes individuales.

**Ayuda de realizacion de README:** 

**Proceso de Verificación y Aplicación:**
Es fundamental destacar que todas las sugerencias y el código propuesto por la herramienta de IA fueron sometidos a un riguroso proceso de revisión y validación manual. Esto incluyó:
1.  **Análisis Crítico:** Cada sugerencia fue analizada para comprender su impacto y relevancia en el contexto del proyecto.
2.  **Adaptación:** El código o las estructuras propuestas se adaptaron para alinearse con los requisitos específicos de la prueba y las decisiones de diseño tomadas.
3.  **Pruebas:** La funcionalidad del código y la efectividad de las pruebas generadas o asistidas por IA fueron verificadas mediante la ejecución de las mismas y la revisión de sus resultados.

El objetivo principal del uso de la IA fue como un apoyo para mejorar la eficiencia y la calidad, pero siempre manteniendo el control y la responsabilidad final sobre el código y la solución implementada por el desarrollador.

**Pruebas Unitarias**
* Cada microservicio (ms-productos y ms-inventario) tiene su propio conjunto de pruebas unitarias para verificar la lógica de los servicios y controladores de forma aislada (usando mocks).
* Para ejecutar:
   Navegar a la carpeta del microservicio (ej. cd ms-productos).
   Ejecutar: npm test
   Para ver la cobertura: npm run test:cov
