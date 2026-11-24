-- Los proyectos nuevos de Supabase ya no le dan a service_role permisos de datos sobre public.
-- Sin esto el servidor recibe "permission denied for table ...". anon y authenticated siguen sin nada.
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to service_role;
