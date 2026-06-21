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

## Переменные окружения

Скопируйте `.env.example` в `.env.local` и заполните:

```powershell
Copy-Item .env.example .env.local
```

```env
OPENROUTER_API_KEY=ваш_ключ
OPENAI_BASE_URL=https://openrouter.ai/api/v1
HUGGINGFACE_API_KEY=ваш_ключ_hf
HUGGINGFACE_MODEL=black-forest-labs/FLUX.1-schnell
```

Токен Hugging Face должен иметь право **Make calls to Inference Providers** (Inference Providers → hf-inference).

Для production добавьте те же переменные в Vercel → **Settings → Environment Variables** (включая `HUGGINGFACE_API_KEY` для кнопки «Иллюстрация»). Генерация изображений идёт через официальный клиент `@huggingface/inference`.

## Деплой на Vercel

```powershell
pnpm build
npx vercel deploy --prod
```

Production: [https://referent-pi.vercel.app](https://referent-pi.vercel.app)

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
