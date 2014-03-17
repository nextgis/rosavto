SELECT '{' || md5( date_part('year', NOW())::text
 || date_part('month', NOW())::text
 || date_part('day', NOW())::text
 || date_part('hour', NOW())::text
 || date_part('minute', NOW())::text
 || date_part('second', NOW())::text
)::uuid || '}';