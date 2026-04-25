insert into users (id, email, display_name)
values ('00000000-0000-0000-0000-000000000001', 'owner@personal-os.local', 'Owner')
on conflict (id) do nothing;
