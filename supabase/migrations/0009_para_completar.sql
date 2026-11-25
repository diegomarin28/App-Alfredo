-- Ronda 5, punto 9: "Para completar" en Inicio. La aplica Diego a mano (junto con la 0008); no corre sola.

-- Un cumpleaños puede guardarse sin fecha y un servicio sin número (Contame), hasta completarlos.
-- El check de formato de fechas.dia ('^\d{2}-\d{2}$', de la 0001) sigue igual: en Postgres un check con null
-- no falla, así que solo controla el formato cuando hay fecha. servicios_casa.valor no tenía check de formato.
alter table fechas alter column dia drop not null;
alter table servicios_casa alter column valor drop not null;

-- "Omitir": sale de la lista para siempre, sin borrar el ítem.
alter table fechas add column if not exists completar_omitido boolean not null default false;
alter table servicios_casa add column if not exists completar_omitido boolean not null default false;
alter table contactos add column if not exists completar_omitido boolean not null default false;
