# Firestore Security Specification - SJ Tutor AI Group & Auth Hardening

This document defines the core security invariants, potential vulnerability vectors, and validation assertions representing the comprehensive security model for the SJ Tutor AI database.

---

## 1. Data Invariants & Access Logic

1. **User Profile (`/users/{userId}`)**:
   - A user can only write to their own profile.
   - Core administrative fields like `credits` or `planType` are system-managed. Users cannot self-allocate credits or premium tiers.

2. **User History & Notifications (`/users/{userId}/history/{id}`, `/users/{userId}/notifications/{id}`)**:
   - Strictly private. Read and write privileges belong exclusively to the owner.
   - Referenced entity IDs and document keys must be robustly validated.

3. **Study Groups (`/groups/{groupId}`)**:
   - Private groups are hidden from list queries unless the user is a verified member or the group's owner.
   - Non-members can only execute a "join" action on public groups, which allows modifying *only* the `members` array and `memberCount` integer.
   - Group ownership is immutable. The `ownerId` cannot be updated or transferred once created.

4. **Group Chat Messages (`/groups/{groupId}/messages/{messageId}`)**:
   - Access to message lists is derived from the parent group’s membership list ("Master Gate" Relational Sync). Only active group members can read or write messages.
   - Message authors (`senderId`) must strictly match the authenticated user's ID (`request.auth.uid`).
   - Message timestamps must be verified against server-side time.

5. **Group Invitations (`/user_invites/{inviteId}`)**:
   - Invitations can only be read or written if the viewer is the invited email recipient or the inviter.
   - No participant can modify the invitation once it has reached a terminal state (`accepted` or `declined`).

---

## 2. The "Dirty Dozen" Vulnerability Payloads

Below are twelve malicious payloads designed to bypass basic access controls. All of these payloads must be blocked and return `PERMISSION_DENIED` under the hardened ruleset.

### Payload 1: Privilege Escalation in Profile Creation
*   **Target Path**: `/users/attacker_uid`
*   **Malicious Payload**:
    ```json
    {
      "displayName": "Hacker",
      "credits": 9999999,
      "planType": "Premium"
    }
    ```
*   **Expected Security Action**: Blocked. Standard users are forbidden from self-assigning credits or setting premium plan types.

### Payload 2: Hostile Takeover / Group Owner Spoofing
*   **Target Path**: `/groups/math_group_123`
*   **Malicious Payload**:
    ```json
    {
      "name": "Math Whizzes",
      "ownerId": "attacker_uid",
      "ownerName": "Attacker",
      "privacy": "public",
      "isActive": true
    }
    ```
*   **Expected Security Action**: Blocked. Group ownership is immutable; modifying `ownerId` on update is forbidden.

### Payload 3: Shadow Field Injection (No Loose Blueprints)
*   **Target Path**: `/groups/new_group`
*   **Malicious Payload**:
    ```json
    {
      "name": "History Study",
      "privacy": "public",
      "ownerId": "attacker_uid",
      "isActive": true,
      "members": ["attacker_uid"],
      "isAdmin": true,
      "ghost_role": "super_admin_bypass"
    }
    ```
*   **Expected Security Action**: Blocked. The validation helper enforces strict, exact map keys on creation, rejecting unrecognized fields.

### Payload 4: ID Poisoning (Wallet Exhaustion Attack)
*   **Target Path**: `/groups/junk_char_overflow_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`
*   **Malicious Payload**:
    ```json
    {
      "name": "AP Calc",
      "privacy": "public",
      "ownerId": "attacker_uid",
      "isActive": true,
      "members": ["attacker_uid"]
    }
    ```
*   **Expected Security Action**: Blocked. The document path variable fails the standard `isValidId()` pattern, preventing cost-amplifying overflow records.

### Payload 5: Anonymous Spam Messaging
*   **Target Path**: `/groups/math_group_123/messages/msg_999`
*   **Malicious Payload**:
    ```json
    {
      "text": "Spam Link Here",
      "senderId": "system_spoof",
      "senderName": "System Admin"
    }
    ```
*   **Expected Security Action**: Blocked. Unauthenticated or non-group-member users cannot create messages, and the sender's identity must match `request.auth.uid`.

### Payload 6: Message Spoofing (Impersonating Peers)
*   **Target Path**: `/groups/math_group_123/messages/msg_101`
*   **Malicious Payload**:
    ```json
    {
      "text": "Hello world",
      "senderId": "legitimate_peer_uid",
      "senderName": "Sincere Peer"
    }
    ```
*   **Expected Security Action**: Blocked. `senderId` must match the actual authenticated user's ID.

### Payload 7: Terminal State Bypass / Re-opening Invites
*   **Target Path**: `/user_invites/invite_abc` (existing state is already `accepted`)
*   **Malicious Payload**:
    ```json
    {
      "status": "pending",
      "email": "victim@gmail.com",
      "invitedBy": "attacker_uid",
      "groupId": "math_group_123",
      "groupName": "Math Group"
    }
    ```
*   **Expected Security Action**: Blocked. State transitions out of terminal status (`accepted`/`declined`) are mathematically locked.

### Payload 8: Self-Inviting / Privilege Injection
*   **Target Path**: `/user_invites/invite_xyz`
*   **Malicious Payload**:
    ```json
    {
      "email": "attacker@gmail.com",
      "invitedBy": "attacker_uid",
      "invitedByName": "Attacker",
      "groupId": "vip_group_hidden",
      "groupName": "VIP Study",
      "status": "accepted",
      "receiverUid": "attacker_uid"
    }
    ```
*   **Expected Security Action**: Blocked. Standard users cannot self-approve or self-create accepted invitations into groups they do not own.

### Payload 9: Denial of Wallet via Unbounded Array Injection
*   **Target Path**: `/groups/math_group_123`
*   **Malicious Payload**:
    ```json
    {
      "members": ["uid1", "uid2", "uid3", "... 20,000 attacker uids ..."],
      "memberCount": 20001
    }
    ```
*   **Expected Security Action**: Blocked. Arrays representing user participation must be bounded, or restricted strictly via individual subcollection entries.

### Payload 10: Client Query Leak / Query Scraping
*   **Query**: List `/groups` where `privacy == 'private'`
*   **Expected Security Action**: Blocked. The rule enforcer blocks blanket query requests that do not specify structural membership limits (evaluated on `resource.data`).

### Payload 11: Fake Verification Status (Email Spoofing)
*   **Authentication state**: `request.auth.token.email_verified == false`
*   **Malicious Payload**: Attempting any write or read operation requiring full verification.
*   **Expected Security Action**: Blocked. Rules explicitly enforce `request.auth.token.email_verified == true`.

### Payload 12: Client Timestamp Poisoning
*   **Target Path**: `/groups/math_group_123/messages/msg_102`
*   **Malicious Payload**:
    ```json
    {
      "text": "Future spam message",
      "senderId": "attacker_uid",
      "senderName": "Attacker",
      "createdAt": 4102444800000
    }
    ```
*   **Expected Security Action**: Blocked. Timestamps must strictly be set to the server timestamp `request.time`.

---

## 3. Security Test Scenarios

The accompanying test suite validates all standard and edge-case access control rules to guarantee zero logical leakages.
