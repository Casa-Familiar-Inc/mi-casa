# Arquitectura de Seguridad y Roles (RBAC + Multi-tenancy)

Este documento define la estrategia para manejar permisos, roles y segregación de datos por departamento en la aplicación, integrando **Microsoft Entra ID**, **Refine** y **PocketBase**.

## 1. Estrategia Centralizada

Se utilizará una **única instancia de PocketBase** para toda la organización.
*   **Ventaja:** Mantenimiento simplificado, reportes globales facilitados y un solo punto de entrada para el frontend.
*   **Segregación:** Lógica (Soft Multi-tenancy) mediante el campo `department` en cada registro.

## 2. Integración con Entra ID (Identity Source)

El flujo de autenticación debe capturar y normalizar la información del usuario desde Microsoft.

### Mapeo de Atributos
Al iniciar sesión, el `authProvider` intercepta el token y actualiza la colección `users` en PocketBase:

| Entra ID Attribute | PocketBase Field | Descripción |
| :--- | :--- | :--- |
| `appRoles` / `groups` | `role` | Define **QUÉ** puede hacer (`admin`, `manager`, `employee`). |
| `department` / `jobTitle` | `department` | Define **DÓNDE** puede verlo (`Finance`, `IT`, `HR`). |

> **Nota:** Si Entra ID devuelve IDs de grupos (UUIDs), el frontend o un hook de backend debe traducirlos a nombres legibles antes de guardar.

---

## 3. Esquema de Datos (PocketBase)

### Colección `users`
Campos obligatorios para la seguridad:
*   `role`: (Select) `admin`, `manager`, `employee`
*   `department`: (Text) Ej: `Finance`

### Colecciones de Datos (ej: `expenses`, `timesheets`)
Todas las colecciones sensibles deben incluir:
*   `department`: (Text) **Debe coincidir con el departamento del creador.**
*   `status`: (Select) Para flujos de aprobación (`draft`, `submitted`, `approved`).

---

## 4. Matriz de Acceso (API Rules)

La seguridad se aplica en cascada. Un usuario tiene acceso si cumple **cualquiera** de las condiciones.

| Actor | Rol (PB) | Departamento (PB) | Alcance de Visión | Regla API (Lógica) |
| :--- | :--- | :--- | :--- | :--- |
| **Global Admin** | `admin` | *Cualquiera* | **TODO** (Todos los deptos) | `@request.auth.role = 'admin'` |
| **Dept. Manager** | `manager` | `IT` | **TODO** (Solo Depto `IT`) | `@request.auth.role = 'manager' && department = @request.auth.department` |
| **Empleado** | `employee` | `IT` | **PROPIOS** (Solo `IT`) | `id = @request.auth.id` (o `user = @request.auth.id`) |

### Implementación Real (PocketBase API Rule)
Copia y pega esto en el campo **List/Search Rule** de tus colecciones:

```sql
@request.auth.role = 'admin' ||
(@request.auth.role = 'manager' && department = @request.auth.department) ||
user = @request.auth.id
```

---

## 5. Auditoría Financiera (Audit Trails)

Para aplicaciones financieras, no basta con los logs HTTP. Se requiere un log inmutable de cambios de estado.

### Solución Técnica
Implementación en **Go (Backend)** usando Hooks (`OnRecordAfterCreate`, `OnRecordAfterUpdate`).

**Colección `audit_logs`:**
*   `actor`: ID del usuario que hizo el cambio.
*   `action`: `CREATE`, `UPDATE`, `DELETE`.
*   `collection`: Nombre de la colección afectada.
*   `snapshot`: JSON con el estado del registro en ese momento.
*   `timestamp`: Automático.

---

## 6. Manejo de Datos Financieros

### Reglas de Oro
1.  **Nunca usar Float/Double para dinero:** PocketBase usa SQLite (IEEE 754).
2.  **Almacenamiento:**
    *   **Opción A (Enteros):** Guardar centavos. `$100.50` -> `10050`.
    *   **Opción B (String):** Guardar como texto. `"100.50"`.
3.  **Cálculos:** Realizar operaciones matemáticas en el Backend (Go) con librerías `shopspring/decimal` o en Frontend con `decimal.js`.

---

## 7. Capa de Frontend (Refine)

Usa `AccessControlProvider` para ocultar botones en la UI, mejorando la experiencia de usuario (UX), aunque la seguridad real reside en API Rules.

```typescript
// accessControlProvider.ts
const role = user.role;
const userDept = user.department;
const resourceDept = record.department;

if (role === 'admin') return { can: true };
if (role === 'manager' && userDept === resourceDept) return { can: true };
if (role === 'employee' && record.ownerId === user.id) return { can: true };
return { can: false };
```
