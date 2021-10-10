import { createProjectSync, ts } from "@ts-morph/bootstrap"
import * as fs from "fs"
import * as path from "path"
import { default as SimpleMarkdown } from "simple-markdown"
import { dirname } from "dirname-filename-esm"
const __dirname = dirname(import.meta)

const projectRootDir = path.join(__dirname, "..", "..", "..", "..")

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
    tsConfigFilePath: "tsconfig.json",
    compilerOptions: {
      baseUrl: projectRootDir,
      paths: {
        "@jetkit/cdk": ["packages/cdk/src/index"],
        "@jetkit/cdk-runtime": ["packages/runtime/src/index"],
      },
    },
  })

  // build program
  project.createSourceFile("example.ts", input)
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
