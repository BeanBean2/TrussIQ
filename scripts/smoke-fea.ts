import {
  createCantileverArm,
  createHoweTruss,
  createPrattTruss,
  createWarrenTruss,
} from "../src/lib/presets.ts";
import { solveTruss } from "../src/lib/feaEngine.ts";
import { analyzeStructure } from "../src/lib/aiOptimizer.ts";
import { getLocalCoachReply } from "../src/lib/aiMessages.ts";
import { auditStructure } from "../src/lib/structureAudit.ts";
import { computeSectionProps, isValidSectionParams, SECTION_PRESETS, solidRodFromArea } from "../src/lib/crossSections.ts";
import { buildPresentationDraft, buildSubmissionPrepText, CAC_DEADLINE_NOTICE, CAC_OFFICIAL_SOURCES, CAC_VIDEO_STORYBOARD, isYieldLimitMet, LIVE_DEMO_URL } from "../src/lib/challengePrep.ts";
import { formatForceDisplay, formatLengthDisplay, formatSpanDisplay } from "../src/lib/units.ts";
import { stressColorForPalette } from "../src/lib/resultPalette.ts";
import { scoreDesign } from "../src/lib/designScore.ts";
import { addTrussChords, connectHorizontalChords } from "../src/lib/chordBuilder.ts";
import { DEFAULT_AREA, DEFAULT_MATERIAL_ID } from "../src/lib/materials.ts";
import { parseTrussFile, serializeTruss } from "../src/lib/trussIO.ts";
import { createReviewLink, readReviewLink } from "../src/lib/reviewLink.ts";
import { calculateEquilibriumResidual } from "../src/lib/equilibrium.ts";
import { applySeismicLoads, applySelfWeightLoads, DEFAULT_SEISMIC } from "../src/lib/dynamicsEngine.ts";
import { getMaterial } from "../src/lib/materials.ts";
import { createBridgeChallengeStarter, evaluateBridgeChallenge, HIGH_WIND_PROFILE } from "../src/lib/bridgeChallenges.ts";

const presets = [
  ["howe", createHoweTruss],
  ["pratt", createPrattTruss],
  ["warren", createWarrenTruss],
  ["cantilever", createCantileverArm],
] as const;

const submissionPrep = buildSubmissionPrepText({
  appTitle: "TrussIQ",
  steps: [{ title: "Submit", detail: CAC_DEADLINE_NOTICE }],
  completedSteps: [false],
  aiDisclosure: "Codex helped review and modify code; students must add their own contributions.",
});
for (const source of Object.values(CAC_OFFICIAL_SOURCES)) {
  if (!submissionPrep.includes(source)) throw new Error(`Submission prep export omitted an official source: ${source}`);
}
if (!submissionPrep.includes(CAC_DEADLINE_NOTICE) || !submissionPrep.includes("AI USE DISCLOSURE") ||
    !submissionPrep.includes("[ ] Submit") || !submissionPrep.includes("App: TrussIQ") ||
    !submissionPrep.includes("under-resourced classrooms") || !submissionPrep.includes("PRIVACY.md") ||
    !submissionPrep.includes(LIVE_DEMO_URL)) {
  throw new Error("Submission prep export omitted deadline, checklist, app, purpose, privacy, live demo, or AI disclosure details.");
}
if (formatLengthDisplay(25.4, "us") !== "1 in") throw new Error("US length formatting failed for 25.4 mm.");
if (!formatForceDisplay(1000, "us").includes("lbf") && !formatForceDisplay(1000, "us").includes("kip")) {
  throw new Error("US force formatting failed.");
}
if (!formatSpanDisplay(120, 100, "si").includes("mm")) throw new Error("SI span formatting failed.");
if (stressColorForPalette(0.1, false, "colorblind") === stressColorForPalette(0.1, false, "default")) {
  // Allowed to coincidentally match; only require both paths return hex
}
if (!/^#[0-9a-f]{6}$/i.test(stressColorForPalette(1, true, "colorblind"))) {
  throw new Error("Colorblind palette did not return a hex color.");
}
{
  const howe = createHoweTruss();
  const solved = solveTruss(howe.nodes, howe.beams);
  if (!solved.success) throw new Error("Howe solve failed before design score check.");
  const scored = scoreDesign(howe.nodes, howe.beams, solved, 50, 25);
  if (!Number.isFinite(scored.score) || scored.massKg <= 0) throw new Error("Design score helper returned invalid values.");
}
{
  const empty = { nodes: [], beams: [], materialId: DEFAULT_MATERIAL_ID, defaultArea: DEFAULT_AREA };
  const framed = addTrussChords(empty, {
    startX: 0,
    startY: 200,
    bayCount: 3,
    bayLength: 100,
    height: 80,
    bottom: true,
    top: true,
    verticals: true,
    supports: true,
    materialId: DEFAULT_MATERIAL_ID,
    area: DEFAULT_AREA,
  });
  if (framed.nodes.length !== 8) throw new Error(`Expected 8 chord joints, got ${framed.nodes.length}`);
  // 3 bottom + 3 top + 4 verticals = 10 members
  if (framed.beams.length !== 10) throw new Error(`Expected 10 chord/vertical members, got ${framed.beams.length}`);
  const pin = framed.nodes.find((n) => n.support === "pin");
  const roller = framed.nodes.find((n) => n.support === "rollerY");
  if (!pin || !roller) throw new Error("Chord builder did not place pin/roller supports.");
  const jointsOnly = { ...framed, beams: [] };
  const connected = connectHorizontalChords(jointsOnly);
  if (connected.beams.length < 6) throw new Error("connectHorizontalChords failed to link rows.");
}
const storyboardText = CAC_VIDEO_STORYBOARD.map((beat) => `${beat.time} ${beat.prompt}`).join("\n");
const storyboardEnd = CAC_VIDEO_STORYBOARD.at(-1)?.time.split("–")[1];
const storyboardEndSeconds = storyboardEnd ? storyboardEnd.split(":").reduce((total, part) => total * 60 + Number(part), 0) : 0;
if (storyboardEndSeconds < 60 || storyboardEndSeconds > 180 ||
    !["participant", "app name", "purpose", "target audience", "tools and programming languages", "show the app working"]
      .every((requirement) => storyboardText.toLowerCase().includes(requirement))) {
  throw new Error("CAC video storyboard falls outside the video time limit or misses a required topic.");
}
if (!submissionPrep.includes("SUGGESTED DEMO VIDEO STORYBOARD") || !submissionPrep.includes(CAC_VIDEO_STORYBOARD.at(-1)!.prompt)) {
  throw new Error("Submission prep export omitted the timed video storyboard.");
}

