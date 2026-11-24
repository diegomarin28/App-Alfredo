-- Ronda de pulido (mockup v2). La aplica Diego a mano; no corre sola.

-- 1. Contactos: grupos que crea y nombra Alfredo, en vez de las categorías fijas cliente/proveedor/otro.
create table if not exists grupos_contacto (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  orden int not null default 0,
  creado_en timestamptz not null default now()
);
create unique index if not exists grupos_contacto_nombre_unico on grupos_contacto (lower(nombre));
alter table grupos_contacto enable row level security;

alter table contactos add column if not exists grupo_id uuid references grupos_contacto (id) on delete set null;

-- Los tipos viejos pasan a grupos con ese nombre (solo los que se usan) y cada contacto queda en el suyo.
insert into grupos_contacto (nombre, orden)
select v.nombre, v.orden
from (values ('cliente', 'Clientes', 1), ('proveedor', 'Proveedores', 2), ('otro', 'Otros', 3)) as v (tipo, nombre, orden)
where exists (select 1 from contactos c where c.tipo = v.tipo)
on conflict do nothing;

update contactos c
set grupo_id = g.id
from grupos_contacto g
where c.grupo_id is null
  and g.nombre = case c.tipo when 'cliente' then 'Clientes' when 'proveedor' then 'Proveedores' else 'Otros' end;

-- La app ya no usa el tipo: queda la columna (con su valor por defecto) para no perder nada.

-- 2. Carpetas de documentos: descripción opcional y las 6 sugeridas de arranque.
alter table carpetas add column if not exists descripcion text;
alter table carpetas add column if not exists orden int not null default 0;

insert into carpetas (nombre, descripcion, orden) values
  ('Personales', 'Cédula, pasaporte, carné', 1),
  ('Seguros', 'Auto, casas, vida', 2),
  ('Escrituras', 'Portofino, Malibú', 3),
  ('Autos', 'Libretas, patentes', 4),
  ('Empresa', 'SIE: contratos, BPS', 5),
  ('Salud', 'Carné, estudios', 6)
on conflict (nombre) do update
  set descripcion = coalesce(carpetas.descripcion, excluded.descripcion),
      orden = excluded.orden;

-- 3. Primera vez: la Bienvenida y la Guía se muestran una sola vez.
alter table config add column if not exists bienvenida_vista boolean not null default false;

-- service_role ya tiene permisos por defecto sobre tablas nuevas (0003); se repite por si 0003 no se aplicó antes.
grant select, insert, update, delete on grupos_contacto to service_role;
