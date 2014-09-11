CREATE OR REPLACE FUNCTION ng_getlrposbyrid(name, integer, double precision) RETURNS geometry AS 
$$
DECLARE output geometry;
BEGIN
 EXECUTE 'SELECT ST_Line_Interpolate_Point (foo.wkb_geometry, ((' || $3 ||' - foo.beg) * foo.scale) / ST_Length(foo.wkb_geometry) ) 
 FROM (SELECT * FROM ' || $1 || ' WHERE "beg" <= ' ||  $3 || ' AND "end" > ' || $3 || ' AND "rid" = ' || $2 ||') as foo' INTO output;
 RETURN output;
END;
$$
LANGUAGE plpgsql STABLE;