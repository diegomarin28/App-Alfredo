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
| `ANTHROPIC_API_KEY` | Clave de Anthropic (solo servidor). **Obligatoria**: sin ella Contame y Mensajes no andan y la app muestra "La IA no está configurada, avisale a Diego." (la IA falsa es solo para pruebas). | `<clave anthropic>` |
| `AI_BUDGET_USD` | Saldo total de IA en USD (suma lo gastado por los dos modelos, ver "Modelos y precios de la IA"). | `20` |
| `AI_ALERT_USD` | Umbral del aviso por mail en USD (se manda una sola vez). | `16` |
| `ALERT_EMAIL` | Mail que recibe el aviso de saldo. | `tu@mail.com` |
| `ALERT_FROM` | Remitente del aviso (Resend). | `App Alfredo <onboarding@resend.dev>` |
| `RESEND_API_KEY` | Clave de Resend. Sin ella el aviso de poco saldo **no se manda**: queda un `console.error` en los logs de Vercel y el aviso no se marca como enviado. | `<clave resend>` |
| `VAPID_PUBLIC_KEY` | Clave pública de avisos push (servidor). | `<salida de web-push>` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | La misma clave pública, para el navegador. | `<misma que VAPID_PUBLIC_KEY>` |
| `VAPID_PRIVATE_KEY` | Clave privada de avisos push. | `<salida de web-push>` |
| `VAPID_SUBJECT` | Contacto para el servicio de push. | `mailto:tu@mail.com` |
| `CRON_SECRET` | Secreto del cron. Vercel lo manda solo como `Authorization: Bearer <CRON_SECRET>`. Largo y al azar. | `<secreto largo al azar>` |

Ya no hacen falta (si quedaron cargadas, se ignoran): `ANTHROPIC_MODEL`, `AI_PRICE_INPUT_PER_MTOK`, `AI_PRICE_OUTPUT_PER_MTOK`.

No cargues en producción: `ENABLE_TEST_ROUTES`, `AI_BACKEND` (`fake`), `TEST_TODAY` ni `SUPABASE_TEST_*`. Son solo para pruebas.

### Generar las claves VAPID

```
npx web-push generate-vapid-keys
```

La pública va en `VAPID_PUBLIC_KEY` y en `NEXT_PUBLIC_VAPID_PUBLIC_KEY`; la privada, en `VAPID_PRIVATE_KEY`. Después de cambiar una variable `NEXT_PUBLIC_*` hay que volver a desplegar.

## 3. Avisos diarios (cron)

`vercel.json` programa `/api/cron/avisos` con `0 14 * * *`: todos los días a las 14:00 UTC, que son las **11:00 de Montevideo**. En el plan **Hobby** de Vercel los cron no son puntuales: el aviso sale en algún momento **entre las 11:00 y las 11:59** de Montevideo (en Pro sale a la hora exacta). Si definís `CRON_SECRET`, Vercel manda `Authorization: Bearer $CRON_SECRET` automáticamente y la ruta lo exige. Para probar a mano: `curl -H "Authorization: Bearer <CRON_SECRET>" https://<dominio>/api/cron/avisos`.

## 4. Duración de las funciones de IA

Las rutas de IA declaran cuánto pueden tardar: `/api/ai/mensajes` hasta **60 s** y `/api/ai/contame` hasta **300 s** (`maxDuration`; Contame hace varias rondas con el modelo). Con **Fluid compute** (viene activado por defecto en los proyectos nuevos) el plan **Hobby** permite `maxDuration` de hasta 300 s, así que alcanza. Verificá que Fluid compute esté **Enabled** en Vercel > Project > Settings > Functions: si está apagado, el tope es menor, Vercel recorta la duración y un Contame largo puede cortarse con error.

### Modelos y precios de la IA

Los modelos y sus precios están fijos en el código (`src/ai/client.ts` y `src/ai/precios.ts`), en USD por millón de tokens:

| Uso | Modelo | Entrada | Salida | Leer caché | Escribir caché (5 min) | `max_tokens` |
|---|---|---|---|---|---|---|
| Mensajes | `claude-sonnet-5-5` | 2 | 10 | 0,10 | 2,50 | 400 (sin pensar) |
| Contame | `claude-haiku-5-5` | 0,10 | 0,50 | 0,01 | 0,125 | 2000 (herramienta forzada) |

Si un pedido a Haiku pasa de 100.000 tokens de entrada (contando la caché), se cobra 0,50 / 2,50 (caché: 0,05 / 0,625). Cada uso guarda su costo exacto y el saldo (`AI_BUDGET_USD`) y el aviso (`AI_ALERT_USD`) miran la suma de los dos modelos. El prompt de sistema va con caché de 5 minutos (si tiene menos de 512 tokens no se cachea, sin error). Si Anthropic cambia los precios, hay que actualizar `src/ai/precios.ts`.

