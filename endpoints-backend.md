# Backend endpoints necesarios - Módulo Cursos (alumno)

## Detalle de curso

```
GET /api/student/{slug}/courses/{courseId}
  → Devuelve info completa del curso (ya existe parcialmente)
  → Formato: { id, name, description, teacherFullName, classesPerWeek, 
               isActive, basePrice, finalPrice, schedules: [{ dayOfWeek, startTime, endTime }] }
```

## Asistencias (alumno ve su historial)

```
GET /api/student/{slug}/courses/{courseId}/attendance
  → Historial de asistencias del alumno en ese curso
  → Formato: [{ date: "2024-06-25T...", present: true }]

GET /api/student/{slug}/attendance/summary
  → Resumen de asistencias por curso
  → Formato: [{ courseId, courseName, present: 8, absent: 2, total: 10 }]
```

## Documentos del curso (profesor sube, alumno ve/descarga)

```
GET /api/student/{slug}/courses/{courseId}/documents
  → Documentos compartidos por el profesor en ese curso
  → Formato: [{ id, title, fileName, fileUrl, uploadedAtUtc }]

POST /api/teacher/{slug}/courses/{courseId}/documents
  → Multipart: file + title
  → Profesor sube un documento al curso

DELETE /api/teacher/{slug}/courses/{courseId}/documents/{id}
  → Profesor elimina un documento
```

## Conector (mensajes alumno ↔ curso/profesor)

```
GET /api/student/{slug}/courses/{courseId}/messages
  → Mensajes del curso (ordenados por fecha descendente)
  → Formato: [{ id, senderName, text, isPrivate, createdAtUtc }]

POST /api/student/{slug}/courses/{courseId}/messages
  → Body: { text: "mensaje", isPrivate: false }
  → isPrivate = true → solo lo ve el profesor
  → isPrivate = false → lo ven todos los alumnos del curso + profesor

GET /api/teacher/{slug}/courses/{courseId}/messages
  → Profesor ve todos los mensajes del curso
  → Incluye los privados dirigidos a él

POST /api/teacher/{slug}/courses/{courseId}/messages
  → Profesor responde mensajes
  → Body: { text: "respuesta", isPrivate: false }
```

## Resumen

| Módulo | Método | Endpoint | Descripción |
|--------|--------|----------|-------------|
| Cursos | GET | `/api/student/{slug}/courses/{id}` | Detalle del curso |
| Asistencias | GET | `/api/student/{slug}/courses/{id}/attendance` | Historial de asistencias |
| Asistencias | GET | `/api/student/{slug}/attendance/summary` | Resumen por curso |
| Documentos | GET | `/api/student/{slug}/courses/{id}/documents` | Documentos del curso |
| Documentos | POST | `/api/teacher/{slug}/courses/{id}/documents` | Subir documento (teacher) |
| Documentos | DELETE | `/api/teacher/{slug}/courses/{id}/documents/{id}` | Eliminar documento (teacher) |
| Mensajes | GET | `/api/student/{slug}/courses/{id}/messages` | Mensajes del curso |
| Mensajes | POST | `/api/student/{slug}/courses/{id}/messages` | Enviar mensaje (alumno) |
| Mensajes | GET | `/api/teacher/{slug}/courses/{id}/messages` | Ver mensajes (teacher) |
| Mensajes | POST | `/api/teacher/{slug}/courses/{id}/messages` | Responder mensaje (teacher) |
