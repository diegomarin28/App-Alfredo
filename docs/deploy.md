# Guía de despliegue de App Alfredo (para Diego)

## 1. Supabase

El proyecto `jtvcfwjixvbyzcbhcwkl` ya tiene el esquema y los datos iniciales aplicados. **No lo vuelvas a crear.** Las migraciones están en `supabase/migrations` (`0001_init.sql`, `0002_revoke_rls_auto_enable_public.sql`); si hay una nueva, se aplica sobre ese mismo proyecto.

Los datos del proyecto (URL y clave `service_role`) se sacan de Supabase > Project Settings > API. La clave `service_role` solo va en el servidor (Vercel), nunca en el navegador ni en el repo.

## 2. Variables de entorno en Vercel

Se cargan en Vercel > Project > Settings > Environment Variables (Production). Los valores de la tabla son ejemplos o marcadores; nunca subas valores reales al repo.

| Variable | Qué es | Ejemplo / marcador |
|---|---|---|
| `DATA_BACKEND` | De dónde salen los datos. En producción tiene que ser `supabase`: con otro valor (o sin cargarlo) la app no arranca y muestra "Algo salió mal", en vez de guardar en memoria y perderlo todo. | `supabase` |
| `SUPABASE_URL` | URL del proyecto Supabase. | `https://jtvcfwjixvbyzcbhcwkl.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave `service_role` (solo servidor). | `<clave service_role>` |
| `SESSION_SECRET` | Secreto de la cookie de sesión, 32+ caracteres al azar. | `openssl rand -base64 48` |
| `SETUP_CODE` | Código para registrar Face ID en `/configurar`. **20 caracteres o más**, al azar (no hay límite de intentos; uno más corto no se acepta nunca). Solo sirve mientras no hay ninguna passkey: después, sumar otra pide estar adentro. | `openssl rand -base64 24` |
| `NEXT_PUBLIC_RP_ID` | Dominio de la app, sin `https://`. Tiene que coincidir con el dominio real. | `alfredo.vercel.app` |
| `APP_ORIGIN` | Origen completo de la app. | `https://alfredo.vercel.app` |
| `FAMILY_CODE` | Código del link de familia `/familia?codigo=...`. **20 caracteres o más**, al azar (uno más corto no se acepta nunca). Que sea apto para URL: letras, números y guiones. | `openssl rand -hex 16` |
| `FAMILY_EXPIRES_AT` | Hasta cuándo sirve el link de familia. | `2026-11-25T23:59:00-03:00` |
| `ANTHROPIC_API_KEY` | Clave de Anthropic (solo servidor). Sin ella se usa una IA falsa. | `<clave anthropic>` |
| `ANTHROPIC_MODEL` | Modelo a usar. | `claude-sonnet-5-5` |
| `AI_PRICE_INPUT_PER_MTOK` | Precio USD por millón de tokens de entrada (mirar docs.claude.com pricing). Sin esto la IA se niega a funcionar. | `<precio>` |
| `AI_PRICE_OUTPUT_PER_MTOK` | Precio USD por millón de tokens de salida. | `<precio>` |
| `AI_BUDGET_USD` | Saldo total de IA en USD. | `20` |
| `AI_ALERT_USD` | Umbral del aviso por mail en USD (se manda una sola vez). | `16` |
| `ALERT_EMAIL` | Mail que recibe el aviso de saldo. | `tu@mail.com` |
| `ALERT_FROM` | Remitente del aviso (Resend). | `App Alfredo <onboarding@resend.dev>` |
| `RESEND_API_KEY` | Clave de Resend. Sin ella los mails se simulan. | `<clave resend>` |
| `VAPID_PUBLIC_KEY` | Clave pública de avisos push (servidor). | `<salida de web-push>` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | La misma clave pública, para el navegador. | `<misma que VAPID_PUBLIC_KEY>` |
| `VAPID_PRIVATE_KEY` | Clave privada de avisos push. | `<salida de web-push>` |
| `VAPID_SUBJECT` | Contacto para el servicio de push. | `mailto:tu@mail.com` |
| `CRON_SECRET` | Secreto del cron. Vercel lo manda solo como `Authorization: Bearer <CRON_SECRET>`. Largo y al azar. | `<secreto largo al azar>` |

