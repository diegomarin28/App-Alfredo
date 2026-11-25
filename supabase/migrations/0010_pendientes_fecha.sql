-- Ronda 7: una tarea puede tener fecha, aparte del texto ("Llamar al contador", lunes 30/11).
-- La aplica Diego a mano; no corre sola. Mientras no esté aplicada, la app guarda la tarea sin esta columna y
-- deja la fecha escrita al final del texto ("Llamar al contador (lunes 30/11)"): ver TablaSupabase (sinColumna).
alter table pendientes add column if not exists fecha date;
