-- Ronda 5: "Todas las semanas" en algunos días (L M M J V S D), en Calendario ("Otra") y en Recordatorios.
-- La aplica Diego a mano; no corre sola.
-- 1 = lunes … 7 = domingo. null = sin días marcados (las semanales viejas siguen el día de la semana de su fecha).
alter table fechas add column if not exists dias_semana smallint[]
  constraint fechas_dias_semana_check check (
    dias_semana is null
    or (cardinality(dias_semana) between 1 and 7 and dias_semana <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[])
  );

alter table recordatorios add column if not exists dias_semana smallint[]
  constraint recordatorios_dias_semana_check check (
    dias_semana is null
    or (cardinality(dias_semana) between 1 and 7 and dias_semana <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[])
  );
