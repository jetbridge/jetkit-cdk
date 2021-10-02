import "@aws-cdk/assert/jest"
import { Stack } from "@aws-cdk/core"
import * as path from "path"
import { PrismaLayer } from "./prismaLayer"

const prismaPath = path.join(__dirname)

describe("PrismaLayer", () => {
  let stack: Stack

  beforeEach(() => {
    stack = new Stack()
  })

  it("builds layer", () => {
    new PrismaLayer(stack, "PL")

    expect(stack).toHaveResource("AWS::Lambda::LayerVersion", {})
  })
})
