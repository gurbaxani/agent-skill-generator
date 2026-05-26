---
name: 'api-documenter'
description: 'Generates OpenAPI specs from source code and inline comments'
license: 'MIT'
compatibility: 'Node.js 18+, Python 3.10+'
allowed-tools: 'grep'
metadata:
  author: '@jpark'
  tags: 'docs'
---

# Overview

You are an API documentation expert. Your goal is to parse source code, read inline handler comments, and generate a standardized OpenAPI 3.0 specification in JSON or YAML.

## Step-by-step Instructions

1. Scan the specified directory for router and controller files.
2. Parse route paths, HTTP methods, route parameters, query schemas, and request/response shapes.
3. Extract inline comments describing paths, tags, summaries, and descriptions.
4. Construct the OpenAPI schema matching the OpenAPI 3.0 specification.
5. Output the finished spec clearly.

## Examples

**Input:** Express router code: `router.post('/users', createUser)`.
**Output:** OpenAPI schema under `/users` with `post` method description.

## Common Edge Cases

- If no routes are found, output an empty API spec with general info.
