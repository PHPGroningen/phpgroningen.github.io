# GroningenPHP — PHP 8.4 & 8.5 Workshop

Hands-on exercises for an evening of playing with the newest PHP features.
Two exercises, four features, one great evening.

- **Exercise 1** (PHP 8.4) — **Forge Your Hero**
  uses *Property Hooks* + *Asymmetric Visibility*
- **Exercise 2** (PHP 8.5) — **The Pancake Builder**
  uses *Pipe Operator* `|>` + *Clone With*

The fancy version of this page lives at [/php-workshop.html](../php-workshop.html) — same content, prettier.

---

## 🚀 Getting PHP 8.5 running (pick one)

You need to run **PHP 8.5**. Ordered from least-work to most-work:

### 1. 3v4l.org (browser, no install) — **recommended for the workshop**

Open <https://3v4l.org>, paste your code, hit **Eval**. It runs every PHP version in parallel; scroll to the `PHP 8.5.x` row to see your output. Make sure the first line is `<?php`.

Pros: zero setup. Cons: no persistence, no REPL, 3-second limit.

### 2. Docker one-liner

```bash
# run a file
docker run --rm -it -v "$PWD":/app -w /app php:8.5-cli php hero.php

# interactive REPL
docker run --rm -it php:8.5-cli php -a
```

### 3. DDEV

If you already use DDEV, bump the PHP version in `.ddev/config.yaml`:

```yaml
php_version: "8.5"
```

Then `ddev restart` and `ddev php hero.php`.

### 4. Native install

- **macOS:** `brew install php@8.5`
- **Ubuntu/Debian:** `sudo add-apt-repository ppa:ondrej/php && sudo apt install php8.5-cli`
- **Windows:** use WSL + the Docker option, or grab a binary from <https://windows.php.net/download/>.

**Sanity check:** `php -v` must say `PHP 8.5.x`. Exercise 2 won't work on 8.4.

---

## 🗡️ Exercise 1 — Forge Your Hero (PHP 8.4)

**Features:** Property Hooks · Asymmetric Visibility

### The setup

You're building a character sheet for a tabletop RPG. The rules are strict:

- HP can never drop below 0 or exceed `maxHp`.
- `fullName` should always reflect the current first and last name.
- Nobody should be able to set XP directly from outside — only the class itself hands out XP.

Below is the *old-school* version. Modernise it with PHP 8.4.

### Starter code

```php
<?php

final class Character
{
    public int $hp;
    public int $maxHp = 10;
    public int $xp = 0;

    public function __construct(
        public string $firstName,
        public string $lastName,
        public int $level = 1,
    ) {
        $this->hp = $this->maxHp;
    }

    public function takeDamage(int $dmg): void
    {
        $this->hp = max(0, $this->hp - $dmg);
    }

    public function heal(int $amount): void
    {
        $this->hp = min($this->maxHp, $this->hp + $amount);
    }

    public function gainXp(int $amount): void
    {
        $this->xp += $amount;
        while ($this->xp >= 100) {
            $this->xp -= 100;
            $this->level++;
            $this->maxHp += 5;
        }
    }
}

$hero = new Character('Aria', 'Stormblade');
echo $hero->firstName . ' ' . $hero->lastName . PHP_EOL; // "Aria Stormblade"

$hero->takeDamage(4);
echo "HP: {$hero->hp}/{$hero->maxHp}" . PHP_EOL;      // 6/10

$hero->hp = 9999;     // 😱 we can just... cheat?
echo "HP: {$hero->hp}" . PHP_EOL;                     // 9999 (bug!)

$hero->xp = 999_999;  // 😱 and cheat XP too?
echo "Level: {$hero->level}, XP: {$hero->xp}" . PHP_EOL;
```

### Your challenges

1. **Virtual property.** Add a `fullName` property with a **get hook** returning `"$firstName $lastName"`. It should always reflect the current first and last name.
2. **Validated setter.** Give `hp` a **set hook** that clamps any assignment to `[0, maxHp]`. Once it works, `takeDamage()` and `heal()` become one-liners — or delete them.
3. **Asymmetric visibility.** Make `xp` `public private(set)` so it's readable from anywhere but only mutable inside the class. The final line of the starter should fail.
4. **🎁 Bonus.** Add an `isAlive` virtual property (get-only) returning `$hp > 0`.
5. **🎁 Bonus bonus.** Add a `level` set hook that bumps `maxHp` by 5 per level gained, and simplify `gainXp()`.

### Hint — property hook syntax

```php
class Foo
{
    // virtual get-only property
    public string $fullName {
        get => "$this->firstName $this->lastName";
    }

    // set hook with validation
    public int $hp {
        set(int $value) => max(0, min($this->maxHp, $value));
    }

    // asymmetric visibility
    public private(set) int $xp = 0;
}
```

### One possible solution

```php
<?php

final class Character
{
    public string $fullName {
        get => "$this->firstName $this->lastName";
    }

    public int $hp {
        set(int $value) => max(0, min($this->maxHp, $value));
    }

    public bool $isAlive {
        get => $this->hp > 0;
    }

    public private(set) int $xp = 0;
    public private(set) int $maxHp = 10;

    public function __construct(
        public string $firstName,
        public string $lastName,
        public int $level = 1,
    ) {
        $this->hp = $this->maxHp;
    }

    public function gainXp(int $amount): void
    {
        $this->xp += $amount;
        while ($this->xp >= 100) {
            $this->xp -= 100;
            $this->level++;
            $this->maxHp += 5;
        }
    }
}
```

