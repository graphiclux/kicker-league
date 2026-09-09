-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "suspended" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "AuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoringRule" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "shortMiss" INTEGER NOT NULL DEFAULT 2,
    "longMiss" INTEGER NOT NULL DEFAULT 1,
    "xpMiss" INTEGER NOT NULL DEFAULT 3,
    "xpBlocked" INTEGER NOT NULL DEFAULT 3,
    "longMade" INTEGER NOT NULL DEFAULT -1,
    "shortMax" INTEGER NOT NULL DEFAULT 29,
    "longMadeMin" INTEGER NOT NULL DEFAULT 51,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoringRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "year" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "Season_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "Week" (
    "id" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "lockedAt" TIMESTAMP(3),

    CONSTRAINT "Week_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NflTeam" (
    "code" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "conference" TEXT NOT NULL,
    "division" TEXT NOT NULL,

    CONSTRAINT "NflTeam_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "externalId" TEXT,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerAssignment" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "teamCode" TEXT NOT NULL,
    "designation" TEXT NOT NULL DEFAULT 'PRIMARY_KICKER',
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),

    CONSTRAINT "PlayerAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "League" (
    "id" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "commissionerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "maxTeams" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'LOBBY',
    "scheduledAt" TIMESTAMP(3),
    "pickSeconds" INTEGER NOT NULL DEFAULT 60,
    "currentPick" INTEGER NOT NULL DEFAULT 1,
    "deadline" TIMESTAMP(3),
    "pauseRemainingMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FantasyTeam" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "draftOrder" INTEGER,
    "rankings" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "FantasyTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Roster" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "fantasyTeamId" TEXT NOT NULL,
    "teamCode" TEXT NOT NULL,
    "displayedKicker" TEXT,
    "pickNumber" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "draftedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Roster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KickingEvent" (
    "id" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "teamCode" TEXT NOT NULL,
    "kicker" TEXT NOT NULL,
    "gameId" TEXT,
    "eventType" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "distance" INTEGER,
    "points" INTEGER NOT NULL,
    "ruleCode" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "importId" TEXT,
    "raw" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KickingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamWeekScore" (
    "id" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "teamCode" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "eventCount" INTEGER NOT NULL,
    "recalculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamWeekScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatImport" (
    "id" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'csv',
    "contentHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PREVIEW',
    "rows" JSONB NOT NULL,
    "preview" JSONB NOT NULL,
    "error" TEXT,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "StatImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "leagueId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushDevice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outbox" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthToken_hash_key" ON "AuthToken"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "ScoringRule_code_key" ON "ScoringRule"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Week_season_week_key" ON "Week"("season", "week");

-- CreateIndex
CREATE UNIQUE INDEX "Player_externalId_key" ON "Player"("externalId");

-- CreateIndex
CREATE INDEX "PlayerAssignment_teamCode_endsAt_idx" ON "PlayerAssignment"("teamCode", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "League_inviteCode_key" ON "League"("inviteCode");

-- CreateIndex
CREATE UNIQUE INDEX "FantasyTeam_leagueId_ownerId_key" ON "FantasyTeam"("leagueId", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "FantasyTeam_leagueId_draftOrder_key" ON "FantasyTeam"("leagueId", "draftOrder");

-- CreateIndex
CREATE UNIQUE INDEX "FantasyTeam_id_leagueId_key" ON "FantasyTeam"("id", "leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "Roster_fantasyTeamId_key" ON "Roster"("fantasyTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "Roster_fantasyTeamId_leagueId_key" ON "Roster"("fantasyTeamId", "leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "Roster_leagueId_teamCode_key" ON "Roster"("leagueId", "teamCode");

-- CreateIndex
CREATE UNIQUE INDEX "Roster_leagueId_pickNumber_key" ON "Roster"("leagueId", "pickNumber");

-- CreateIndex
CREATE INDEX "KickingEvent_season_week_teamCode_idx" ON "KickingEvent"("season", "week", "teamCode");

-- CreateIndex
CREATE UNIQUE INDEX "KickingEvent_provider_providerEventId_key" ON "KickingEvent"("provider", "providerEventId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamWeekScore_season_week_teamCode_key" ON "TeamWeekScore"("season", "week", "teamCode");

-- CreateIndex
CREATE INDEX "AuditLog_entityId_createdAt_idx" ON "AuditLog"("entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_leagueId_createdAt_idx" ON "AuditLog"("leagueId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PushDevice_token_key" ON "PushDevice"("token");

-- CreateIndex
CREATE INDEX "Outbox_deliveredAt_createdAt_idx" ON "Outbox"("deliveredAt", "createdAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthToken" ADD CONSTRAINT "AuthToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Season" ADD CONSTRAINT "Season_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "ScoringRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Week" ADD CONSTRAINT "Week_season_fkey" FOREIGN KEY ("season") REFERENCES "Season"("year") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerAssignment" ADD CONSTRAINT "PlayerAssignment_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerAssignment" ADD CONSTRAINT "PlayerAssignment_teamCode_fkey" FOREIGN KEY ("teamCode") REFERENCES "NflTeam"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "League" ADD CONSTRAINT "League_season_fkey" FOREIGN KEY ("season") REFERENCES "Season"("year") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FantasyTeam" ADD CONSTRAINT "FantasyTeam_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FantasyTeam" ADD CONSTRAINT "FantasyTeam_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Roster" ADD CONSTRAINT "Roster_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Roster" ADD CONSTRAINT "Roster_fantasyTeamId_leagueId_fkey" FOREIGN KEY ("fantasyTeamId", "leagueId") REFERENCES "FantasyTeam"("id", "leagueId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Roster" ADD CONSTRAINT "Roster_teamCode_fkey" FOREIGN KEY ("teamCode") REFERENCES "NflTeam"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KickingEvent" ADD CONSTRAINT "KickingEvent_season_fkey" FOREIGN KEY ("season") REFERENCES "Season"("year") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KickingEvent" ADD CONSTRAINT "KickingEvent_teamCode_fkey" FOREIGN KEY ("teamCode") REFERENCES "NflTeam"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KickingEvent" ADD CONSTRAINT "KickingEvent_importId_fkey" FOREIGN KEY ("importId") REFERENCES "StatImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamWeekScore" ADD CONSTRAINT "TeamWeekScore_season_fkey" FOREIGN KEY ("season") REFERENCES "Season"("year") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamWeekScore" ADD CONSTRAINT "TeamWeekScore_teamCode_fkey" FOREIGN KEY ("teamCode") REFERENCES "NflTeam"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushDevice" ADD CONSTRAINT "PushDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Product invariants independent of API authorization.
ALTER TABLE "League" ADD CONSTRAINT "league_capacity" CHECK ("maxTeams" BETWEEN 2 AND 32);
ALTER TABLE "League" ADD CONSTRAINT "league_clock" CHECK ("pickSeconds" BETWEEN 10 AND 300);
ALTER TABLE "League" ADD CONSTRAINT "league_status" CHECK (status IN ('LOBBY','DRAFTING','PAUSED','COMPLETE'));
ALTER TABLE "League" ADD CONSTRAINT "league_commissioner_fk" FOREIGN KEY ("commissionerId") REFERENCES "User"(id);
ALTER TABLE "User" ADD CONSTRAINT "user_role" CHECK (role IN ('USER','SUPER_ADMIN'));
ALTER TABLE "Week" ADD CONSTRAINT "week_range" CHECK (week BETWEEN 1 AND 22);
ALTER TABLE "KickingEvent" ADD CONSTRAINT "event_week" CHECK (week BETWEEN 1 AND 22);
ALTER TABLE "KickingEvent" ADD CONSTRAINT "event_result" CHECK (result IN ('MADE','MISSED','BLOCKED','FAILED','UNKNOWN'));
ALTER TABLE "KickingEvent" ADD CONSTRAINT "event_type_distance" CHECK (("eventType"='FIELD_GOAL' AND distance IS NOT NULL AND distance BETWEEN 1 AND 100) OR ("eventType"='EXTRA_POINT' AND distance IS NULL));
CREATE FUNCTION reject_immutable_change() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION '% is append-only', TG_TABLE_NAME; END $$;
CREATE TRIGGER audit_immutable BEFORE UPDATE OR DELETE ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION reject_immutable_change();
CREATE TRIGGER scoring_rules_immutable BEFORE UPDATE OR DELETE ON "ScoringRule" FOR EACH ROW EXECUTE FUNCTION reject_immutable_change();
CREATE TRIGGER roster_immutable BEFORE UPDATE OR DELETE ON "Roster" FOR EACH ROW EXECUTE FUNCTION reject_immutable_change();
CREATE FUNCTION validate_roster_insert() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE s text; current_pick integer; slot integer;
BEGIN
 SELECT status, "currentPick" INTO s,current_pick FROM "League" WHERE id=NEW."leagueId" FOR UPDATE;
 SELECT "draftOrder" INTO slot FROM "FantasyTeam" WHERE id=NEW."fantasyTeamId";
 IF s <> 'DRAFTING' OR NEW."pickNumber" <> current_pick OR slot <> current_pick THEN RAISE EXCEPTION 'Roster may only be assigned to the current draft slot'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER roster_draft_only BEFORE INSERT ON "Roster" FOR EACH ROW EXECUTE FUNCTION validate_roster_insert();
CREATE FUNCTION validate_membership_change() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE l "League"; count_teams integer;
BEGIN
 SELECT * INTO l FROM "League" WHERE id=COALESCE(NEW."leagueId",OLD."leagueId") FOR UPDATE;
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
CREATE TRIGGER membership_guard BEFORE INSERT OR UPDATE OR DELETE ON "FantasyTeam" FOR EACH ROW EXECUTE FUNCTION validate_membership_change();
CREATE FUNCTION season_rule_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."ruleId"<>OLD."ruleId" THEN RAISE EXCEPTION 'A season retains its original scoring rule'; END IF; RETURN NEW; END $$;
CREATE TRIGGER season_rule_guard BEFORE UPDATE ON "Season" FOR EACH ROW EXECUTE FUNCTION season_rule_immutable();
