-- Ronda 4: encuadre de cada foto en el marco 16:9 de Inicio (object-position). La aplica Diego a mano.
-- 0..1 desde la izquierda y desde arriba; 0.5/0.5 = centrada (las que ya están).
alter table fotos add column if not exists foco_x real not null default 0.5 check (foco_x between 0 and 1);
alter table fotos add column if not exists foco_y real not null default 0.5 check (foco_y between 0 and 1);
