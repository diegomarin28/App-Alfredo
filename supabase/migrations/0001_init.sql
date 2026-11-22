-- App Alfredo: esquema inicial.
-- Un solo usuario. El servidor accede con la service_role key; RLS activado
-- en todas las tablas y sin políticas para anon/authenticated.

create table fechas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text not null check (tipo in ('cumple', 'aniversario', 'otra')),
  dia text not null check (dia ~ '^\d{2}-\d{2}$'),          -- MM-DD
  anio_nacimiento int,
  lote_id uuid,
  creado_en timestamptz not null default now()
);

create table recordatorios (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  dia text check (dia ~ '^\d{2}-\d{2}$'),                    -- null = fecha a cargar
  avisar_dias_antes int not null default 30,
  pospuesto_hasta date,
  resuelto_anio int,
  lote_id uuid,
  creado_en timestamptz not null default now()
);

create table vencimientos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  ambito text not null check (ambito in ('empresa', 'personal')),
  fecha date not null,
  avisar_dias_antes int not null default 7,
  hecho boolean not null default false,
  lote_id uuid,
  creado_en timestamptz not null default now()
);

create table personas_casa (
  id uuid primary key default gen_random_uuid(),
  casa text not null check (casa in ('portofino', 'malibu')),
  nombre text not null,
  rol text not null,
  detalle text,
  telefono text,
  lote_id uuid,
  creado_en timestamptz not null default now()
);

create table eventos_casa (
  id uuid primary key default gen_random_uuid(),
  casa text not null check (casa in ('portofino', 'malibu')),
  que text not null,
  cuando date not null,
  lote_id uuid,
  creado_en timestamptz not null default now()
);

create table servicios_casa (
  id uuid primary key default gen_random_uuid(),
  casa text not null check (casa in ('portofino', 'malibu')),
  clave text not null,
  valor text not null,
  lote_id uuid,
  creado_en timestamptz not null default now()
);

create table contactos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text not null default 'otro' check (tipo in ('cliente', 'proveedor', 'otro')),
  empresa text,
  telefono text,
  nota text,
  lote_id uuid,
  creado_en timestamptz not null default now()
);

create table pendientes (
  id uuid primary key default gen_random_uuid(),
  texto text not null,
  hecho boolean not null default false,
  lote_id uuid,
  creado_en timestamptz not null default now()
);

create table notas (
  id uuid primary key default gen_random_uuid(),
  texto text not null,
  origen text not null check (origen in ('voz', 'escrita')),
  lote_id uuid,
  creado_en timestamptz not null default now()
);

create table carpetas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  creado_en timestamptz not null default now()
);

create table documentos (
  id uuid primary key default gen_random_uuid(),
  carpeta_id uuid not null references carpetas(id) on delete cascade,
  titulo text not null,
  path text not null,
  creado_en timestamptz not null default now()
);
create index documentos_carpeta_idx on documentos (carpeta_id);

create table fotos (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  creado_en timestamptz not null default now()
);

create table claves (
  id uuid primary key default gen_random_uuid(),
  sitio text not null,
  usuario text,
  cifrado text not null,   -- base64, AES-GCM, cifrado en el celular
  iv text not null,        -- base64, 12 bytes
  creado_en timestamptz not null default now()
);

create table uso_ia (
  id uuid primary key default gen_random_uuid(),
  tokens_in int not null,
  tokens_out int not null,
  costo_usd numeric(10, 6) not null,
  creado_en timestamptz not null default now()
);

create table config (
  id int primary key default 1 check (id = 1),               -- una sola fila
  nombre text not null default 'Alfredo',
  estilo_escritura text not null default '',
  alerta_ia_enviada boolean not null default false,
  clave_salt text,
  clave_modo text check (clave_modo in ('prf', 'pin')),
  clave_check text,       -- "ok" cifrado, para detectar PIN incorrecto
  clave_check_iv text
);

create table passkeys (
  id uuid primary key default gen_random_uuid(),
  credential_id text not null unique,
  public_key text not null,
  counter bigint not null default 0,
  transports text[],
  creado_en timestamptz not null default now()
);

create table suscripciones (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  creado_en timestamptz not null default now()
);

-- Seguridad: RLS en todo, sin políticas → solo la service_role accede.
do $$
declare t text;
begin
  foreach t in array array[
    'fechas','recordatorios','vencimientos','personas_casa','eventos_casa',
    'servicios_casa','contactos','pendientes','notas','carpetas','documentos',
    'fotos','claves','uso_ia','config','passkeys','suscripciones'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke all on table %I from anon, authenticated', t);
  end loop;
end $$;

-- Archivos (fotos familiares y documentos): bucket privado.
insert into storage.buckets (id, name, public) values ('archivos', 'archivos', false)
on conflict (id) do nothing;

-- Datos iniciales.
insert into config (id) values (1) on conflict (id) do nothing;

insert into carpetas (nombre) values ('Seguros'), ('Escrituras'), ('Autos'), ('Personales')
on conflict (nombre) do nothing;

insert into recordatorios (titulo, dia, avisar_dias_antes) values
  ('Gestionar fin de año',          '12-31', 60),
  ('Gestionar Navidad',             '12-25', 60),
  ('Cena de Navidad',               '12-24', 30),
  ('Cena de Año Nuevo',             '12-31', 30),
  ('Cena de mi cumpleaños',         '11-25', 30),
  ('Sacar pasajes de los chicos',   null,    60);
