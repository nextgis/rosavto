UPDATE test_rd.boundary_polygon SET uniq_uid = md5("NAME")::uuid;
--select (md5('qqq'))::uuid;