No cargues en producción: `ENABLE_TEST_ROUTES`, `AI_BACKEND` (`fake`), `TEST_TODAY` ni `SUPABASE_TEST_*`. Son solo para pruebas.

### Generar las claves VAPID

```
npx web-push generate-vapid-keys
```

La pública va en `VAPID_PUBLIC_KEY` y en `NEXT_PUBLIC_VAPID_PUBLIC_KEY`; la privada, en `VAPID_PRIVATE_KEY`. Después de cambiar una variable `NEXT_PUBLIC_*` hay que volver a desplegar.

## 3. Avisos diarios (cron)

`vercel.json` programa `/api/cron/avisos` con `0 14 * * *`: todos los días a las 14:00 UTC, que son las **11:00 de Montevideo**. Si defines `CRON_SECRET`, Vercel manda `Authorization: Bearer $CRON_SECRET` automáticamente y la ruta lo exige. Para probar a mano: `curl -H "Authorization: Bearer <CRON_SECRET>" https://<dominio>/api/cron/avisos`.

## 4. Límite de 4,5 MB

Vercel rechaza pedidos de más de 4,5 MB. Por eso las fotos se comprimen en el teléfono antes de subirlas, para quedar por debajo del límite. Un archivo muy grande que no sea foto puede fallar con un error de tamaño.

## 5. Primera vez en el iPhone de Alfredo

1. Abrir la URL de la app en **Safari**. Aparece `/entrar`.
2. Tocar **Configurar Face ID por primera vez** (lleva a `/configurar`; el link solo aparece mientras no hay ninguna passkey) e ingresar el `SETUP_CODE`.
3. Aceptar **Face ID**. Queda guardada la passkey y se abre el Inicio.
4. En Safari, tocar Compartir > **Agregar a inicio**.
5. Abrir la app desde el **ícono** (no desde Safari).
6. Tocar **Entrar con Face ID** (la app instalada no comparte la sesión de Safari, por eso se entra de nuevo).
7. En **Ajustes > Activar avisos**, permitir las notificaciones (en iPhone solo funciona desde la app instalada).
8. En **Ajustes > Cómo escribís**, pegar 3 o 4 mensajes reales suyos, y revisar **Cómo te saludan**.
9. Para la familia: **Ajustes > Link para la familia** > Enviar por WhatsApp.

Una vez registrada la primera passkey, el `SETUP_CODE` ya no alcanza: `/configurar` dice "Face ID ya está configurado". Para sumar otra passkey (por ejemplo, en un teléfono nuevo sin iCloud Llavero) hay que estar adentro de la app con Face ID y entrar a `/configurar` desde ahí.

## 6. Contraseñas: cosas a tener en cuenta

- **PRF o PIN.** Si el teléfono soporta PRF (extensión de la passkey), Face ID abre las contraseñas solo. Si no, se pide un PIN de 6 números además de Face ID. El modo se fija la primera vez y no se cambia.
- **Teléfono nuevo o passkey nueva en modo PRF**: no puede abrir las contraseñas ya guardadas. Mantené una copia de las contraseñas en otro lugar seguro.
- **El PIN es más débil**: frente a alguien que robe la base de datos, un PIN de 6 números se puede adivinar por fuerza bruta mucho más fácil que una clave PRF.
- **Una contraseña copiada queda en el portapapeles** hasta que se copie otra cosa.

## 7. Revisiones manuales en un iPhone real

- [ ] Instalada desde Safari, abre a pantalla completa con el ícono.
- [ ] Login con Face ID y desbloqueo de Contraseñas (confirmar el camino PRF en iOS 18; si no, PIN).
- [ ] Dictado de Contame en modo instalado: las pausas no cortan el texto.
- [ ] Llega un aviso de prueba (llamar a mano a la ruta del cron).
- [ ] "Enviar por WhatsApp" abre WhatsApp con el texto y el selector de contactos.
- [ ] La cámara se abre desde Documentos.
- [ ] El modelo real pregunta en Contame en vez de adivinar.
- [ ] El uso de herramientas funciona con `claude-sonnet-5-5`.
- [ ] Dictado: las pausas y el tope de 5 reinicios automáticos se comportan bien.
- [ ] La hoja de Face ID no deja las contraseñas bloqueadas por el bloqueo automático al ocultarse la app (desbloquear varias veces seguidas).
