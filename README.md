# Garmin Health Dashboard

**English** · [Español](#español)

A personal health dashboard that connects to Garmin Connect and displays your daily metrics in a clean, mobile-first interface. Works with demo data if no credentials are configured.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/git/external?repository-url=https%3A%2F%2Fgithub.com%2FJJRPF%2Fgarmin-health-dashboard-gemini&env=GARMIN_USERNAME,GARMIN_PASSWORD,ANTHROPIC_API_KEY,GOOGLE_API_KEY&envDescription=Garmin%20Connect%20and%20AI%20credentials.%20These%20can%20also%20be%20set%20directly%20in%20the%20app%20settings.&project-name=garmin-health-dashboard)

> **Auto-updates:** deploying with this button connects your Vercel project directly to this repository. When a new version is released, Vercel redeploys your instance automatically — no action needed on your end.

---

## Screenshots

| Dashboard | Sleep & HRV | Strain & Stress |
|-----------|-------------|-----------------|
| ![Dashboard](docs/screenshots/01-dashboard.jpeg) | ![Sleep & HRV](docs/screenshots/02-cards.jpeg) | ![Strain & Stress](docs/screenshots/03-strain-stress.jpeg) |

---

## What it does

| Screen | Metrics |
|--------|---------|
| **Dashboard** | Recovery score, HRV, Sleep, Body Battery, Strain, Stress, Steps, Calories |
| **Sleep** | Sleep stages (Deep / REM / Light / Awake), SpO₂, overnight HRV, 7-day trend |
| **Strain** | Daily strain (0–21 scale), ACWR load ratio, activities breakdown |
| **Trends** | 7 / 14 / 30-day sparklines, weekly AI summary (optional), PDF export |
| **Profile** | BMI, VO2max estimate, training zones, weight log |
| **Settings** | Configure Garmin credentials, MFA/2FA tokens, and AI Providers directly in the app |

**Key features**
- 🌐 English / Spanish toggle (auto-detects browser language)
- 🤖 AI weekly summary via **Claude Haiku** or **Google Gemini** (optional — requires API keys)
- ⚙️ **Settings UI**: Manage your Garmin credentials (including **MFA/2FA tokens**) and AI provider directly from the browser
- 📱 Installable PWA (iOS Safari & Android Chrome)
- 🔔 Body Battery push notifications
- 🎭 Full demo mode — works without Garmin credentials
- 🔒 No database — all personal data stays in your browser (localStorage)

---

## Tech stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Garmin**: `garmin-connect` npm package
- **AI**: Anthropic Claude Haiku & Google Gemini (optional)

---

## Deploy your own

### Option A — One-click (Vercel)

Click the **Deploy with Vercel** button above. You can leave credentials empty and configure everything later via the **Settings** page in the app.

### Option B — Manual deploy

```bash
# 1. Clone
git clone https://github.com/JJRPF/garmin-health-dashboard-gemini.git
cd garmin-health-dashboard-gemini

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local with your credentials (all optional, can be set in-app)

# 4. Run locally
npm run dev
# → http://localhost:3000

# 5. Deploy to Vercel
npx vercel deploy --prod
```

---

## Garmin MFA / 2-Factor Authentication

If Garmin sends you a verification code by email when you sign in, you need to generate OAuth tokens once using the included script:

```bash
node scripts/get-garmin-tokens.js
```

1. Run the script and follow the prompts.
2. Copy the resulting `GARMIN_OAUTH1` and `GARMIN_OAUTH2` JSON strings.
3. Paste them into the **Settings** page of your deployed app.

---

## Privacy

- Garmin credentials can be stored **either** in your server environment (Vercel env vars) or **directly in your browser** (localStorage via the Settings page).
- Health data is fetched server-side and never persisted.
- Profile, weight log, and preferences are stored in **your browser's localStorage only**.
- No analytics, no tracking, no third-party data collection.

---

## License

MIT © 2025 — free to use, modify, and distribute. See [LICENSE](LICENSE).

---

## Support

This project is free and open-source. If it's useful to you and you'd like to say thanks, you can buy me a coffee ☕

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-support%20the%20project-yellow?logo=buy-me-a-coffee)](https://buymeacoffee.com/cggmx)

---

# Español

Dashboard personal de salud que se conecta a Garmin Connect y muestra tus métricas diarias en una interfaz móvil limpia. Funciona con datos demo si no hay credenciales configuradas.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/git/external?repository-url=https%3A%2F%2Fgithub.com%2FJJRPF%2Fgarmin-health-dashboard-gemini&env=GARMIN_USERNAME,GARMIN_PASSWORD,ANTHROPIC_API_KEY,GOOGLE_API_KEY&envDescription=Credenciales%20de%20Garmin%20y%20IA.%20También%20pueden%20configurarse%20directamente%20en%20los%20ajustes%20de%20la%20app.&project-name=garmin-health-dashboard)

---

## Qué hace

| Pantalla | Métricas |
|----------|----------|
| **Dashboard** | Recuperación, HRV, Sueño, Body Battery, Esfuerzo, Estrés, Pasos, Calorías |
| **Sueño** | Fases del sueño (Profundo / REM / Ligero / Despierto), SpO₂, HRV nocturno, tendencia 7d |
| **Esfuerzo** | Esfuerzo diario (escala 0–21), ratio ACWR, desglose de actividades |
| **Tendencias** | Sparklines 7 / 14 / 30 días, resumen IA semanal (opcional), exportación PDF |
| **Perfil** | IMC, estimación VO2max, zonas de entrenamiento, registro de peso |
| **Ajustes** | Configura credenciales de Garmin, tokens MFA/2FA y proveedores de IA directamente en la app |

**Características principales**
- 🌐 Toggle inglés / español (detecta el idioma del navegador automáticamente)
- 🤖 Resumen semanal IA con **Claude Haiku** o **Google Gemini** (opcional — requiere API keys)
- ⚙️ **Panel de Ajustes**: Gestiona tus credenciales de Garmin (incluyendo **tokens MFA/2FA**) y proveedor de IA directamente en el navegador.
- 📱 PWA instalable (iOS Safari y Android Chrome)
- 🔔 Notificaciones push de Body Battery
- 🎭 Modo demo completo — funciona sin credenciales de Garmin
- 🔒 Sin base de datos — todos los datos personales quedan en tu navegador (localStorage)

---

## Garmin MFA / Verificación en dos pasos

Si Garmin te envía un código por correo al iniciar sesión, necesitas generar tokens OAuth una sola vez con el script incluido:

```bash
node scripts/get-garmin-tokens.js
```

1. Ejecuta el script y sigue los pasos.
2. Copia los strings JSON resultantes de `GARMIN_OAUTH1` y `GARMIN_OAUTH2`.
3. Pégalos en la página de **Ajustes** de tu app desplegada.

---

## Licencia

MIT © 2025 — libre de usar, modificar y distribuir. Ver [LICENSE](LICENSE).

---

## Apoya el proyecto

Esta app es gratuita y de código abierto. Si te es útil y quieres agradecerlo, puedes invitarme un café ☕

[![Invítame un café](https://img.shields.io/badge/Invítame%20un%20café-apoya%20el%20proyecto-yellow?logo=buy-me-a-coffee)](https://buymeacoffee.com/cggmx)
