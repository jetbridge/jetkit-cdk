# JetKit/CDK

[![Tests](https://github.com/jetbridge/jetkit-cdk/actions/workflows/ci.yml/badge.svg)](https://github.com/jetbridge/jetkit-cdk/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/%40jetkit%2Fcdk.svg)](https://badge.fury.io/js/%40jetkit%2Fcdk)
[![Open in Visual Studio Code](https://open.vscode.dev/badges/open-in-vscode.svg)](https://open.vscode.dev/jetbridge/jetkit-cdk)

An [anti-framework](https://spiegelmock.com/2021/05/29/frameworkless-web-applications-aws-cdk/) for building cloud-native serverless applications.

This module provides convenient tools for writing Lambda functions, RESTful API views,
and generating cloud infrastructure with [AWS CDK](https://docs.aws.amazon.com/cdk/latest/guide/home.html).

## Motivation

[Frameworkless web applications](https://spiegelmock.com/2021/05/29/frameworkless-web-applications-aws-cdk/).

We want to build maintainable and scalable cloud-first applications, with cloud resources generated from application code.

Using AWS CDK we can automate generating API Gateway routes and Lambda functions from class and function metadata.

Each class or function view is a self-contained Lambda function that only pulls in the dependencies needed for its
functioning, keeping startup times low and applications modular.

## Documentation

Guides and API reference can be found at [https://jetkit.dev/docs/](https://jetkit.dev/docs/).

### Super Quickstart

Use this monorepo project template: [typescript-cdk-template](https://github.com/jetbridge/typescript-cdk-template).

## Installation

```shell
npm install @jetkit/cdk
```

## Synopsis

### API View

Combine related functionality and routes into a single Lambda function bundle.

```typescript
import { HttpMethod } from "@aws-cdk/aws-apigatewayv2"
import { badRequest, methodNotAllowed } from "@jdpnielsen/http-error"
import { ApiView, SubRoute, ApiEvent, ApiResponse, ApiViewBase, apiViewHandler } from "@jetkit/cdk-runtime"

@ApiView({
  path: "/album",
})
export class AlbumApi extends ApiViewBase {
  // define POST /album handler
  @SubRoute({ methods: [HttpMethod.POST] })
  async post() {
    return "Created new album"
  }

  // custom endpoint in the view
  // routes to the ApiView function
  @SubRoute({
    path: "/{albumId}/like", // will be /album/123/like
    methods: [HttpMethod.POST, HttpMethod.DELETE],
  })
  async like(event: ApiEvent): ApiResponse {
    const albumId = event.pathParameters?.albumId
    if (!albumId) throw badRequest("albumId is required in path")

    const method = event.requestContext.http.method

    // POST - mark album as liked
    if (method == HttpMethod.POST) return `Liked album ${albumId}`
    // DELETE - unmark album as liked
    else if (method == HttpMethod.DELETE) return `Unliked album ${albumId}`
    // should never be reached
    else return methodNotAllowed()
  }
}
// Not required but lets you omit specifying the `entry` path to this file for convenience.
export const handler = apiViewHandler(__filename, AlbumApi)
// If using ES modules
// export const handler = apiViewHandlerEs(import.meta, AlbumApi)
```

### Handler Function With Route

```typescript
import { HttpMethod } from "@aws-cdk/aws-apigatewayv2"
import { Lambda, ApiEvent } from "@jetkit/cdk-runtime"

// a simple standalone function with a route attached
export async function topSongsHandler(event: ApiEvent) {
  return JSON.stringify(event.headers)
}
// define route and lambda properties
Lambda({
  path: "/top-songs",
  methods: [HttpMethod.GET],
})(topSongsHandler)
// If using ES modules:
// LambdaEs(import.meta, { path: "/top-songs" })(topSongsHandler)

// alternate, uglier way of writing the same thing
const topSongsFuncInner = Lambda({
  path: "/top-songs-inner",
  methods: [HttpMethod.GET],
  // this function name should match the exported name
  // or you must specify the exported function name in `handler`
})(async function topSongsFuncInner(event: ApiEvent) {
  return JSON.stringify(event.headers)
})
export { topSongsFuncInner }
```

### CDK Stack

To start from scratch:

```shell
npm install -g aws-cdk
cdk init app --language typescript
npm install @jetkit/cdk @aws-cdk/core @aws-cdk/aws-apigatewayv2
```

See the [guide](https://docs.aws.amazon.com/cdk/latest/guide/hello_world.html) for more details.

To deploy your stack:

```shell
cdk deploy
```

---

To generate API Gateway routes and Lambda function handlers from your application code:

```typescript
import { CorsHttpMethod, HttpApi } from "@aws-cdk/aws-apigatewayv2"
import { Duration, Stack, StackProps, App } from "@aws-cdk/core"
import { ResourceGeneratorConstruct, ApiViewCdk } from "@jetkit/cdk"
import { topSongsHandler, AlbumApi } from "./test/sampleApp"

export class InfraStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props)

    // create API Gateway
    const httpApi = new HttpApi(this, "Api", {
      corsPreflight: {
        allowHeaders: ["Authorization"],
        allowMethods: [CorsHttpMethod.ANY],
        allowOrigins: ["*"],
        maxAge: Duration.days(10),
      },
    })

    // transmute your app code into infrastructure
    new ResourceGeneratorConstruct(this, "Generator", {
      resources: [
          // supply your functions and view classes here
          topSongsHandler,
          
          // can add additional lambda attributes here if desired
          ApiViewCdk({ memorySize: 1024, bundling: { minify: true }})(AlbumApi)
      ], 
      httpApi,
    })
  }
}
```

## How It Works

This library provides decorators that can be attached to view classes, methods, and functions. The decorator attaches metadata in the form of options for constructing the Lambda function and optionally API Gateway routes.

It also includes some convenient [CDK L3 constructs](https://docs.aws.amazon.com/cdk/latest/guide/constructs.html) to generate the Lambda functions and API Gateway routes from your decorated application code.

### Local Development

AWS SAM supports [running CDK applications locally](https://aws.amazon.com/blogs/compute/better-together-aws-sam-and-aws-cdk/) (in beta).
