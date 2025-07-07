# Plan de Implementación: Nodo n8n de Rate Limit con Redis (Versión Mejorada)

Este documento detalla los pasos necesarios para crear, desarrollar y empaquetar un nodo personalizado para n8n que implemente una funcionalidad de "rate limit" (límite de tasa) utilizando Redis, con una configuración de tiempo flexible.

## ✅ Fase 1: Configuración Inicial del Proyecto

El primer paso es establecer la estructura básica del proyecto utilizando las herramientas oficiales de n8n.

- [x] **1.1. Instalar `n8n-node-dev`:** Asegurarse de tener la herramienta de desarrollo de nodos de n8n instalada globalmente.

- [x] **1.2. Crear el esqueleto del proyecto:** Utilizar el comando `n8n-node-dev new` para generar la estructura de carpetas y archivos inicial.

- [x] **1.3. Revisar y configurar `package.json`:**
    - [x] Ajustar los detalles del autor, repositorio y descripción.
    - [x] Añadir la sección `n8n` para que n8n reconozca los nodos y las credenciales.

- [x] **1.4. Instalar dependencias:** Añadir la librería de Redis que se usará para la comunicación. `ioredis` es una excelente opción, robusta y utilizada por el nodo nativo de n8n.

## ✅ Fase 2: Creación del Tipo de Credencial

Para que el nodo pueda conectarse a Redis, necesita un tipo de credencial. Replicaremos la estructura de la credencial del nodo nativo de Redis.

- [x] **2.1. Crear el archivo de credencial:** Dentro de la carpeta `credentials`, crear el archivo `RedisRateLimitApi.credentials.ts`.

- [x] **2.2. Definir la clase de la credencial:** La clase debe implementar la interfaz `ICredentialType`.
    - [x] Asignar un `name` único, por ejemplo, `redisRateLimitApi`.
    - [x] Asignar un `displayName` amigable, como `Redis Rate Limit API`.
    - [x] Definir las `properties` necesarias para la conexión: `host`, `port`, `user`, `password`, y `database`.

## ✅ Fase 3: Desarrollo del Nodo `RateLimit`

Esta es la fase principal, donde se define la lógica y la interfaz del nodo.

- [x] **3.1. Crear el archivo del nodo:** Dentro de la carpeta `nodes/RateLimit`, crear el archivo `RateLimit.node.ts`.

- [x] **3.2. Definir la descripción del nodo:**
    - [x] Crear la clase `RateLimit` que implemente `INodeType`.
    - [x] Rellenar el objeto `description` con la metainformación del nodo.

- [x] **3.3. Definir las propiedades (parámetros) del nodo:**
    - [x] Campo de Credencial.
    - [x] Campo para la Clave (Key).
    - [x] Campo para el Límite de Peticiones.
    - [x] Campo para el Período de Tiempo.
    - [x] Campo para la Unidad de Tiempo.

- [x] **3.4. Implementar la lógica de ejecución (`execute` method):**
    - [x] Obtener parámetros.
    - [x] Calcular el TTL en segundos.
    - [x] Obtener credenciales.
    - [x] Conectar a Redis.
    - [x] Implementar el algoritmo de Rate Limit.
    - [x] Manejar las salidas.
    - [x] Manejo de errores y desconexión.

## ✅ Fase 4: Pruebas y Empaquetado

- [x] **4.1. Compilar el nodo:** `npm run build`
- [x] **4.2. Enlazar para pruebas locales:** `npm link` y `npm link n8n-nodes-rate-limit` en la carpeta de n8n.
- [x] **4.3. Probar el nodo en n8n:**
    - [x] Reiniciar n8n y verificar que el nodo aparece.
    - [x] Crear flujos de prueba para validar la lógica con minutos, horas y días.
- [x] **4.4. Documentación:** Crear un `README.md` explicando la funcionalidad y los nuevos parámetros.
- [ ] **4.5. Publicar en npm (Opcional):** `npm publish`.
