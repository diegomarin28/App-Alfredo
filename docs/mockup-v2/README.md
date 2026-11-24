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
