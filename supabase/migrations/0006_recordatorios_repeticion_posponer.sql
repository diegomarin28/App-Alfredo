-- Ronda 4b: repetición y "posponer" elegible en Recordatorios. La aplica Diego a mano; no corre sola.
-- Los recordatorios que ya existen quedan "todos los años" y posponen 15 días por defecto.
alter table recordatorios add column if not exists repeticion text not null default 'anual'
  check (repeticion in ('nunca', 'diaria', 'semanal', 'mensual', 'anual'));
alter table recordatorios add column if not exists anio int;
alter table recordatorios add column if not exists posponer_dias int not null default 15 check (posponer_dias > 0);
