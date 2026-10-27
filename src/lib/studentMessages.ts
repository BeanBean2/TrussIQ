/** Map solver / app messages into classroom-friendly titles and tips. */

export interface StudentAlert {
  title: string;
  message: string;
  tip: string | null;
}

const UNSTABLE_TIP =
  'A plane truss usually needs a pin on one end and a roller on the other, plus triangles so the shape cannot fold.';

export function alertForSolverMessage(raw: string | null | undefined): StudentAlert {
  const message = (raw ?? 'The analysis could not finish. Check supports, members, and loads.').trim();
  const lower = message.toLowerCase();

  if (lower.includes('unstable') || lower.includes('rigid body') || lower.includes('mechanism')) {
    return {
      title: 'Structure still moves',
      message: plainSolverCopy(message),
      tip: UNSTABLE_TIP,
    };
  }
  if (lower.includes('add nodes') || lower.includes('add at least one beam') || lower.includes('audit')) {
    return {
      title: 'Model incomplete',
      message: plainSolverCopy(message),
      tip: 'Place joints, connect them with members, add supports, then apply a load before running analysis.',
    };
  }
  if (lower.includes('numeric range') || lower.includes('exceeds')) {
    return {
      title: 'Numbers out of range',
      message: plainSolverCopy(message),
      tip: 'Try smaller loads, more realistic member areas, or a shorter span for a classroom model.',
    };
  }
  if (lower.includes('all degrees of freedom')) {
    return {
      title: 'Everything is locked',
      message: 'Every joint direction is fixed, so there is nothing left to solve. Release at least one free direction.',
      tip: 'Keep a pin + roller pattern instead of fixing every joint.',
    };
  }
  return {
    title: 'Could not analyze',
    message: plainSolverCopy(message),
    tip: UNSTABLE_TIP,
  };
}

export function alertForImportMessage(raw: string): StudentAlert {
  return {
    title: 'Could not import file',
    message: raw,
    tip: 'Use a TrussIQ .truss or JSON export. If you edited the file by hand, check that nodes[] and beams[] are complete.',
  };
}

export function alertForExportMessage(raw: string): StudentAlert {
  return {
    title: 'Could not export',
    message: raw,
    tip: 'Try again, or use Save .truss / Project summary as a backup.',
  };
}

function plainSolverCopy(message: string): string {
  return message
    .replace(/free degrees of freedom/gi, 'free joint directions')
    .replace(/internal mechanism/gi, 'folding mechanism (missing triangles or supports)')
    .replace(/rigid body motion/gi, 'sliding or spinning as a whole')
    .replace(/degrees of freedom/gi, 'joint directions')
    .replace(/\bFEA\b/g, 'analysis')
    .replace(/\bKu\s*=\s*F\b/gi, 'the equilibrium equations');
}