### Probar Contame con Haiku (API real)

Los tests nunca llaman a Anthropic. Para comprobar con la API real que Contame funciona con Haiku (gasta menos de un centavo):

```
ANTHROPIC_API_KEY=<clave anthropic> pnpm probar-haiku "Ayer le pagué a Simón. Llamar al plomero."
```

Manda una clasificación con el mismo prompt, herramientas y opciones que la app e imprime el modelo, el `stop_reason`, la herramienta (`guardar` o `preguntar`) con su input, el uso de tokens (con caché) y el costo. Termina con "OK" (código 0) si respondió con una herramienta. No guarda nada en la base.

## 5. Límite de 4,5 MB

Vercel rechaza pedidos de más de 4,5 MB. Por eso las fotos se comprimen en el teléfono antes de subirlas, para quedar por debajo del límite. Un archivo muy grande que no sea foto puede fallar con un error de tamaño.

## 6. Primera vez en el iPhone de Alfredo

1. Abrir la URL de la app en **Safari**. Aparece `/entrar`.
2. Tocar **Configurar Face ID por primera vez** (lleva a `/configurar`; el link solo aparece mientras no hay ninguna passkey) e ingresar el `SETUP_CODE`.
3. Aceptar **Face ID**. Queda guardada la passkey y se abre el Inicio.
4. En Safari, tocar Compartir > **Agregar a inicio**.
5. Abrir la app desde el **ícono** (no desde Safari).
6. Tocar **Entrar con Face ID** (la app instalada no comparte la sesión de Safari, por eso se entra de nuevo).
7. En **Ajustes > Activar avisos**, permitir las notificaciones (en iPhone solo funciona desde la app instalada).
8. En **Ajustes > Cómo escribís**, pegar 3 o 4 mensajes reales suyos, y revisar **Cómo te saludan**.
9. Para la familia, ver la sección 7, "Link para la familia", más abajo (la app ya no lo muestra en Ajustes).

Una vez registrada la primera passkey, el `SETUP_CODE` ya no alcanza: `/configurar` dice "Face ID ya está configurado". Para sumar otra passkey (por ejemplo, en un teléfono nuevo sin iCloud Llavero) hay que estar adentro de la app con Face ID y entrar a `/configurar` desde ahí.

## 7. Link para la familia

Alfredo no ve este link: lo arma y lo comparte Diego por WhatsApp. Se arma así:

```
<APP_ORIGIN>/familia?codigo=<FAMILY_CODE>
```

- `<APP_ORIGIN>` es la dirección pública de la app y `<FAMILY_CODE>` el valor de la variable, codificado para URL (si tiene caracteres raros, por ejemplo con `encodeURIComponent`; con letras, números y guiones queda igual).
- El link sirve hasta `FAMILY_EXPIRES_AT`. Después hay que cambiar esa fecha (y, si querés, el código) y volver a compartirlo.

## 8. Contraseñas: cosas a tener en cuenta

- **PRF o PIN.** Si el teléfono soporta PRF (extensión de la passkey), Face ID abre las contraseñas solo. Si no, se pide un PIN de 6 números además de Face ID. El modo se fija la primera vez y no se cambia.
- **Teléfono nuevo o passkey nueva en modo PRF**: no puede abrir las contraseñas ya guardadas. Mantené una copia de las contraseñas en otro lugar seguro.
- **El PIN es más débil**: frente a alguien que robe la base de datos, un PIN de 6 números se puede adivinar por fuerza bruta mucho más fácil que una clave PRF.
- **Una contraseña copiada queda en el portapapeles** hasta que se copie otra cosa.

## 9. Revisiones manuales en un iPhone real

- [ ] Instalada desde Safari, abre a pantalla completa con el ícono.
- [ ] Login con Face ID y desbloqueo de Contraseñas (confirmar el camino PRF en iOS 18; si no, PIN).
- [ ] Dictado de Contame en modo instalado: las pausas no cortan el texto.
- [ ] Llega un aviso de prueba (llamar a mano a la ruta del cron).
- [ ] El link de familia armado a mano abre `/familia` en el teléfono de la familia.
- [ ] La cámara se abre desde Documentos.
- [ ] El modelo real pregunta en Contame en vez de adivinar.
- [ ] `pnpm probar-haiku` termina en OK (Contame con `claude-haiku-5-5`).
- [ ] Mensajes con la clave real sugiere una respuesta (`claude-sonnet-5-5`, sin pensar).
- [ ] Dictado: las pausas y el tope de 5 reinicios automáticos se comportan bien.
- [ ] La hoja de Face ID no deja las contraseñas bloqueadas por el bloqueo automático al ocultarse la app (desbloquear varias veces seguidas).
