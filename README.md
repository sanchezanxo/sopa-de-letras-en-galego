# Sopa de letras en galego — As Chaves da Lingua

Reto de 5 minutos: cantas sopas de letras es quen de resolver en galego? En produción en https://sopadeletras.aschavesdalingua.gal.

## Stack

- HTML5 + CSS + JS vanilla (ES6 módulos). Sen build-step.
- PHP 8.1+ procedural con PDO.
- SQLite 3 (esquema dual mantido para MariaDB).
- Tipografías Merriweather + Open Sans, **self-hosted**.

## Desenvolvemento local

```bash
cp api/config.sample.php api/config.php
# Xerar salts e poñelos en api/config.php:
php -r "echo bin2hex(random_bytes(32)).PHP_EOL;"

php db/init.php
php -S localhost:8000 router.php
```

## Despregue á produción

```bash
# Desde a raíz do monorepo
rsync -avz \
  --exclude='.git/' --exclude='.gitignore' \
  --exclude='.claude/' --exclude='CLAUDE.md' --exclude='README.md' \
  --exclude='api/config.php' \
  --exclude='db/sopa.sqlite*' \
  --exclude='router.php' \
  --exclude='*.log' --exclude='.DS_Store' \
  ./sopa-de-letras/ usuario@servidor:sopadeletras.aschavesdalingua.gal/
```

No servidor (primeira vez):

```bash
ssh usuario@servidor
cd sopadeletras.aschavesdalingua.gal
cp api/config.sample.php api/config.php
# editar: env=production, salts aleatorios, origen_permitido https
chmod 600 api/config.php
php db/init.php
```

## Mecánicas

- 5 minutos en total.
- Sopa 10×10. Palabras horizontais e verticais (sen diagonais), en calquera sentido.
- Progresión gradual: 5 → 6 → 7 → 8 palabras por sopa.
- Puntuación: 10 pts/letra, 100 por sopa, 50 por sopa perfecta, bonus por tempo restante e multiplicador de racha.

## Licenza

- Código: GPL-3.0.
- Base léxica: CC BY-NC 4.0.
