# SJ Tutor AI Authentication Security Specification & TDD

## 1. Core Security Invariants
1. **Unique Identity Mapping**: Each authentication identity (Google, Apple, Yahoo, GitHub, Email+Password, or SJ Tutor AI ID) can map to at most one SJ Tutor AI account.
2. **Deterministic Sign Up vs Login Boundaries**:
   - `SIGN UP + EXISTING ACCOUNT` $\to$ Refuse duplicate account creation. Display **Account Already Exists** ("This account is already registered with SJ Tutor AI. Please try logging in instead.").
   - `LOGIN + UNREGISTERED IDENTITY` $\to$ Refuse silent auto-creation. Display **Account Not Found** ("We couldn't find an SJ Tutor AI account associated with this login. Please try signing up first.").
   - `LOGIN + EXISTING ACCOUNT` $\to$ Verify credentials. For SJ Tutor AI ID, require genuine 2-Step Verification factor.
3. **No Blind Merging**: Account linking requires an authenticated primary session and explicit secondary verification. No automatic merging simply by matching an email string.
4. **Credential Confidentiality**: Plaintext passwords are never stored or logged; passwords are cryptographic bcrypt hashes with salt rounds $\ge 10$.
5. **Two-Factor Integrity**: 2-Step Verification for SJ Tutor AI ID generates time-expiring cryptographic 6-digit challenge tokens (5-minute TTL) with strict single-use invalidation and max 5 attempts rate limiting.
6. **Rate Limiting**: Brute-force protection on password evaluation and 2FA code verification.

## 2. Test Scenarios (Security Vectors)
1. `ATTEMPT_DUPLICATE_SIGNUP_GOOGLE`: An existing registered Google user attempts to sign up again via Sign Up page $\to$ System detects existing record, aborts registration, and displays "Account Already Exists" modal.
2. `ATTEMPT_LOGIN_WITHOUT_SIGNUP`: A user clicks "Continue with GitHub" on Login page without prior registration $\to$ System detects no record, signs out from provider session, and displays "Account Not Found" prompt to sign up.
3. `ATTEMPT_INVALID_SJTA_LOGIN`: Submitting non-existent `SJTA-XXXXXX` $\to$ Returns "Account Not Found".
4. `ATTEMPT_WRONG_PASSWORD`: Submitting valid `SJTA-XXXXXX` with wrong password $\to$ Returns "Incorrect Password".
5. `ATTEMPT_BYPASS_2FA`: Attempting to access dashboard with step-1 ticket without completing 2-Step verification $\to$ Rejected.
6. `ATTEMPT_EXPIRED_2FA_CODE`: Submitting 2-Step code after 5-minute TTL $\to$ Returns "Invalid Code".
7. `ATTEMPT_BRUTE_FORCE_2FA`: Submitting 5 failed 2-Step codes $\to$ Returns "Too Many Attempts" and locks challenge.
8. `ATTEMPT_DUPLICATE_SJTA_ID`: Trying to register an already claimed SJ Tutor AI ID $\to$ Rejected with "Account Already Exists".
