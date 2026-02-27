alter table items add column if not exists project_id uuid references projects(id) on delete set null;
alter table items add column if not exists context jsonb;
alter table items add column if not exists source text not null default 'web';

create index idx_items_project_id on items(project_id);
create index idx_items_source on items(source);
