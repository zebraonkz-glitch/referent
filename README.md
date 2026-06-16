# Referent
PROJECT.MD - описание проекта

Минимальное приложение на [Next.js](https://nextjs.org).

## Запуск

```powershell
pnpm install
pnpm dev
```

Если PowerShell блокирует `pnpm`, используйте:

```powershell
pnpm.cmd install
pnpm.cmd dev
```

Откройте [http://127.0.0.1:3000](http://127.0.0.1:3000) в браузере.

## Если ошибка `@tailwindcss/postcss`

После `git pull` или смены ветки переустановите зависимости:

```powershell
pnpm install
```

Если dev-сервер уже запущен со старой ошибкой, остановите его (`Ctrl+C`) и запустите снова.

## Скрипты

- `pnpm dev` — режим разработки
- `pnpm build` — сборка для production
- `pnpm start` — запуск production-сервера
- `pnpm lint` — проверка ESLint
