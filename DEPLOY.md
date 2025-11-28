# 🚀 Guía de Despliegue - SASSC

## Arquitectura de Producción

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Vercel         │────▶│  Railway        │────▶│  PostgreSQL     │
│  (Frontend)     │     │  (Backend)      │     │  (Railway)      │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
     Next.js              NestJS + Prisma         Base de datos
```

---

## 1️⃣ Desplegar Backend en Railway

### Paso 1: Crear cuenta en Railway
1. Ve a [railway.app](https://railway.app)
2. Inicia sesión con GitHub

### Paso 2: Crear nuevo proyecto
1. Click en "New Project"
2. Selecciona "Deploy from GitHub repo"
3. Conecta tu repositorio

### Paso 3: Agregar PostgreSQL
1. En tu proyecto, click en "+ New"
2. Selecciona "Database" → "PostgreSQL"
3. Railway creará la base de datos automáticamente

### Paso 4: Configurar variables de entorno
En el servicio del backend, agrega estas variables:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=tu-secreto-super-seguro-minimo-32-caracteres
PORT=3001
NODE_ENV=production
CORS_ORIGINS=https://tu-frontend.vercel.app
```

### Paso 5: Configurar el servicio
1. En Settings → Build:
   - Root Directory: `apps/backend`
   - Build Command: (usa Dockerfile)

2. En Settings → Deploy:
   - Start Command: `node dist/src/main.js`

### Paso 6: Ejecutar migraciones
En la terminal de Railway:
```bash
npx prisma db push
npx prisma db seed
```

---

## 2️⃣ Desplegar Frontend en Vercel

### Paso 1: Crear cuenta en Vercel
1. Ve a [vercel.com](https://vercel.com)
2. Inicia sesión con GitHub

### Paso 2: Importar proyecto
1. Click en "Add New" → "Project"
2. Selecciona tu repositorio
3. Configura:
   - Framework: Next.js
   - Root Directory: `apps/web-admin`

### Paso 3: Variables de entorno
```env
NEXT_PUBLIC_API_URL=https://tu-backend.railway.app
```

### Paso 4: Deploy
Click en "Deploy" y espera ~2 minutos

---

## 3️⃣ Configuración Post-Despliegue

### Actualizar CORS en Railway
Una vez tengas la URL de Vercel, actualiza en Railway:
```env
CORS_ORIGINS=https://tu-app.vercel.app
```

### Verificar conexión
1. Abre tu frontend en Vercel
2. Intenta hacer login
3. Verifica que los datos carguen correctamente

---

## 🔧 Comandos Útiles

### Logs en Railway
```bash
railway logs
```

### Ejecutar migraciones
```bash
railway run npx prisma db push
```

### Seed de datos
```bash
railway run npx prisma db seed
```

---

## 💰 Costos Estimados

| Servicio | Plan | Costo |
|----------|------|-------|
| Railway (Backend + DB) | Starter | ~$5/mes |
| Vercel (Frontend) | Hobby | Gratis |
| **Total** | | **~$5/mes** |

---

## 🔒 Seguridad en Producción

### Checklist antes de ir a producción:

- [ ] JWT_SECRET es único y seguro (32+ caracteres)
- [ ] CORS configurado solo para tu dominio
- [ ] DATABASE_URL no está expuesta
- [ ] HTTPS habilitado (automático en Railway/Vercel)
- [ ] Variables de entorno NO están en el código

### Para datos de salud reales (futuro):
- [ ] Certificación HIPAA/ISO 27001
- [ ] Encriptación de datos sensibles
- [ ] Auditoría de accesos
- [ ] Backup automático de base de datos

---

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en Railway
2. Verifica las variables de entorno
3. Asegúrate que la base de datos esté corriendo

---

## 🎉 ¡Listo!

Tu sistema SASSC estará disponible en:
- **Frontend**: `https://tu-app.vercel.app`
- **Backend**: `https://tu-backend.railway.app`
- **API Docs**: `https://tu-backend.railway.app/api`
