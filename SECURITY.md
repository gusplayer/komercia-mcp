# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.x     | ✓ Active  |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Send a detailed report to: **security@komercia-exit.com**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Suggested fix (optional but appreciated)

You will receive an acknowledgement within **48 hours** and a resolution timeline within **7 days**.

## Security Model

This tool handles merchant authentication tokens (JWTs) and proxies read-only requests to Komercia's backend APIs. No write operations are performed.

**Scope of this MCP server:**
- Issues credentials (JWT) to verified Komercia merchants via magic link
- Accepts those credentials to authenticate Claude.ai requests
- Proxies read-only data queries to Komercia backends on behalf of merchants
- Does NOT store merchant data — it passes it through to Claude

**Out of scope:**
- Komercia's own backend APIs (report issues directly to Komercia)
- Claude.ai / Anthropic platform (report at https://anthropic.com/security)

## Responsible Disclosure

We follow a **90-day disclosure policy**. If a fix is not released within 90 days of a confirmed vulnerability report, the researcher may disclose publicly.

Security researchers who responsibly disclose valid vulnerabilities will be credited in the release notes (unless they prefer anonymity).
