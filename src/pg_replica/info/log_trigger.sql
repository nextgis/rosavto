CREATE OR REPLACE FUNCTION boundary_polygon_rep() RETURNS trigger AS $boundary_polygon_rep$
    BEGIN
		IF (TG_OP = 'INSERT') THEN
			INSERT INTO public.rep_log (table_name, operation, stamp, fid) VALUES('test_rd.boundary_polygon', 2, current_timestamp, NEW.ogc_fid);
			RETURN NEW;
		ELSIF (TG_OP = 'UPDATE') THEN
			INSERT INTO public.rep_log (table_name, operation, stamp, fid) VALUES('test_rd.boundary_polygon', 3, current_timestamp, OLD.ogc_fid);
			RETURN NEW;
		ELSIF (TG_OP = 'DELETE') THEN
			INSERT INTO public.rep_log (table_name, operation, stamp, fid) VALUES('test_rd.boundary_polygon', 1, current_timestamp, OLD.ogc_fid);
			RETURN NEW;
		END IF;		
    END;
$boundary_polygon_rep$ LANGUAGE plpgsql;

CREATE TRIGGER boundary_polygon_rep AFTER INSERT OR UPDATE OR DELETE ON test_rd.boundary_polygon FOR EACH ROW EXECUTE PROCEDURE boundary_polygon_rep();