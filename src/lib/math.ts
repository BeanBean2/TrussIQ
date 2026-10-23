/**
 * Dense linear algebra helpers for the Direct Stiffness Method.
 * Uses Gauss-Jordan elimination with partial pivoting for Ax = b.
 */

/** Create an n×n zero matrix. */
export function zeros(n: number, m = n): number[][] {
  return Array.from({ length: n }, () => Array(m).fill(0));
}

/** Deep-copy a matrix. */
export function cloneMatrix(A: number[][]): number[][] {
  return A.map((row) => row.slice());
}

/**
 * Solve A x = b via Gauss-Jordan elimination with partial pivoting.
 * Returns null if the matrix is singular (det ≈ 0) — indicating an
 * unstable / under-constrained structure.
 */
export function solveLinearSystem(A: number[][], b: number[]): number[] | null {
  const n = A.length;
  if (n === 0) return [];
  if (A.some((row) => row.length !== n) || b.length !== n) {
    throw new Error('Matrix and vector dimensions must match for a square system.');
  }

  // Augmented matrix [A | b]
  const M = A.map((row, i) => [...row, b[i]]);
  const eps = 1e-12;

  for (let col = 0; col < n; col++) {
    // Partial pivot: find largest |entry| in column below diagonal
    let pivotRow = col;
    let maxAbs = Math.abs(M[col][col]);
    for (let row = col + 1; row < n; row++) {
      const val = Math.abs(M[row][col]);
      if (val > maxAbs) {
        maxAbs = val;
        pivotRow = row;
      }
    }

    // Near-zero pivot → singular / unstable structure
    if (maxAbs < eps) return null;

    if (pivotRow !== col) {
      const tmp = M[col];
      M[col] = M[pivotRow];
      M[pivotRow] = tmp;
    }

    // Normalize pivot row
    const pivot = M[col][col];
    for (let j = col; j <= n; j++) {
      M[col][j] /= pivot;
    }

    // Eliminate other rows
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = M[row][col];
      if (Math.abs(factor) < eps) continue;
      for (let j = col; j <= n; j++) {
        M[row][j] -= factor * M[col][j];
      }
    }
  }

  return M.map((row) => row[n]);
}

/** Frobenius-ish max abs entry — useful for singularity heuristics. */
export function maxAbsEntry(A: number[][]): number {
  let max = 0;
  for (const row of A) {
    for (const v of row) {
      const a = Math.abs(v);
      if (a > max) max = a;
    }
  }
  return max;
}
