# Mockup v2: pantallas pulidas (iPhone 390x844)

Referencia visual para la ronda de pulido. Reemplaza a docs/mockup/ donde difieran.
Cada archivo .dc.html es una pantalla; los estilos están inline. Abrilos en un navegador.

Reglas que salen de este mockup:
- Borrar: ícono de basurita roja (#B3261E), 44x44, sin fondo, con confirmación o deshacer.
- Agregar: botón redondo azul "+" de 44 px a la derecha del título; dentro de secciones, link azul "+ Agregar".
- Listas: tarjeta blanca única con separadores finos, en vez de una tarjeta por ítem.
- Tildar (pendientes, vencimientos): círculo de 26 px a la izquierda, área de toque 44.
- Menú de abajo: Inicio, Calendario, Contame (círculo 56 px apenas elevado), Mensajes, Casas; con espacio para la barra de inicio del iPhone (safe-area-inset-bottom) para que nada se vea cortado.
- Paneles (agregar fecha, saludo, agregar documento): hoja que sube desde abajo, manija arriba, cerrar con ×.
- Saludo de cumpleaños: plegado; se abre con "Mandar saludo". Tonos Formal / Cercano / Breve, Formal por defecto, nunca juvenil.
- Modo familia: franja "Modo carga · el link vence…", saludo "Cargando datos para Alfredo", menú Inicio / Fechas / Fotos / Casas.

## Cambios pedidos por Diego (ronda 2)
- Inicio: saludo según la hora (Buen día / Buenas tardes / Buenas noches) y la fecha. Ajustes con ícono de tuerca (no sol). Accesos en rectángulos de 2 columnas (ícono + texto, 52 px de alto): Vencimientos, Pendientes, Recordatorios, Contactos, Documentos, Contraseñas.
- Calendario: el botón "Mandar saludo" aparece SOLO el día del cumpleaños (tarjeta "Hoy cumple X"). Los otros días la tarjeta muestra el próximo cumple sin botón. La fila se llama "Recordatorios" (no "Recordatorios del año").
- Contactos: sin categorías fijas (Clientes/Proveedores/Otros). Grupos que crea y nombra Alfredo ("+ Grupo"); cada contacto puede tener un grupo. Hace falta migración: tabla grupos_contacto (id, nombre, orden) y contactos.grupo_id nullable; migrar los tipos viejos a grupos con ese nombre.
- Documentos: carpetas que crea él, con 6 sugeridas de arranque y su descripción: Personales (cédula, pasaporte, carné), Seguros (auto, casas, vida), Escrituras (Portofino, Malibú), Autos (libretas, patentes), Empresa (SIE: contratos, BPS), Salud (carné, estudios). Agregar descripción opcional a carpetas.
- Primera vez que entra: pantalla Bienvenida ("¡Feliz cumpleaños, Alfredo!", regalo de Pau y Diego) y después Guía de 7 pasos (Guia.dc.html, con Atrás/Siguiente/Saltar/Empezar). Se muestra una sola vez (guardar en config: bienvenida_vista). En Ajustes, "Ver la guía de nuevo".

## Movimiento y respuesta al toque
- Todo lo que se toca: escala 0.97 y opacidad 0.85 en 90 ms al apretar, vuelve con 160 ms ease-out. Sin retraso de 300 ms (touch-action: manipulation).
- Paneles: suben con 260 ms cubic-bezier(0.32,0.72,0,1); el fondo se oscurece en 200 ms; se cierran arrastrando hacia abajo.
- Cambio de pantalla: View Transitions con fundido + desplazamiento de 8 px, 180 ms; el menú no se mueve.
- Listas: al agregar, el ítem nuevo aparece con fundido; al borrar, se colapsa en 200 ms y aparece "Deshacer" 5 s.
- Tildar: el círculo se llena con un pequeño rebote (escala 1.15 → 1) en 220 ms.
- Contame escuchando: anillos que respiran alrededor del botón (2 s, en loop).
- prefers-reduced-motion: sin movimientos, solo cambios de opacidad.

## Pendiente para más adelante (NO hacer ahora)
- Nombre, logo, ícono de la app y pantalla de carga.
- Avisos por WhatsApp (además de las notificaciones push).
- Video tutorial.

## Ronda 3: arreglos de la revisión de capturas
- Volver: la flecha de "‹ Inicio" / "‹ Documentos" apunta a la IZQUIERDA (hoy sale "›").
- Cuadros de texto: sin la esquina para estirar (resize: none); que crezcan solos con el contenido.
- Casas, personas: el subtítulo en una sola línea (ellipsis) y botones de teléfono/basurita más compactos (44 px de toque, ícono 20, sin fondo en la basurita).
- Contraseñas bloqueada: candado grande arriba (círculo 96 px #E3EBF6 con candado azul) y texto corto: "Solo se abren con tu Face ID. Se cierran solas a los 2 minutos."
- Contactos: que "+ Grupo" se vea entero (la fila de grupos se desliza; dejá 20 px de margen al final).

## Detalles personales (Detalle*.dc.html): le gustan el whisky, el golf, el pádel, el truco y el backgammon
Cada uno es una animación corta, en los colores de la app, en SVG/CSS (sin imágenes ni librerías), y con prefers-reduced-motion se muestra el estado final sin moverse.
- DetalleGolf: al tildar el ÚLTIMO pendiente, la pelota rueda y entra al hoyo, la bandera flamea y aparece "Todo al día · Hoyo en uno, Alfredo." (una vez, ~2 s; después queda el estado vacío con el hoyo quieto).
- DetalleSwing: Vencimientos sin nada pendiente: un palo golpea la pelota (una vez al entrar) y "Nada por vencer · Todo en regla. Vas bajo par."
- DetallePadel: mientras Contame guarda, la pelota de pádel rebota contra la pared + "Guardando…" (en loop mientras espera; reemplaza al spinner). Usarlo también en "Sugerir respuesta" de Mensajes mientras espera.
- DetalleWhisky: el 25 de noviembre (su cumple), al abrir la app por primera vez ese día: dos vasos con hielo brindan y "¡Salud, Alfredo! Feliz cumpleaños." con botón "Gracias". También va arriba de la Bienvenida de la primera vez.
- DetalleHielo: el gesto de deslizar hacia abajo para actualizar en Inicio muestra un hielo que cae en el vaso (reemplaza al indicador de carga).
- Viernes después de las 18 h, el saludo de Inicio dice "Buen viernes, Alfredo".
- TrucoFlor (truco): cuando tilda el TERCER pendiente del mismo día, tres cartas de oro (7, 12 y 3) se abren en abanico y aparece "¡Flor! Tres resueltos en el día." Siempre igual, sin muestra. Cartas dibujadas simples en SVG como en el archivo. Una vez por día como máximo (~1,6 s). Si ese tercero es también el último pendiente, primero la Flor y después el golf.
- DetalleDados: "Otra versión" en Mensajes tira dos dados (como en el backgammon) mientras genera la nueva respuesta.
Ninguna animación bloquea: se puede seguir tocando mientras corre.

## Ronda 4b: nombre, ícono, pantalla de carga y repetición en Calendario
- Nombre: AlfredIA en manifest (name y short_name), <title>, Entrar y Bienvenida ("Esta app es tu regalo" sigue igual). Íconos de docs/brand/ (copiar a public/ y referenciar en manifest + apple-touch-icon). theme_color y background_color del manifest: #112A50.
- Pantalla de carga: fondo #112A50, "AlfredIA" y abajo en chico "De: Pau y Diego" (sin "Feliz cumpleaños"). apple-touch-startup-image estática con docs/brand/splash/golf1.png centrado, para iPhone 14 a 17 Pro Max. Al abrir en frío, intro de ~2,5 s con los cuadros reales de docs/brand/splash/ (Alfredo con su cara, 520x640, transparentes, pies alineados): GOLF = golf1 (0–32%), golf2 (32–50%), golf3 (50–56%), golf4 (56–100%) en 3 s; PÁDEL = padel1 (0–42%), padel2 (42–54%), padel3 (54–100%) en 2,4 s; fundido de 40 ms entre cuadros y un "respiro" de 3 px arriba/abajo (ver CargaGolf/CargaPadel.dc.html). Se ALTERNAN golf/pádel en cada apertura (localStorage). Se saltea tocando; con reduce-motion se muestra solo el último cuadro. Precargar las imágenes.
- Calendario, tipos y repetición:
  - Tipo: solo "Cumpleaños" u "Otra" (sacar "Aniversario"; los aniversarios existentes pasan a "Otra" con repetición anual, conservando el nombre).
  - Cumpleaños: se repite todos los años, fijo (mostrar "Se repite todos los años" como texto, sin selector). Año de nacimiento opcional como hoy.
  - Otra: campo "Se repite" con controles segmentados o lista: No se repite · Todos los días · Todas las semanas · Todos los meses · Todos los años. Fecha completa (día, mes, año) cuando no se repite o para saber desde cuándo; semanal toma el día de la semana de esa fecha; mensual el día del mes (si el mes no tiene ese día, el último día). Hora opcional.
  - En la lista del calendario mostrar la próxima ocurrencia y un rótulo chico ("cada semana", "cada mes"…). Los avisos del día (push de las 11) incluyen las fechas "Otra" que caen ese día.
  - Migración en supabase/migrations/ SIN aplicar: fechas.repeticion text check in ('nunca','diaria','semanal','mensual','anual') default 'anual', fechas.anio_evento int null, fechas.hora time null; update tipo 'aniversario' → 'otra'. La función proximaOcurrencia se extiende con tests para cada repetición (incluido 31 en meses cortos y 29/2).
- Nombre de sección: "Pendientes" pasa a llamarse "Tareas pendientes" en todos lados (título de la pantalla, acceso de Inicio, menú lateral, "Lo próximo" → "2 tareas pendientes", rótulos de Contame/"Lo último que guardé", Guía y textos de la IA al clasificar). En el acceso de Inicio, si no entra en una línea, que haga salto de línea prolijo (no "…"). La ruta /pendientes puede quedar igual.
- Recordatorios, repetición y posponer:
  - "Agregar recordatorio" y editar: además de Título, fecha y "Avisarme con", un campo "Se repite" con las mismas opciones que Calendario (No se repite · Todos los días · Todas las semanas · Todos los meses · Todos los años). Default: Todos los años. Si no se repite, pedir fecha completa (día/mes/año). "Elegí" en Día y Mes como placeholder está bien, pero el campo debe verse vacío (gris) hasta elegir.
  - "Avisarme con" agrega "1 día" y "3 días" a las opciones; "Otro" deja escribir N días/semanas/meses.
  - "Posponer": en vez de "Posponer 15 días" fijo, el botón "Posponer" abre una hoja chica para elegir cuánto: 1 día · 3 días · 1 semana · 15 días · 1 mes · Elegir fecha. Cada recordatorio guarda su "posponer por defecto" (se elige al crearlo, default 15 días) y esa opción aparece primera y marcada.
  - Migración (archivo, SIN aplicar): recordatorios.repeticion (mismo check que fechas), recordatorios.anio int null, recordatorios.posponer_dias int not null default 15. Los recordatorios existentes quedan 'anual'. Tests de próxima ocurrencia y de posponer para cada repetición.
