# JetKit/CDK

An anti-framework for building cloud-native serverless applications.

This module provides convenient tools for writing RESTful API views
and generating cloud infrastructure with [AWS CDK](https://docs.aws.amazon.com/cdk/latest/guide/home.html).

[![Tests](https://github.com/jetbridge/jetkit-cdk/actions/workflows/ci.yml/badge.svg)](https://github.com/jetbridge/jetkit-cdk/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/%40jetkit%2Fcdk.svg)](https://badge.fury.io/js/%40jetkit%2Fcdk)

## Motivation

We want to build maintainable and scalable cloud-first applications, with cloud resources generated from application code.

Using AWS CDK we can automate generating API Gateway routes and Lambda functions from class and function metadata.
Each class or function view is a self-contained Lambda function that only pulls in the dependencies needed for its
functioning, keeping startup times low and applications modular.
Get the utility of a minimal web framework without cramming your entire app into a single Lambda.

Optional support for TypeORM using the Aurora Serverless Data API and convenient helpers for CRUD, serialization, tracing, and error handling will be added soon.

## Documentation

Guides and API reference can be found at [https://jetbridge.github.io/jetkit-cdk/](https://jetbridge.github.io/jetkit-cdk/).

## Installation

@jetkit/cdk runs on Node.js and is available as a NPM package.

```shell
npm install @jetkit/cdk
```

## Examples

### API View

```typescript
import { HttpMethod } from "@aws-cdk/aws-apigatewayv2"
import { badRequest, methodNotAllowed } from "@jdpnielsen/http-error"
import { ApiView, Route, SubRoute, ApiEvent, ApiResponse, ApiViewBase, apiViewHandler } from "@jetkit/cdk"

@ApiView({
  path: "/album",
  memorySize: 512,
  environment: {
    LOG_LEVEL: "DEBUG",
  },
  bundling: { minify: true, metafile: true, sourceMap: true },
})
export class AlbumApi extends ApiViewBase {
  // define POST handler
  post = async () => "Created new album"

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
export const handler = apiViewHandler(__filename, AlbumApi)
```

### Handler Function With Route

```typescript
import { HttpMethod } from "@aws-cdk/aws-apigatewayv2"
import { Route, ApiEvent } from "@jetkit/cdk"

// a simple standalone function with a route attached
export async function topSongsHandler(event: ApiEvent) {
  return "top songs"
}
// define route and lambda properties
Route({
  path: "/top-songs",
  methods: [HttpMethod.PUT],
  memorySize: 384,
  environment: {
    LOG_LEVEL: "WARN",
  },
})(topSongsHandler)

// alternate, uglier way of writing the same thing
const topSongsFuncInner = Route({
  path: "/top-songs-inner",
  methods: [HttpMethod.PUT],
  memorySize: 384,
  environment: {
    LOG_LEVEL: "WARN",
  },
  // this function name should match the exported name
  // or you must specify the exported function name in `handler`
})(async function topSongsFuncInner(event: ApiEvent) {
  return "top songs"
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

---

To generate API Gateway routes and Lambda function handlers from your application code:

```typescript
import { CorsHttpMethod, HttpApi } from "@aws-cdk/aws-apigatewayv2"
import { Construct, Duration, Stack, StackProps, App } from "@aws-cdk/core"
import { ResourceGeneratorConstruct, AlbumApi, topSongsHandler } from "@jetkit/cdk"

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
      resources: [AlbumApi, topSongsHandler], // supply your API views and functions here
      httpApi,
    })
  }
}
```

### Super Quickstart

Use this monorepo project template: [jkv2-ts-template](https://github.com/jetbridge/jkv2-ts-template)
