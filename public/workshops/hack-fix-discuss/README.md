# Hack, Fix, Discuss! - Facilitator Guide

This guide contains the solutions (attacks) and best practices (fixes) for the security challenges in the "Hack, Fix, Discuss!" workshop.

---

## Challenge 1: The Gatekeeper (SQL Injection)

### The Vulnerability
The code concatenates user input (`$userId`) directly into the SQL query string. This allows an attacker to manipulate the query structure.

```php
$query = "SELECT username FROM users WHERE id = " . $userId;
```

### Attack (Team Hack)
The goal is to extract the `admin_password` from the `system_config` table. Since the original query only selects one column (`username`), we can use a `UNION SELECT` to append results from another table.

**Possible Payload:**
```text
0 UNION SELECT config_value FROM system_config WHERE config_name = 'admin_password'
```
*Why it works:* The `0` (or any non-existent ID) makes the first part of the union return nothing, while the second part fetches the password.

### Fix (Team Blue)
Never concatenate variables into SQL strings. Use **Prepared Statements** with placeholders.

**The Correct Fix:**
```php
$stmt = $db->prepare("SELECT username FROM users WHERE id = :id");
$stmt->execute(['id' => $userId]);
$result = $stmt->fetchAll();
```

---

## Challenge 2: The Calculator (Code Injection / Eval)

### The Vulnerability
The code uses `eval()` to execute a string as PHP code. While there is a naive filter for the word "flag", it is easily bypassed.

```php
eval("echo " . $expression . ";");
```

### Attack (Team Hack)
The goal is to read the `$flag` variable. Since "flag" is blocked by `preg_match('/flag/i', $expression)`, we must avoid using that literal string.

**Possible Payloads:**
1. **Variable Variables:** `include('php://filter/read=convert.base64-encode/resource=index.php')` (If it were a file, but here we want a variable).
2. **Dynamic Name:** `$f = 'fla'.'g'; echo $$f`
3. **Globals Array:** `$GLOBALS['fla'.'g']`
4. **Hex/Octal Encoding:** `\x66\x6c\x61\x67` (The string "flag" in hex).

### Fix (Team Blue)
The best fix is to **avoid `eval()` entirely**. If mathematical evaluation is needed, use a dedicated math parser library or a very strict whitelist.

**The Minimal Fix (Whitelisting):**
```php
if (!preg_match('/^[0-9+\\-*\/(). ]+$/', $expression)) {
    die("Invalid characters in expression");
}
eval("echo " . $expression . ";");
```

---

## Challenge 3: The File Explorer (Path Traversal)

### The Vulnerability
The code attempts to prevent path traversal by removing `../`, but it does so only once using `str_replace`.

```php
$page = str_replace("../", "", $page);
```

### Attack (Team Hack)
We can use **nested traversal strings**. When the inner `../` is removed, the remaining characters collapse into a new `../`.

**Possible Payload:**
```text
....//config
```
*Process:* `str_replace` finds `../` inside `....//` and removes it, leaving `../` behind. The resulting path becomes `pages/../config.php`, which points to the `config.php` in the base directory.

### Fix (Team Blue)
Use `basename()` to strip all directory information, or validate the resulting path against a real path.

**The Correct Fix:**
```php
$page = basename($page); 
// Or even better:
$requestedPage = realpath($base . "pages/" . $page . ".php");
if ($requestedPage && strpos($requestedPage, $base . "pages/") === 0) {
    include($requestedPage);
}
```

---

## Challenge 4: The Magic Box (Insecure Deserialization)

### The Vulnerability
The code calls `unserialize()` on raw user input. This triggers the `__wakeup()` magic method of the resulting object, which in this case calls a method on a property.

```php
unserialize($data);
```

### Attack (Team Hack)
The goal is to swap the `GuestProfile` with an `AdminProfile`. We need to craft a serialized `User` object where the `profile` property is an instance of `AdminProfile`.

**Original (Guest):**
`O:4:"User":1:{s:7:"profile";O:12:"GuestProfile":0:{}}`

**Attack Payload (Admin):**
`O:4:"User":1:{s:7:"profile";O:12:"AdminProfile":0:{}}`

*How to generate it:*
```php
echo serialize(new User(new AdminProfile()));
```

### Fix (Team Blue)
**Never use `unserialize()` on user-controlled data.** Use `json_decode()` instead. JSON is a data-only format and does not instantiate classes or trigger magic methods.

**The Correct Fix:**
```php
$userData = json_decode($data, true);
// Then manually handle the logic based on the data
if ($userData['role'] === 'admin') {
    // ...
}
```
