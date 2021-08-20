export function randomBetweenNAndM(n: number, m: number): number {
  /**
   * creates a random number between n and m, m not inclusive [n,m)
   */
  if (n > m) throw Error("m has to be equal or bigger than n")
  const diff = m - n
  return Math.floor(n + Math.floor(diff * Math.random()))
}