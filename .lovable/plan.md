Remove the City field from the onboarding form in `src/pages/OnboardingPage.tsx`:

- Delete the `city` state variable and its setter.
- Remove the City label + input block in the "details" step.
- Remove `city` from the `profiles` update payload in `handleFinish` (so it's no longer written on completion).

No database changes — the `city` column stays in `profiles` and simply won't be set during onboarding. Users can still add it later from their profile/settings if that surface exists.