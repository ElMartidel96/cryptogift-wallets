# 🕐 CRON JOBS CONFIGURATION GUIDE

## 📋 OVERVIEW

Este documento explica la configuración de cron jobs para automatización del sistema escrow temporal.

## ⚠️ LIMITACIONES ACTUALES

**PROBLEMA:** Los planes gratuitos de Vercel limitan a **2 cron jobs máximo**. 

**SOLUCIÓN TEMPORAL:** Los cron jobs están **deshabilitados** en `vercel.json` para evitar fallos de deploy automático.

## 🛠️ CRON JOBS DISPONIBLES

### 1. **Cleanup Transactions** - `/api/cron/cleanup-transactions`
- **Función:** Limpia transacciones obsoletas en Redis
- **Frecuencia recomendada:** Cada 6 horas (`0 */6 * * *`)
- **Propósito:** Mantiene la higiene de Redis removiendo registros expirados

### 2. **Auto Return Gifts** - `/api/cron/auto-return` 
- **Función:** Auto-retorna regalos expirados a creadores
- **Frecuencia recomendada:** Cada hora (`0 * * * *`)
- **Propósito:** Automatiza la devolución de NFTs cuando expiran los tiempos de escrow

## 🔧 IMPLEMENTACIÓN FUTURA (PLANES PAGOS)

### Paso 1: Activar en vercel.json
```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-transactions",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/auto-return",
      "schedule": "0 * * * *"
    }
  ]
}
```

### Paso 2: Configurar Variables de Entorno
```bash
CRON_SECRET=tu_secret_aqui_para_autenticacion
```

### Paso 3: Verificar Funcionalidad
- Los endpoints están **disponibles ahora** para testing manual
- Pueden ser llamados por servicios externos si es necesario

## 🧪 TESTING MANUAL

### Cleanup Transactions:
```bash
curl -X GET "https://tu-app.vercel.app/api/cron/cleanup-transactions" \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

### Auto Return:
```bash
curl -X GET "https://tu-app.vercel.app/api/cron/auto-return" \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

## 💰 PLANES DE VERCEL Y LÍMITES

| Plan | Cron Jobs Máximo | Precio |
|------|------------------|--------|
| Hobby (Gratuito) | 2 | $0 |
| Pro | 40 | $20/mes |
| Enterprise | Unlimited | Custom |

## 🎯 BENEFICIOS DE ACTIVAR CRON JOBS

1. **Automatic Cleanup:** Reduce uso de memoria Redis
2. **User Experience:** NFTs se devuelven automáticamente sin intervención manual
3. **System Health:** Mantiene el sistema limpio y eficiente
4. **Security:** Previene acumulación de datos obsoletos

## 📝 NOTAS IMPORTANTES

- Los endpoints de cron **YA ESTÁN IMPLEMENTADOS** y funcionando
- Solo necesitan activación en `vercel.json` cuando sea posible
- Alternativa: Usar servicios externos como GitHub Actions o cPanel crons
- Los endpoints requieren autenticación con `CRON_SECRET`

## 🔗 SERVICIOS ALTERNATIVOS

Si no quieres pagar Vercel Pro, puedes usar:
- **GitHub Actions** (gratuito para repositorios públicos)
- **Uptime Robot** (monitoring con webhooks)
- **Zapier** (automatización con schedule)
- **cPanel Cron Jobs** (si tienes hosting tradicional)

---

**Estado actual:** Endpoints implementados ✅, Cron automation deshabilitada temporalmente ⏸️