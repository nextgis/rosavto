CREATE OR REPLACE FUNCTION ng_getlrdistbyuuid(name, text, double precision, double precision) RETURNS TABLE(distance double precision, uniq_uid TEXT) AS 
$$
DECLARE ret RECORD;
DECLARE pt geometry := ST_SetSRID(ST_MakePoint($3, $4),4326);
DECLARE part geometry;
DECLARE dist double precision;
BEGIN
--get closer part and scale
  EXECUTE 'SELECT wkb_geometry,beg,scale FROM ' || $1 || ' WHERE "uniq_uid" = ''' || $2 || ''' ORDER BY ST_Distance(wkb_geometry, ST_SetSRID(ST_MakePoint(' || $3 || ',' || $4 || '),4326)) LIMIT 1;' INTO ret;

--get distance
  SELECT ret.beg + ST_Length(ret.wkb_geometry) * ST_Line_Locate_Point(ret.wkb_geometry, pt) / ret.scale INTO dist;  
--fill results  
  distance := dist;
  uniq_uid := $2;
  RETURN NEXT;
END;
$$
LANGUAGE plpgsql STABLE ;