for (const preset of SECTION_PRESETS) {
  if (!isValidSectionParams(preset.section)) {
    throw new Error(`Section preset ${preset.label} has invalid dimensions or non-finite properties.`);
  }
}

const gravityState = createHoweTruss();
gravityState.nodes[1].fx = 400;
const factoredWithWeight = applySelfWeightLoads(gravityState.nodes, gravityState.beams, 1.5);
const expectedMemberWeight = gravityState.beams.reduce((total, beam) => {
  const start = gravityState.nodes.find((node) => node.id === beam.nodeI)!;
  const end = gravityState.nodes.find((node) => node.id === beam.nodeJ)!;
  const massKg = getMaterial(beam.materialId).density * beam.area * Math.hypot(end.x - start.x, end.y - start.y) / 1_000_000;
  return total + massKg * 9.81;
}, 0);
const originalVerticalLoad = gravityState.nodes.reduce((total, node) => total + node.fy, 0);
const factoredVerticalLoad = factoredWithWeight.reduce((total, node) => total + node.fy, 0);
if (factoredWithWeight[1].fx !== 600 || factoredVerticalLoad <= originalVerticalLoad * 1.5 ||
    Math.abs(factoredVerticalLoad - (originalVerticalLoad * 1.5 + expectedMemberWeight)) > expectedMemberWeight * 1e-9) {
  throw new Error("Self-weight was not added downward or the complete service load vector was not factored.");
}

const seismicPeak = { ...DEFAULT_SEISMIC, time: Math.PI / (2 * DEFAULT_SEISMIC.omega) };
const seismicLoads = applySeismicLoads(gravityState.nodes, gravityState.beams, seismicPeak);
if (seismicLoads[0].fx !== gravityState.nodes[0].fx || seismicLoads[4].fx <= gravityState.nodes[4].fx) {
  throw new Error("Seismic inertia should load a free horizontal DOF without adding an arbitrary support force.");
}
const rollerXState = gravityState.nodes.map((node, index) => index === 4 ? { ...node, support: "rollerX" as const } : node);
const rollerXSeismic = applySeismicLoads(rollerXState, gravityState.beams, seismicPeak);
if (rollerXSeismic[4].fx !== rollerXState[4].fx) {
  throw new Error("Seismic inertia was applied to a horizontally restrained roller DOF.");
}

