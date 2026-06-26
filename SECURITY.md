# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Security Best Practices

### Configuration
- Never commit `.env` files with real credentials
- Use environment variables for sensitive configuration
- The `.env.example` file shows required variables without real values

### Data Storage
- All data is stored locally in SQLite — no network calls by default
- Database path defaults to `./memories.db` in the current working directory
- Use environment variables to override the database location for production

### Dependencies
- All dependencies are version-pinned in `package.json`
- No `latest` or wildcard versions used
- Run `npm audit` regularly to check for vulnerabilities

### Input Validation
- All CLI arguments are validated by Commander
- Memory content is stored as-is (ensure application-level sanitization)
- JSON metadata is parsed with error handling

### OpenAI Integration (Optional)
- `OPENAI_API_KEY` is never hardcoded
- API key is read from environment variables
- Never log or expose the API key in responses

## Reporting a Vulnerability

If you discover a security vulnerability, please report it privately:
- GitHub Security Advisory: https://github.com/EdgarOrtegaRamirez/memory-pipe/security/advisories

Please do NOT create a public GitHub issue for security vulnerabilities.
