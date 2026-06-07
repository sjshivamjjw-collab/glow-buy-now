The issue is not fixed yet because Apple’s domain verification file is missing. I checked:

```text
https://myripple.co.in/.well-known/apple-developer-domain-association.txt
```

It currently returns:

```text
Not found
```

Plan:

1. Get the Apple domain association file content
   - In Apple Developer → Services ID → Sign in with Apple → Configure, look for any domain verification/download option.
   - If Apple does not show it, open the Services ID configuration again after saving and check whether the domain status has a verification action.

2. Host the verification file at the exact required path
   - Path: `/.well-known/apple-developer-domain-association.txt`
   - Final URL must work publicly:
     ```text
     https://myripple.co.in/.well-known/apple-developer-domain-association.txt
     ```

3. Re-check the URL
   - The URL must show Apple’s verification text, not `Not found`, HTML, or a redirect error.

4. Return to Apple Developer and complete domain verification
   - Once Apple sees the file, save/verify the Services ID again.

5. Test Sign in with Apple again
   - Only after domain verification succeeds should the “Sign-up not completed” popup go away.

Technical detail:
- This is not an app-code issue right now. Apple is rejecting the auth flow because the custom domain is listed in Apple auth settings but the required verification file is not publicly available on that domain.
- I should not change OAuth code or backend config until this verification file is available.