### 🧪 Try to break it

- Can you still overflow HP somehow?
- What happens with negative damage?
- What if `maxHp` shrinks while current HP is above the new max?

---

## 🥞 Exercise 2 — The Pancake Builder (PHP 8.5)

**Features:** Pipe Operator `|>` · Clone With

### The setup

You run a small pancake house. Every order is an **immutable** `Pancake` — once placed, you can't mutate it; you clone a new one with the change. Customers build their order step by step: add a topping, size it up, bake it, calculate the bill.

You'll use **clone with** to return new instances without constructor spaghetti, and the **pipe operator** to compose it all into one readable pipeline.

### Starter code

```php
<?php

final class Pancake
{
    public function __construct(
        public readonly string $base = 'plain',
        public readonly array $toppings = [],
        public readonly string $size = 'medium',
        public readonly bool $isBaked = false,
    ) {}

    public function describe(): string
    {
        $t = $this->toppings ? implode(' + ', $this->toppings) : 'no toppings';
        $state = $this->isBaked ? '🔥 cooked' : '🧊 raw batter';
        return "{$this->size} {$this->base} [{$t}] — {$state}";
    }
}

// Today's mission:
//   Build a large 'apple' pancake with 'syrup', 'cinnamon' and 'bacon',
//   bake it, print the description, then print the price.
//   Do it all with |> and `clone with`. No intermediate variables!
```

### Your challenges

1. **Immutable modifiers.** Add three methods using `clone with`:
   - `withTopping(string $t): self` — returns a new pancake with `$t` appended.
   - `withSize(string $s): self` — returns a new pancake at that size.
   - `bake(): self` — returns a baked pancake.
2. **Compose with pipes.** Using only `|>` and your new methods, build today's mission order. No temp variables. End the chain with `->describe()` and echo the result.
3. **Add a bill.** Add `priceEuros(): int`. Rules: base **€6**, **+€1** per topping, **+€3** for `large`, **+€2** if baked. Extend your pipeline to also print the price.
4. **🎁 Bonus — first-class callables.** Use the first-class callable syntax (e.g. `strtoupper(...)`) somewhere in your pipe to transform the description.
5. **🎁 Group ordering.** Make an array of three pancakes and use `array_map()` inside a pipe to print the full menu in one expression.

### Hint — clone with & pipe syntax

```php
// clone with: pass an array of overrides as clone's second argument
public function withTopping(string $t): self
{
    return clone($this, [
        'toppings' => [...$this->toppings, $t],
    ]);
}

// pipe operator: right side is a callable, receives left side as arg.
// Arrow functions on the right of |> must be parenthesized.
$result = new Pancake('apple')
    |> (fn(Pancake $p) => $p->withTopping('syrup'))
    |> (fn(Pancake $p) => $p->bake());
```

### One possible solution

```php
<?php

final class Pancake
{
    public function __construct(
        public readonly string $base = 'plain',
        public readonly array $toppings = [],
        public readonly string $size = 'medium',
        public readonly bool $isBaked = false,
    ) {}

    public function withTopping(string $t): self
    {
        return clone($this, ['toppings' => [...$this->toppings, $t]]);
    }

    public function withSize(string $s): self
    {
        return clone($this, ['size' => $s]);
    }

    public function bake(): self
    {
        return clone($this, ['isBaked' => true]);
    }

    public function priceEuros(): int
    {
        return 6
            + count($this->toppings)
            + ($this->size === 'large' ? 3 : 0)
            + ($this->isBaked ? 2 : 0);
    }

    public function describe(): string
    {
        $t = $this->toppings ? implode(' + ', $this->toppings) : 'no toppings';
        $state = $this->isBaked ? '🔥 cooked' : '🧊 raw batter';
        return "{$this->size} {$this->base} [{$t}] — {$state}";
    }
}

$order = new Pancake('apple')
    |> (fn(Pancake $p) => $p->withTopping('syrup'))
    |> (fn(Pancake $p) => $p->withTopping('cinnamon'))
    |> (fn(Pancake $p) => $p->withTopping('bacon'))
    |> (fn(Pancake $p) => $p->withSize('large'))
    |> (fn(Pancake $p) => $p->bake());

// bonus: first-class callable on a built-in fits naturally on the right of |>
echo ($order->describe() |> strtoupper(...)) . PHP_EOL;
echo '€' . $order->priceEuros() . PHP_EOL;
```

### 🧪 Think about it

- The original object is never mutated — `clone with` creates a new instance.
- Does `clone with` trigger the constructor? (No — it's a shallow clone + mutation.)
- If a readonly property references another object, is the clone deep or shallow?

---

## 📚 Going further

- [PHP 8.4 release notes](https://www.php.net/releases/8.4/en.php)
- [PHP 8.5 release notes](https://www.php.net/releases/8.5/en.php)
- [Property Hooks RFC](https://wiki.php.net/rfc/property-hooks)
- [Asymmetric Visibility RFC](https://wiki.php.net/rfc/asymmetric-visibility-v2)
- [Pipe Operator RFC](https://wiki.php.net/rfc/pipe-operator-v3)
- [Clone With RFC](https://wiki.php.net/rfc/clone_with_v2)

Happy hacking! 🐘
