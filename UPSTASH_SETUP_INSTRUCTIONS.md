# 🔧 UPSTASH REDIS SETUP - CONFIGURACIÓN OBLIGATORIA

## ⚠️ IMPORTANTE
**El sistema de referidos REQUIERE una base de datos Redis persistente. Sin esto, todos los datos de referidos se perderán al reiniciar el servidor.**

## 📋 PASOS PARA CONFIGURAR UPSTASH REDIS

### 1. **Acceder al Marketplace de Vercel**
1. Ve a **Vercel Dashboard** → **Storage**
2. En la sección **"Marketplace Database Providers"**
3. Click en **"Upstash"** (Serverless DB - Redis, Vector, Queue)
4. Click **"Add Integration"** o **"Connect"**

### 2. **Autorizar Integración**
1. Autoriza Upstash para acceder a tu cuenta de Vercel
2. Selecciona el proyecto **"cryptogift-wallets"**
3. Click **"Install"** o **"Continue"**

### 3. **Crear Base de Datos Redis**
1. En la interfaz de Upstash:
   - **Database Name**: `cryptogift-referrals`
   - **Region**: Elige la más cercana a tus usuarios (ej: `us-east-1`, `eu-west-1`)
   - **Type**: `Pay as you Scale` (incluye free tier generoso)
   - **TLS**: Habilitado (recomendado)
2. Click **"Create Database"**

### 4. **Obtener Credenciales**
Una vez creada la base de datos:
1. Ve a la pestaña **"Details"** de tu database
2. Copia las siguientes variables:

```bash
# Estas son las variables que necesitas
UPSTASH_REDIS_REST_URL=https://YOUR-DB-NAME.upstash.io
UPSTASH_REDIS_REST_TOKEN=YOUR-TOKEN-HERE
```

### 5. **Configurar en Vercel**
1. Ve a **Vercel Dashboard** → **Proyecto cryptogift-wallets** → **Settings** → **Environment Variables**
2. Agrega estas 2 variables:

| Name | Value |
|------|-------|
| `UPSTASH_REDIS_REST_URL` | `https://your-db.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | `Tu token de Upstash` |

3. Click **"Save"**

### 6. **Re-deployar Proyecto**
1. Ve a **Deployments**
2. Click **"Redeploy"** en el último deployment
3. O haz `git push` para triggear nuevo deployment

## ✅ VERIFICACIÓN

Una vez configurado, deberías ver en los logs de Vercel:
```
🟢 Using Upstash Redis for referral database
```

En lugar de:
```
⚠️ Using mock Redis client for development
```

## 💰 COSTOS

**Upstash Free Tier incluye:**
- ✅ 10,000 requests/día
- ✅ 256 MB storage
- ✅ No límite de tiempo
- ✅ Suficiente para desarrollo y testing

**Para producción con más tráfico:**
- Pay-as-you-scale desde $0.20/100K requests
- Muy económico para aplicaciones normales

## 🔍 TROUBLESHOOTING

### Si aparece "mock Redis client":
1. Verifica que las variables estén en Vercel Environment Variables
2. Re-deploya el proyecto
3. Revisa los logs de Vercel para errores de conexión

### Si los referidos no se guardan:
1. Chequea que Upstash Redis esté activo en su dashboard
2. Verifica que las URLs y tokens sean correctos
3. Mira los logs de Function en Vercel para errores específicos

### Para desarrollo local:
1. Copia las variables a tu archivo `.env.local`
2. El sistema funcionará tanto en local como en producción

## 📚 DOCUMENTACIÓN ADICIONAL

- [Upstash Redis Docs](https://docs.upstash.com/redis)
- [Vercel + Upstash Integration](https://vercel.com/integrations/upstash)
- [Redis Commands Reference](https://redis.io/commands/)

---

**Una vez completada esta configuración, el sistema de referidos tendrá persistencia completa y updates en tiempo real funcionando correctamente.**