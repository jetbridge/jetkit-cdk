import { createProjectSync, ts } from "@ts-morph/bootstrap"
import * as fs from "fs"
import * as path from "path"
import { default as SimpleMarkdown } from "simple-markdown"

const projectRootDir = "."

describe("README examples", () => {
  const readmePath = path.join(projectRootDir, "README.md")
  const readmeContents = fs.readFileSync(readmePath)

  // extract examples
  const parser = SimpleMarkdown.parserFor(SimpleMarkdown.defaultRules)
  const parsed = parser(readmeContents.toString())

  let exampleNum = 1
  parsed.forEach((block) => {
    if (block.type !== "codeBlock" || block.lang != "typescript") return

    describe(`compiles example ${exampleNum++}`, () => {
      compile(block.content)
      expect(true).toBeTruthy()
    })
  })
})

function compile(input: string): void {
  const project = createProjectSync({
    tsConfigFilePath: "packages/cdk/tsconfig.json",
    compilerOptions: {
      noEmit: true,
    },
  })

  // build program
  project.createSourceFile("packages/cdk/src/example.ts", input)
  const program = project.createProgram()

  // try to compile
  const emitResult = program.emit()

  // get errors
  const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics)

  allDiagnostics.forEach((diagnostic) => {
    if (diagnostic.file) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start!)
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
      console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`)
    } else {
      console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"))
    }
  })

  it("compiles without errors or warnings", () => {
    expect(allDiagnostics).toHaveLength(0)
    expect(emitResult.emitSkipped).toBeFalsy()
  })
}