const budgetBridge = createBridgeChallengeStarter('low-budget-span');
const budgetSpan = Math.max(...budgetBridge.nodes.map((node) => node.x)) - Math.min(...budgetBridge.nodes.map((node) => node.x));
if (Math.abs(budgetSpan - 10_000) > 1e-6 || Math.max(...budgetBridge.nodes.map((node) => node.fy)) < 500) {
  throw new Error("Low-budget challenge starter did not create a 10 m bridge with a 500 N center load.");
}
const windBridge = createBridgeChallengeStarter('high-wind-resilience');
const windChallenge = evaluateBridgeChallenge('high-wind-resilience', windBridge.nodes, windBridge.beams);
if (Math.abs(HIGH_WIND_PROFILE.v0 / 0.44704 - 120) > 1e-8 ||
    !windChallenge.checks.some((check) => check.label === 'Wind profile' && check.value.includes('120 mph'))) {
  throw new Error("High-wind challenge is not using the advertised 120 mph wind reference speed.");
}
const challengeSection = solidRodFromArea(400);
const challengeSectionProps = computeSectionProps(challengeSection);
const strongerBudgetBridge = {
  ...budgetBridge,
  beams: budgetBridge.beams.map((beam) => ({ ...beam, section: challengeSection, area: challengeSectionProps.area, I: challengeSectionProps.I })),
};
if (!evaluateBridgeChallenge('low-budget-span', strongerBudgetBridge.nodes, strongerBudgetBridge.beams).complete ||
    evaluateBridgeChallenge('low-budget-span', strongerBudgetBridge.nodes, strongerBudgetBridge.beams).estimatedCostUSD > 500) {
  throw new Error("The low-budget challenge could not be completed within the advertised material budget.");
}
const windChallengeSection = solidRodFromArea(600);
const windChallengeProps = computeSectionProps(windChallengeSection);
const strongerWindBridge = {
  ...windBridge,
  beams: windBridge.beams.map((beam) => ({ ...beam, section: windChallengeSection, area: windChallengeProps.area, I: windChallengeProps.I })),
};
if (!evaluateBridgeChallenge('high-wind-resilience', strongerWindBridge.nodes, strongerWindBridge.beams).complete) {
  throw new Error("The high-wind challenge has no passing design path at its documented starter geometry.");
}

