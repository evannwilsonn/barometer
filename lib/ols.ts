// Ordinary least squares that streams rows, so nearly two million training rows never need to sit
// in a matrix: it keeps only X'X, X'y and enough to report the residual variance.

export class LeastSquares {
  readonly k: number;
  private xtx: number[];
  private xty: number[];
  private yy = 0;
  n = 0;

  constructor(k: number) {
    this.k = k;
    this.xtx = new Array(k * k).fill(0);
    this.xty = new Array(k).fill(0);
  }

  add(x: number[], y: number) {
    const k = this.k;
    for (let i = 0; i < k; i++) {
      this.xty[i] += x[i] * y;
      for (let j = 0; j <= i; j++) this.xtx[i * k + j] += x[i] * x[j];
    }
    this.yy += y * y;
    this.n++;
  }

  /** Coefficients and residual variance (RSS / (n − k)). A tiny ridge keeps the solve stable. */
  solve(ridge = 1e-9): { beta: number[]; residVar: number } {
    const k = this.k;
    const a = new Array(k * k).fill(0);
    for (let i = 0; i < k; i++) for (let j = 0; j <= i; j++) a[i * k + j] = a[j * k + i] = this.xtx[i * k + j] + (i === j ? ridge * this.n : 0);
    const beta = choleskySolve(a, this.xty.slice(), k);
    // RSS = y'y − 2β'X'y + β'X'Xβ
    let bxy = 0, bxxb = 0;
    for (let i = 0; i < k; i++) {
      bxy += beta[i] * this.xty[i];
      for (let j = 0; j < k; j++) bxxb += beta[i] * a[i * k + j] * beta[j];
    }
    const rss = this.yy - 2 * bxy + bxxb;
    return { beta, residVar: rss / (this.n - k) };
  }
}

/** Solves A x = b for symmetric positive-definite A (row-major, k × k). */
export function choleskySolve(a: number[], b: number[], k: number): number[] {
  const l = new Array(k * k).fill(0);
  for (let i = 0; i < k; i++) {
    for (let j = 0; j <= i; j++) {
      let s = a[i * k + j];
      for (let p = 0; p < j; p++) s -= l[i * k + p] * l[j * k + p];
      if (i === j) {
        if (s <= 0) throw new Error("matrix is not positive definite");
        l[i * k + i] = Math.sqrt(s);
      } else l[i * k + j] = s / l[j * k + j];
    }
  }
  const y = new Array(k).fill(0);
  for (let i = 0; i < k; i++) {
    let s = b[i];
    for (let p = 0; p < i; p++) s -= l[i * k + p] * y[p];
    y[i] = s / l[i * k + i];
  }
  const x = new Array(k).fill(0);
  for (let i = k - 1; i >= 0; i--) {
    let s = y[i];
    for (let p = i + 1; p < k; p++) s -= l[p * k + i] * x[p];
    x[i] = s / l[i * k + i];
  }
  return x;
}
