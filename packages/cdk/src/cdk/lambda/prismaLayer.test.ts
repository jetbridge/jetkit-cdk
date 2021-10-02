import "@aws-cdk/assert/jest"
import { Stack } from "@aws-cdk/core"
import { PrismaLayer } from "./prismaLayer"

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
