import { createHoweTruss, createPrattTruss, createWarrenTruss, createCantileverArm } from "../src/lib/presets.ts";
import { solveTruss } from "../src/lib/feaEngine.ts";

const presets = [
  ["howe", createHoweTruss],
  ["pratt", createPrattTruss],
  ["warren", createWarrenTruss],
  ["cantilever", createCantileverArm],
] as const;

for (const [name, create] of presets) {
  const s = create();
  const r = solveTruss(s.nodes, s.beams);
  console.log(
    name,
    JSON.stringify({
      success: r.success,
      unstable: r.unstable,
      passed: r.passed,
      members: r.members.length,
      maxRatio: Number(r.maxSafetyRatio.toFixed(4)),
      message: r.message ?? null,
    }),
  );
}