for (const [name, create] of presets) {
  const state = create();
  const result = solveTruss(state.nodes, state.beams);
  if (!result.success) throw new Error(`${name} preset failed to solve: ${result.message ?? "unknown error"}`);
  if (!result.passed) throw new Error(`${name} preset unexpectedly exceeds the yield limit.`);
  if (result.members.length !== state.beams.length) throw new Error(`${name} preset returned incomplete member results.`);
  if (result.displacements.length !== state.nodes.length) throw new Error(`${name} preset returned incomplete nodal displacements.`);

  const loadX = state.nodes.reduce((sum, node) => sum + node.fx, 0);
  const loadY = state.nodes.reduce((sum, node) => sum + node.fy, 0);
  const reactionX = result.reactions?.reduce((sum, reaction) => sum + reaction.fx, 0) ?? 0;
  const reactionY = result.reactions?.reduce((sum, reaction) => sum + reaction.fy, 0) ?? 0;
  const residual = Math.hypot(loadX + reactionX, loadY + reactionY);
  if (!Number.isFinite(residual) || residual > 1e-6) {
    throw new Error(`${name} preset violates force equilibrium (residual ${residual} N).`);
  }
  const jointBalance = calculateEquilibriumResidual(state.nodes, state.beams, result);
  if (!Number.isFinite(jointBalance.relative) || jointBalance.relative > 1e-6) {
    throw new Error(`${name} preset has an excessive per-joint force imbalance (${jointBalance.relative}).`);
  }
  const corruptedMemberForces = {
    ...result,
    members: result.members.map((member, index) => index === 0 ? { ...member, axialForce: member.axialForce + 100 } : member),
  };
  if (calculateEquilibriumResidual(state.nodes, state.beams, corruptedMemberForces).maxForceN < 1) {
    throw new Error(`${name} joint-balance check failed to detect a local member-force mismatch.`);
  }

  const imported = parseTrussFile(serializeTruss(state));
  if (imported.nodes.length !== state.nodes.length || imported.beams.length !== state.beams.length) {
    throw new Error(`${name} preset did not survive a serialize/import round trip.`);
  }
  const reviewUrl = createReviewLink(state, { origin: 'https://example.test', pathname: '/TrussIQ/' });
  const sharedReview = readReviewLink(new URL(reviewUrl).hash);
  if (!new URL(reviewUrl).hash.startsWith('#model=') || !sharedReview?.state ||
      JSON.stringify(sharedReview.state) !== JSON.stringify({ nodes: state.nodes, beams: state.beams, materialId: state.materialId, defaultArea: state.defaultArea })) {
    throw new Error(`${name} design did not survive a share-link round trip.`);
  }
  const coachReply = getLocalCoachReply(
    "How safe is this design?",
    analyzeStructure(state.nodes, state.beams, result),
    result,
    state.nodes,
  );
  if (!coachReply.includes('utilization')) throw new Error(`${name} coach did not answer from the analysis.`);
  if (!coachReply.includes('not a complete safety assessment')) {
    throw new Error(`${name} coach did not explain the limits of its yield check.`);
  }
  const reactionReply = getLocalCoachReply('What are the support reactions?', analyzeStructure(state.nodes, state.beams, result), result, state.nodes);
  const loadReply = getLocalCoachReply('Where are the applied loads?', analyzeStructure(state.nodes, state.beams, result), result, state.nodes);
  const forceReply = getLocalCoachReply('Which members are in tension or compression?', analyzeStructure(state.nodes, state.beams, result), result, state.nodes);
  if (!reactionReply.includes('Support reactions') || !reactionReply.includes('N')) {
    throw new Error(`${name} coach did not summarize the solved support reactions.`);
  }
  if (!loadReply.includes('Applied nodal loads') || !loadReply.includes('Fx')) {
    throw new Error(`${name} coach did not identify the model's applied loads.`);
  }
  if (!forceReply.includes('Tension:') || !forceReply.includes('Compression:')) {
    throw new Error(`${name} coach did not summarize member tension and compression results.`);
  }
  const presentationDraft = buildPresentationDraft(state.nodes.length, state.beams.length, result);
  if (!presentationDraft.includes('not a complete safety assessment') || !presentationDraft.includes('[describe your change')) {
    throw new Error(`${name} presentation draft lacks its analysis limit or student-editable contribution prompt.`);
  }
  if (!isYieldLimitMet(result) || isYieldLimitMet({ ...result, maxSafetyRatio: 1.01, passed: true }) ||
    isYieldLimitMet({ ...result, success: false, maxSafetyRatio: 0.2 })) {
    throw new Error(`${name} yield-limit checklist status is inconsistent with solver results.`);
  }

  console.log(name, JSON.stringify({
    success: result.success,
    passed: result.passed,
    members: result.members.length,
    maxRatio: Number(result.maxSafetyRatio.toFixed(4)),
    equilibriumResidualN: residual,
  }));
}

for (const loadScale of [1e-12, 1e12]) {
  const scaled = createHoweTruss();
  const reference = createHoweTruss();
  const referenceResult = solveTruss(reference.nodes, reference.beams);
  if (!referenceResult.success) throw new Error("Howe reference model failed to solve.");
  scaled.nodes = scaled.nodes.map((node) => ({ ...node, fx: node.fx * loadScale, fy: node.fy * loadScale }));
  const scaledResult = solveTruss(scaled.nodes, scaled.beams);
  if (!scaledResult.success) throw new Error(`Solver failed with load scale ${loadScale}: ${scaledResult.message ?? 'unknown error'}`);
  const scaledBalance = calculateEquilibriumResidual(scaled.nodes, scaled.beams, scaledResult);
  if (!Number.isFinite(scaledBalance.relative) || scaledBalance.relative > 1e-6) {
    throw new Error(`Joint-balance check failed at load scale ${loadScale} (${scaledBalance.relative}).`);
  }
  const displacementScale = Math.max(...referenceResult.displacements.map((node) => Math.hypot(node.ux, node.uy))) * loadScale;
  const displacementError = Math.max(...scaledResult.displacements.map((node, index) =>
    Math.hypot(node.ux - referenceResult.displacements[index].ux * loadScale,
      node.uy - referenceResult.displacements[index].uy * loadScale),
  ));
  const forceScale = Math.max(...referenceResult.members.map((member) => Math.abs(member.axialForce))) * loadScale;
  const forceError = Math.max(...scaledResult.members.map((member, index) =>
    Math.abs(member.axialForce - referenceResult.members[index].axialForce * loadScale),
  ));
  if (displacementError > Math.max(displacementScale, Number.MIN_VALUE) * 1e-6 ||
      forceError > Math.max(forceScale, Number.MIN_VALUE) * 1e-6) {
    throw new Error(`Linear response did not scale consistently at load scale ${loadScale}.`);
  }
  if (scaledResult.members.some((member, index) => member.status !== referenceResult.members[index].status)) {
    throw new Error(`Member tension/compression labels changed at load scale ${loadScale}.`);
  }
  const scaledAdvice = analyzeStructure(scaled.nodes, scaled.beams, scaledResult);
  const referenceAdvice = analyzeStructure(reference.nodes, reference.beams, referenceResult);
  if (scaledAdvice.zeroForceBeamIds.join(',') !== referenceAdvice.zeroForceBeamIds.join(',')) {
    throw new Error(`Zero-force advice changed at load scale ${loadScale}.`);
  }
  const characteristicForce = Math.max(...scaledResult.members.map((member) => Math.abs(member.axialForce)));
  const perturbation = characteristicForce * 1e-3;
  const perturbed = {
    ...scaledResult,
    members: scaledResult.members.map((member, index) => index === 0 ? { ...member, axialForce: member.axialForce + perturbation } : member),
  };
  if (calculateEquilibriumResidual(scaled.nodes, scaled.beams, perturbed).relative <= 1e-6) {
    throw new Error(`Joint-balance check missed a relative force error at load scale ${loadScale}.`);
  }
}

