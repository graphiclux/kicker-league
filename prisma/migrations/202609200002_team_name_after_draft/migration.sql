-- Team names are user-editable presentation metadata after a draft. Keep
-- league membership, ownership, draft order, and rankings protected.
CREATE OR REPLACE FUNCTION validate_membership_change() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE l "League"; count_teams integer;
BEGIN
 SELECT * INTO l FROM "League" WHERE id=COALESCE(NEW."leagueId",OLD."leagueId") FOR UPDATE;
 IF TG_OP='UPDATE' AND NEW."leagueId"=OLD."leagueId" AND NEW."ownerId"=OLD."ownerId" AND NEW."draftOrder" IS NOT DISTINCT FROM OLD."draftOrder" AND NEW."rankings"=OLD."rankings" THEN
   RETURN NEW;
 END IF;
 IF l.status <> 'LOBBY' THEN RAISE EXCEPTION 'Membership is locked after draft starts'; END IF;
 IF TG_OP='INSERT' THEN
   SELECT count(*) INTO count_teams FROM "FantasyTeam" WHERE "leagueId"=NEW."leagueId";
   IF count_teams >= l."maxTeams" THEN RAISE EXCEPTION 'League is full'; END IF;
   RETURN NEW;
 END IF;
 IF TG_OP='UPDATE' AND (NEW."leagueId"<>OLD."leagueId" OR NEW."ownerId"<>OLD."ownerId") THEN RAISE EXCEPTION 'Fantasy team ownership is immutable'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
