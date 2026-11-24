-- Ronda 4b: tipos y repetición en Calendario. La aplica Diego a mano; no corre sola.

-- Tipos: solo "cumple" u "otra". Los aniversarios pasan a "otra" (todos los años), con el mismo nombre.
update fechas set tipo = 'otra' where tipo = 'aniversario';
alter table fechas drop constraint if exists fechas_tipo_check;
alter table fechas add constraint fechas_tipo_check check (tipo in ('cumple', 'otra'));

-- Repetición ("otra"; el cumpleaños es siempre anual), año de la fecha y hora opcional.
alter table fechas add column if not exists repeticion text not null default 'anual'
  check (repeticion in ('nunca', 'diaria', 'semanal', 'mensual', 'anual'));
alter table fechas add column if not exists anio_evento int;
alter table fechas add column if not exists hora time;