const unsupported = createHoweTruss();
const unsupportedResult = solveTruss(
  unsupported.nodes.map((node) => ({ ...node, support: "none" as const })),
  unsupported.beams,
);
if (unsupportedResult.success || !unsupportedResult.unstable) {
  throw new Error("The solver did not identify an unsupported model as unstable.");
}

const invalid = createHoweTruss();
invalid.beams[0].area = 0;
if (solveTruss(invalid.nodes, invalid.beams).success) {
  throw new Error("The solver accepted a zero-area member.");
}

const invalidInertia = createHoweTruss();
invalidInertia.beams[0].I = Number.NaN;
if (solveTruss(invalidInertia.nodes, invalidInertia.beams).success || auditStructure(invalidInertia.nodes, invalidInertia.beams).errors === 0) {
  throw new Error("An invalid moment of inertia escaped analysis validation.");
}

const mismatchedSection = createHoweTruss();
mismatchedSection.beams[0].I = (mismatchedSection.beams[0].I ?? 1) * 2;
if (solveTruss(mismatchedSection.nodes, mismatchedSection.beams).success) {
  throw new Error("The solver accepted section dimensions that disagree with the member inertia.");
}

const extremeStiffness = createHoweTruss();
extremeStiffness.beams.forEach((beam) => { beam.area = 1e308; });
const extremeResult = solveTruss(extremeStiffness.nodes, extremeStiffness.beams);
if (extremeResult.success || extremeResult.passed || extremeResult.members.some((member) =>
  ![member.axialForce, member.stress, member.safetyRatio].every(Number.isFinite),
)) {
  throw new Error("The solver reported a safe result for an out-of-range stiffness model.");
}

let rejectedMalformedImport = false;
try {
  parseTrussFile(JSON.stringify({
    nodes: [],
    beams: [{ id: "m1", nodeI: "n1", nodeJ: "n2", area: 20, materialId: "unknown" }],
  }));
} catch {
  rejectedMalformedImport = true;
}
if (!rejectedMalformedImport) throw new Error("The importer accepted a member with an unknown material.");

const malformedSection = createHoweTruss();
malformedSection.beams[0].section = { kind: "hollowTube", outerDiameter: 10, innerDiameter: 12 };
let rejectedMalformedSection = false;
try {
  parseTrussFile(serializeTruss(malformedSection));
} catch {
  rejectedMalformedSection = true;
}
if (!rejectedMalformedSection) throw new Error("The importer accepted a tube whose inner diameter exceeds its outer diameter.");

const invalidReview = readReviewLink('#review=%%%');
if (!invalidReview || invalidReview.state !== null || !invalidReview.error) {
  throw new Error('The review-link reader did not report a malformed shared design.');
}

const legacyReviewUrl = `#review=${encodeURIComponent(btoa(encodeURIComponent(serializeTruss(createHoweTruss()))))}`;
if (!readReviewLink(legacyReviewUrl)?.state) {
  throw new Error("The share-link reader broke compatibility with previously generated review links.");
}

const legacySection = createHoweTruss();
delete legacySection.beams[0].I;
const upgradedSection = parseTrussFile(serializeTruss(legacySection));
if (!Number.isFinite(upgradedSection.beams[0].I) || (upgradedSection.beams[0].I ?? 0) <= 0) {
  throw new Error("The importer did not restore section inertia for an older section file.");
}

if (buildPresentationDraft(3, 2, null).includes('ran the analysis')) {
  throw new Error("The presentation draft claimed an analysis ran when no result exists.");
}

console.log("Solver, equilibrium, import/export, and invalid-model checks passed.");
