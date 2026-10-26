import type { FEAResult } from './types';

export const LIVE_DEMO_URL = 'https://happypotato9001.github.io/TrussIQ/';

export const CAC_OFFICIAL_SOURCES = {
  rules: 'https://www.congressionalappchallenge.us/wp-content/uploads/2026/05/2026-CAC-Rules.pdf',
  registration: 'https://www.congressionalappchallenge.us/students/student-registration/',
  portal: 'https://webportalapp.com/sp/login/congressional_app_challenge_2026',
} as const;

export const CAC_DEADLINE_NOTICE = 'The 2026 rules PDF lists October 26, 2026 at 12:00 p.m. EDT; the registration page lists 9:00 p.m. ET. These official sources conflict. Confirm the deadline in the live submission portal and submit early.';

/** One-sentence purpose judges can repeat — personalize with your district/school if you wish. */
export const CAC_PURPOSE_SENTENCE =
  'TrussIQ gives under-resourced classrooms free browser-based truss FEA so students can learn structural load paths without expensive engineering software.';

export const CAC_TARGET_AUDIENCE =
  'Middle and high school physics, robotics, and intro engineering students and teachers.';

export const CAC_VIDEO_STORYBOARD = [
  { time: '0:00–0:15', prompt: 'Introduce each participant and say the app name.' },
  { time: '0:15–0:30', prompt: `Explain the app purpose in one clear sentence and name its target audience. Suggested purpose: "${CAC_PURPOSE_SENTENCE}" Audience: ${CAC_TARGET_AUDIENCE}` },
  { time: '0:30–1:05', prompt: 'Show the app working. Load or open a model, run the analysis, and explain one result in your own words.' },
  { time: '1:05–1:25', prompt: 'Make one design change and compare the result. Explain that TrussIQ gives a linear, axial-only learning estimate, not a construction safety approval.' },
  { time: '1:25–1:40', prompt: 'Name the tools and programming languages used. Describe a part of the code you personally understand; disclose AI assistance accurately in the application.' },
  { time: '1:40–1:55', prompt: 'Close with one thing you learned and how the app helps its intended audience.' },
] as const;

export function buildSubmissionPrepText(options: {
  appTitle: string;
  steps: Array<{ title: string; detail: string }>;
  completedSteps: boolean[];
  aiDisclosure: string;
}): string {
  const { appTitle, steps, completedSteps, aiDisclosure } = options;
  return [
    'CONGRESSIONAL APP CHALLENGE — SUBMISSION PREP',
    'Use the official portal and current rulebook to confirm requirements.',
    'Checklist marks are self-reported reminders, not independently verified completion or eligibility.',
    CAC_DEADLINE_NOTICE,
    '',
    ...steps.map((step, index) => `${completedSteps[index] ? '[x]' : '[ ]'} ${step.title}\n${step.detail}`),
    '',
    'AI USE DISCLOSURE (complete truthfully)',
    aiDisclosure.trim() || '[Describe each AI tool used, what it helped with, and your own original contributions.]',
    '',
    'APP / VIDEO OUTLINE',
    `App: ${appTitle}`,
    'Participant name(s): [add in your official submission]',
    `Purpose (one clear sentence): ${CAC_PURPOSE_SENTENCE}`,
    `Target audience: ${CAC_TARGET_AUDIENCE}`,
    'Tools and programming languages: TypeScript, React, Vite, Tailwind CSS, Three.js; optional Google Gemini API for coaching',
    'Demonstration: [show the app working — guided demo or Howe preset → Run FEA → one design change]',
    `Live demo URL: ${LIVE_DEMO_URL}`,
    'Privacy note: Models and drafts stay in the browser by default. Optional Gemini coaching sends model context to Google only when an API key is configured (see PRIVACY.md).',
    '',
    'SUGGESTED DEMO VIDEO STORYBOARD (about 1 minute 55 seconds; personalize every line)',
    ...CAC_VIDEO_STORYBOARD.map((beat) => `${beat.time}  ${beat.prompt}`),
    '',
    `Official 2026 rules: ${CAC_OFFICIAL_SOURCES.rules}`,
    `Official registration page: ${CAC_OFFICIAL_SOURCES.registration}`,
    `Official submission portal: ${CAC_OFFICIAL_SOURCES.portal}`,
  ].join('\n');
}

/** A checked yield limit is a solver result, not a complete structural safety claim. */
export function isYieldLimitMet(result: FEAResult | null): boolean {
  return Boolean(result?.success && result.passed && result.maxSafetyRatio < 1);
}

/** Return an explicitly editable, evidence-aware draft for the CAC demo story. */
export function buildPresentationDraft(nodeCount: number, memberCount: number, result: FEAResult | null): string {
  const opener = `${CAC_PURPOSE_SENTENCE} I built this for ${CAC_TARGET_AUDIENCE}`;
  if (!result?.success) {
    return `Draft to personalize: "${opener} On my current model (${nodeCount} nodes, ${memberCount} members) I still need to run the analysis and record what it shows. My design decision was [describe your change and reasoning]."`;
  }

  return `Draft to personalize: "${opener} On my current model (${nodeCount} nodes, ${memberCount} members) peak yield utilization is ${(result.maxSafetyRatio * 100).toFixed(1)}%. This is a linear, axial-only estimate, not a complete safety assessment. My design decision was [describe your change and evidence]."`;
}
