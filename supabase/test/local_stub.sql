-- 로컬 시험용: Supabase 의 역할·auth 스키마를 흉내 냄 (실제 Supabase 에서는 실행하지 않음)
-- Supabase 처럼 public 표에 anon/authenticated 기본 권한을 넓게 주는 최악의 경우를 만들어 두고,
-- 마이그레이션이 필요한 권한만 남기는지 시험한다.
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
create role authenticator login noinherit password 'local-only';
grant anon, authenticated, service_role to authenticator;

create schema auth;
create table auth.users (id uuid primary key, email text unique);
-- Supabase 의 auth.uid() 와 같은 방식: PostgREST 가 넣어 주는 JWT claims 의 sub
create function auth.uid() returns uuid language sql stable as $$
  select nullif(coalesce(current_setting('request.jwt.claim.sub', true),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')), '')::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
