alter table settings
  alter column outreach_sender_email set default 'hello@juweek.studio';

update settings
set outreach_sender_email = 'hello@juweek.studio'
where id = 1;
