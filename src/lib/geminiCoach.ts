/**
 * Gemini-powered engineering coach for TrussIQ.
 * API key from VITE_GEMINI_API_KEY (.env.local) or localStorage override.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { readStoredValue, writeStoredValue, removeStoredValue } from './storage';
import type { AIAnalysis, Beam, FEAResult, Node } from './types';

const STORAGE_KEY = 'trussiq-gemini-api-key';
/** gemini-2.0-flash was shut down; 3.8 Flash is the current Flash workhorse. */
const MODEL = 'gemini-3.8-flash';

export function getGeminiApiKey(): string {
  const fromStorage = readStoredValue(STORAGE_KEY)?.trim();
  if (fromStorage) return fromStorage;
  const fromEnv = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim();
  return fromEnv ?? '';
}

export function setGeminiApiKey(key: string): void {
  const trimmed = key.trim();
  if (trimmed) writeStoredValue(STORAGE_KEY, trimmed);
  else removeStoredValue(STORAGE_KEY);
}

export function hasGeminiApiKey(): boolean {
  return getGeminiApiKey().length > 0;
}

function buildModelContext(
  nodes: Node[],
  beams: Beam[],
  result: FEAResult | null,
  analysis: AIAnalysis,
): string {
  const loads = nodes
    .filter((n) => n.fx !== 0 || n.fy !== 0)
    .map((n) => `${n.id}: Fx=${n.fx} N, Fy=${n.fy} N, support=${n.support}`)
    .join('\n');

  const supports = nodes
    .filter((n) => n.support !== 'none')
    .map((n) => `${n.id}: ${n.support} @ (${n.x}, ${n.y}) mm`)
    .join('\n');

  const memberLines =
    result?.success
      ? result.members
          .slice(0, 40)
          .map(
            (m) =>
              `${m.beamId}: N=${m.axialForce.toFixed(1)} N, σ=${m.stress.toFixed(2)} MPa, ` +
              `util=${(m.safetyRatio * 100).toFixed(1)}%, ${m.status}${m.yielded ? ' YIELD' : ''}`,
          )
          .join('\n')
      : 'Not solved yet.';

  const advice = analysis.items
    .slice(0, 8)
    .map((i) => `[${i.severity}] ${i.title}: ${i.message}`)
    .join('\n');

  const maxU = result?.success
    ? Math.max(0, ...result.displacements.map((d) => Math.hypot(d.ux, d.uy)))
    : 0;

  return `
You are TrussIQ's Gemini engineering coach for high-school / college students learning 2D pin-jointed truss FEA (Direct Stiffness Method).

Rules:
- Be clear, accurate, and encouraging. Use short paragraphs.
- This model is LINEAR ELASTIC and AXIAL-ONLY (no bending moments in members).
- Units: mm, N, MPa, GPa.
- Do not invent member IDs or numbers that are not in the context.
- If the model is unsolved, tell them to run FEA first.
- Mention buckling only as a screening estimate when relevant.
- Keep answers under ~180 words unless they ask for more detail.

CURRENT MODEL
Nodes: ${nodes.length} · Members: ${beams.length}
Supports:
${supports || '(none)'}
Applied loads:
${loads || '(none)'}
Solver: ${result?.success ? 'SUCCESS' : result ? `FAILED — ${result.message ?? 'error'}` : 'NOT RUN'}
Peak |σ|/σ_yield: ${result?.success ? `${(result.maxSafetyRatio * 100).toFixed(1)}%` : 'n/a'}
Max |u|: ${result?.success ? `${maxU.toExponential(3)} mm` : 'n/a'}
Passed yield check: ${result?.success ? (result.passed ? 'yes' : 'no') : 'n/a'}

Member results (sample):
${memberLines}

Rule-based findings already computed by TrussIQ:
${advice || '(none)'}
`.trim();
}

export async function askGeminiCoach(
  question: string,
  nodes: Node[],
  beams: Beam[],
  result: FEAResult | null,
  analysis: AIAnalysis,
): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error(
      'Add your Gemini API key: paste it in the Coach panel, or set VITE_GEMINI_API_KEY in .env.local',
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: buildModelContext(nodes, beams, result, analysis),
  });

  const response = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: question }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 512,
    },
  });

  const text = response.response.text()?.trim();
  if (!text) throw new Error('Gemini returned an empty response. Try again.');
  return text;
}
