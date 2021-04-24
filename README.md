# JetKit/CDK

An opinionated toolkit for building cloud-native serverless applications.

This module provides tools for defining RESTful API views with code
and generating cloud infrastructure using [AWS CDK](https://docs.aws.amazon.com/cdk/latest/guide/home.html).

[![Tests](https://github.com/jetbridge/jetkit-cdk/actions/workflows/ci.yml/badge.svg)](https://github.com/jetbridge/jetkit-cdk/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/%40jetkit%2Fcdk.svg)](https://badge.fury.io/js/%40jetkit%2Fcdk)

## Motivation

We want to build maintainable and scalable cloud-first applications, with cloud resources generated from application code.

Using AWS CDK we can automate generating API Gateway routes and Lambda functions from class and function metadata.
Each class or function view is a self-contained Lambda function that only pulls in the dependencies needed for its functioning, keeping startup times low and applications modular.
Get all of the power of a minimal web framework without cramming your entire app into a single Lambda.

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
import { APIGatewayProxyHandlerV2 } from "aws-lambda"
import { APIEvent, ApiViewBase } from "../api/base"
import { ApiView, Route, SubRoute } from "../registry"

@ApiView({
  path: "/album",
  memorySize: 512,
  environment: {
    LOG_LEVEL: "DEBUG",
  },
  bundling: { minify: true, metafile: true, sourceMap: true },
})
export class AlbumApi extends ApiViewBase {
  // custom endpoint in the view
  @SubRoute({
    path: "/{albumId}/like", // will be /album/123/like
    methods: [HttpMethod.POST, HttpMethod.DELETE],
    environment: {
      LOG_LEVEL: "DEBUG",
    },
  })
  async like(event: APIEvent) {
    const albumId = event.pathParameters?.albumId
    if (!albumId) throw badRequest("albumId is required in path")

    const method = event.requestContext.http.method

    // POST - mark album as liked
    if (method == HttpMethod.POST) return `Liked album ${albumId}`
    // DELETE - unmark album as liked
    else if (method == HttpMethod.DELETE) return `Unliked album ${albumId}`
    else return methodNotAllowed()
  }

  // define POST handler
  post: APIGatewayProxyHandlerV2 = async () => "Created new album"
}
```

### Handler Function With Route

```typescript
// a simple standalone function with a route attached
export async function topSongsHandler(event: APIEvent) {
  return JSON.stringify({
    message: "function route",
    rawQueryString: event.rawQueryString,
  })
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
})(async function topSongsFuncInner(event: APIEvent) {
  return `cookies: ${event.cookies}`
})
export { topSongsFuncInner }
```
