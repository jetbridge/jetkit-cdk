/* eslint-disable @typescript-eslint/no-unused-vars */
import * as fs from "fs"
import * as path from "path"
import { default as SimpleMarkdown, ParserRule } from "simple-markdown"
import * as ts from "typescript"

const underlineRule: ParserRule = {
  // Specify the order in which this rule is to be run
  order: SimpleMarkdown.defaultRules.em.order - 0.5,

  // First we check whether a string matches
  match: function (source: string) {
    return /^__([\s\S]+?)__(?!_)/.exec(source)
  },

  // Then parse this string into a syntax node
  parse: function (capture, parse, state) {
    return {
      content: parse(capture[1], state),
    }
  },
}

describe("README examples", () => {
  it("compiles", async () => {
    // read README
    const readmePath = path.join(__dirname, "..", "..", "README.md")
    const readmeContents = fs.readFileSync(readmePath)

    // extract examples
    // const rules = { ...SimpleMarkdown.defaultRules, underline: underlineRule }
    const parser = SimpleMarkdown.parserFor(SimpleMarkdown.defaultRules)
    const parsed = parser(readmeContents.toString())

    for (const block of parsed) {
      if (block.type !== "codeBlock" || block.lang != "typescript") continue

      console.log(block)

      compile(block.content, {
        target: ts.ScriptTarget.ES5,
        module: ts.ModuleKind.CommonJS,
      })
    }
  })
})

function compile(input: string, options: ts.CompilerOptions): void {
  const libSource = fs.readFileSync(path.join(path.dirname(require.resolve("typescript")), "lib.d.ts")).toString()
  const result = transform(source, libSource)

  const program = ts.transpile(input, options)
  // const emitResult = program.emit()

  // // ts.getTranspi
  // const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics)

  // allDiagnostics.forEach((diagnostic) => {
  //   if (diagnostic.file) {
  //     const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start!)
  //     const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
  //     console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`)
  //   } else {
  //     console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"))
  //   }
  // })

  // const exitCode = emitResult.emitSkipped ? 1 : 0
  // console.log(`Process exiting with code '${exitCode}'.`)
  // process.exit(exitCode)
}
function transform(contents: string, libSource: string, compilerOptions: ts.CompilerOptions = {}) {
  // Generated outputs
  const outputs: { name: any; text: any; writeByteOrderMark: any }[] = []
  // Create a compilerHost object to allow the compiler to read and write files
  const compilerHost = {
    getSourceFile: function (filename: string, _languageVersion: any) {
      if (filename === "file.ts") return ts.createSourceFile(filename, contents, compilerOptions.target!)
      if (filename === "lib.d.ts") return ts.createSourceFile(filename, libSource, compilerOptions.target!)
      return undefined
    },
    writeFile: function (name: any, text: any, writeByteOrderMark: any) {
      outputs.push({ name: name, text: text, writeByteOrderMark: writeByteOrderMark })
    },
    getDefaultLibFilename: function () {
      return "lib.d.ts"
    },
    useCaseSensitiveFileNames: function () {
      return false
    },
    getCanonicalFileName: function (filename: any) {
      return filename
    },
    getCurrentDirectory: function () {
      return ""
    },
    getNewLine: function () {
      return "\n"
    },
  }
  // Create a program from inputs
  const program = ts.createProgram(["file.ts"], compilerOptions, compilerHost)
  // Query for early errors
  let errors = program.getDiagnostics()
  // Do not generate code in the presence of early errors
  if (!errors.length) {
    // Type check and get semantic errors
    const checker = program.getTypeChecker(true)
    errors = checker.getDiagnostics()
    // Generate output
    checker.emitFiles()
  }
  return {
    outputs: outputs,
    errors: errors.map(function (e) {
      return e.file.filename + "(" + e.file.getLineAndCharacterFromPosition(e.start).line + "): " + e.messageText
    }),
  }
}
