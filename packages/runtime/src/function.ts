import callsites from "callsites"

/**
 * Finds the name of the file where `fnName` was called.
 * Borrowed a bit from https://github.com/aws/aws-cdk/blob/v1.96.0/packages/@aws-cdk/aws-lambda-nodejs/lib/function.ts
 */
export function findDefiningFile(fnName: string | null): string | undefined {
  let definingIndex
  const sites = callsites()
  for (const [index, site] of sites.entries()) {
    // console.log(`CALL SITE: ${site.getFunctionName()} - ${site.getFileName()}`)

    if (site.getFunctionName() === fnName) {
      // The next site is the site where the function was called
      definingIndex = index + 1
      break
    }
  }

  if (!definingIndex || !sites[definingIndex]) {
    // throw new Error("Cannot find defining file.")
    return undefined
  }

  return sites[definingIndex].getFileName() || undefined
}
