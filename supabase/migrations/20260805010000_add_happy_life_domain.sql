alter table templates drop constraint if exists templates_domain_check;
alter table templates add constraint templates_domain_check
  check (domain in ('work','gourmet','body','finance','life'));

alter table contacts drop constraint if exists contacts_domain_check;
alter table contacts add constraint contacts_domain_check
  check (domain in ('work','gourmet','body','finance','life'));

alter table tasks drop constraint if exists tasks_domain_check;
alter table tasks add constraint tasks_domain_check
  check (domain in ('work','gourmet','body','finance','life'));
