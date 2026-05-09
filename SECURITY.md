# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 0.x     | Yes       |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Send a detailed report to: **security@komercia.co**

Include:

- Description of the vulnerability
- Steps to reproduce
- Affected component (`apps/mcp-server`, `apps/web`, `packages/*`)
- Potential impact
- Suggested fix (optional)

You will receive an acknowledgement within **48 hours** and a resolution timeline within **7 days**.

## Scope

This MCP server issues read-only credentials (JWT) to Komercia merchants and proxies read-only data queries to Komercia's backends on their behalf. It does not store merchant data.

**In scope**

- The HTTP/SSE MCP server in `apps/mcp-server`
- The Astro web app in `apps/web`
- The shared packages in `packages/*`
- Authentication, token issuance, encryption-at-rest

**Out of scope**

- Komercia's own backend APIs — report directly to Komercia
- Claude.ai / Anthropic platform — see https://anthropic.com/security
- The discovery CLI when run with non-production credentials

## Threat Model

A summary of the threat model (token expiry, encryption, revocation, dependency posture) lives in [`docs/security.md`](docs/security.md). Read that document before reporting design-level issues.

## Responsible Disclosure

We follow a **90-day disclosure policy**. If a fix is not released within 90 days of a confirmed report, the researcher may disclose publicly.

Researchers who responsibly disclose valid vulnerabilities will be credited in the release notes (unless they prefer anonymity).
