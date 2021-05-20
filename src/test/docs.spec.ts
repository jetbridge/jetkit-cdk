import { createProjectSync, ts } from "@ts-morph/bootstrap"
import * as fs from "fs"
import * as path from "path"
import { default as SimpleMarkdown } from "simple-markdown"

describe("README examples", () => {
  const readmePath = path.join(__dirname, "..", "..", "README.md")
  const readmeContents = fs.readFileSync(readmePath)

  // extract examples
  const parser = SimpleMarkdown.parserFor(SimpleMarkdown.defaultRules)
  const parsed = parser(readmeContents.toString())

  let exampleNum = 1
  parsed.forEach((block) => {
    if (block.type !== "codeBlock" || block.lang != "typescript") return

    describe(`compiles example ${exampleNum++}`, () => {
      compile(block.content)
    })
  })
})

function compile(input: string): void {
  const project = createProjectSync({ tsConfigFilePath: "tsconfig.json", compilerOptions: { noEmit: true } })

  // hack to make it possible to import the project source files instead of "@jetkit/cdk"
  input = input.replace('from "@jetkit/cdk"', 'from "./src/index"')

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
