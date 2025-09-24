export type KickPlayInput = {
  playType: "field_goal" | "extra_point";
  result: "made" | "missed";
  distance?: number | null;
  blocked?: boolean | null;
};

export function scoreKick(play: KickPlayInput) {
  let pts = 0;

  if (play.playType === "field_goal") {
    if (play.result === "missed") {
      const d = play.distance ?? null;
      pts += d !== null && d <= 29 ? 2 : 1;   // +2 if <=29, else +1
    }
    if (play.result === "made" && (play.distance ?? 0) >= 50) {
      pts -= 1;                               // -1 for made FG >= 50
    }
  }

  if (play.playType === "extra_point") {
    if (play.result === "missed" || play.blocked) {
      pts += 3;                               // +3 for XP miss or block
    }
  }

  return pts;
}
