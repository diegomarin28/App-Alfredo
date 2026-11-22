-- La opción "Enable RLS on new tables automatically" crea esta función;
-- no debe poder llamarla nadie desde la API pública.
revoke execute on function public.rls_auto_enable() from anon, authenticated, public;
