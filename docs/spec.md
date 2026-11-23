# App Alfredo — Spec

Web app personal (PWA) para Alfredo, 62 años, dueño de SIE Uruguay (construcción). Se instala en su iPhone 14/15 (iOS 18+) desde Safari con "Agregar a inicio". Un solo usuario. Entrega: miércoles 25/11/2026 (su cumpleaños).

Diseño de referencia (11 pantallas, mockup interactivo): https://claude.ai/artifact/SB7ptcbNAU93KnzPF4TGxT
Plan de producto y datos a cargar: https://claude.ai/artifact/Wxc6DHmSvwFeACU1851SFf

## Estilo

- Azul principal `#1F4E8C` (hover `#183E70`), fondo `#F5F7FA`, tarjetas blancas con borde `#E3E8EF`, tinte azul `#E3EBF6`, gris secundario `#ECEFF4`, texto `#1C1F24`, texto secundario `#5F646B`, urgente `#FCEBDD` / `#8A4A12`.
- Fuente Inter. Texto base 16px, títulos 28px. Botones ≥ 44px de alto. Sin emojis en la UI.
- Todo en español rioplatense (vos), sin tecnicismos.

## Navegación

Barra inferior fija: Inicio · Calendario · [botón central redondo azul con micrófono → Contame] · Mensajes · Portofino.
Desde Inicio: Vencimientos, Pendientes, Documentos, Contraseñas, Contactos.

## Pantallas

1. **Inicio**: "Buen día/tarde/noches, Alfredo" + fecha; foto familiar del día (cambia cada día); accesos directos; "Lo próximo": próximo cumpleaños, próximo vencimiento, pendientes de hoy.
2. **Calendario**: próximo cumpleaños destacado ("X cumple N · en D días"). Saludo con el nombre ya puesto, 3 tonos (Cálido, Formal, Corto), editable, botones "Enviar por WhatsApp" (abre WhatsApp con el texto y él elige el contacto: `https://wa.me/?text=…`) y "Copiar". Lista de fechas por mes (cumpleaños, aniversarios). Agregar fecha. Link a Recordatorios.
3. **Recordatorios del año**: se repiten cada año, con "avisarme X antes" (1 semana, 1 mes, 2 meses, o días a elección). Cuando está en ventana de aviso aparece con "Posponer 15 días" y "Resuelto". Resuelto lo esconde hasta el año siguiente. Precargados: Gestionar fin de año (31/12, 60 días antes), Gestionar Navidad (25/12, 60), Cena de Navidad (24/12, 30), Cena de Año Nuevo (31/12, 30), Cena de mi cumpleaños (25/11, 30), Sacar pasajes de los chicos (fecha a cargar, 60).
4. **Contame (voz)**: tocar para empezar, tocar para terminar (Safari corta en pausas: se reinicia solo y acumula). Muestra "Lo que entendí · podés corregirlo" editable con "Grabar de nuevo" y "Enviar". La IA reparte el contenido en secciones (historial/personas/servicios de una casa, pendientes, contactos, fechas, recordatorios, vencimientos). Si duda, pregunta con opciones (ej. "¿Es en Portofino, en Malibú, o es otra cosa?"; "otra cosa" → Pendientes). Confirma lo guardado y permite Deshacer. También sirve para pegar texto (carga masiva).
5. **Mensajes**: modo "Me escribieron" (pega un mensaje → respuesta sugerida) y "Quiero escribir" (a quién + qué quiere decir → mensaje). Botones: Copiar, Enviar por WhatsApp (elegir contacto), Más formal, Otra. Debe sonar como él (estilo cargado en configuración).
6. **Portofino / Malibú** (selector arriba): "Quién se ocupa" (nombre, rol, detalle, botón llamar `tel:`), "Historial" (qué pasó + fecha, más reciente arriba), "Servicios" (DirecTV, wifi, UTE, OSE, alarma, mantenimiento riego: clave → valor).
7. **Contactos**: buscador, filtro Todos/Clientes/Proveedores/Otros, nota por persona, Llamar y WhatsApp directo (si tiene número).
8. **Vencimientos**: empresa y personales, con días que faltan; urgente (≤ 7 días) en naranja; aviso antes.
9. **Pendientes y notas**: tildar, agregar escribiendo; notas (escritas o de voz).
10. **Documentos**: carpetas (crear), dentro fotos con título, fecha y vista previa; sacar foto con la cámara; ver grande.
11. **Contraseñas**: bloqueada; se abre con Face ID. Cifradas en el celular (AES-GCM); clave derivada de la passkey con la extensión WebAuthn PRF (iOS 18+); si PRF no está disponible, PIN de 6 dígitos (PBKDF2). El servidor solo guarda texto cifrado. Copiar. Se bloquea al salir de la pantalla o a los 2 minutos.

## Transversal

- **Login**: passkey (Face ID). Registro inicial con un código de configuración. Sesión larga en su iPhone.
- **Modo familia**: link con código que vence (miércoles 25/11 23:59). Solo puede ver/cargar Calendario, Recordatorios, fotos del Inicio y Portofino/Malibú. Nunca Contraseñas, Documentos, Contactos, Vencimientos, Mensajes.
- **Avisos**: notificaciones push (Web Push, app instalada) una vez por día a las 11:00 hora de Montevideo: cumpleaños (el día y 1 día antes), recordatorios en ventana, vencimientos en ventana.
- **IA**: API de Anthropic solo desde el servidor. Presupuesto 20 USD; se registra el costo de cada llamada; al pasar 16 USD se manda un mail a Diego (una sola vez); al llegar a 20 USD las funciones de IA muestran "Se terminó el saldo de la IA, avisale a Diego" sin romperse.
- **Números**: formato Uruguay → internacional (`099 123 456` → `59899123456`).
