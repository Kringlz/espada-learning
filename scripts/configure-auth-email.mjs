// Настраивает отправку писем регистрации в боевом проекте Supabase:
// свой SMTP (иначе встроенный почтовик Supabase шлёт письма только участникам
// команды проекта и не больше пары в час), шаблон письма с кодом, адреса сайта.
//
// Запуск (PowerShell):
//   $env:SUPABASE_ACCESS_TOKEN="sbp_..."      # supabase.com/dashboard/account/tokens
//   $env:SMTP_USER="you@gmail.com"
//   $env:SMTP_PASS="abcd efgh ijkl mnop"       # пароль приложения Google
//   $env:SITE_URL="https://kringlz.github.io/espada-learning/"
//   node scripts/configure-auth-email.mjs
//
// Необязательно: SMTP_HOST (smtp.gmail.com), SMTP_PORT (465), SMTP_FROM
// (= SMTP_USER), SMTP_SENDER_NAME (Espada), SUPABASE_PROJECT_REF,
// EXTRA_REDIRECT_URLS (через запятую).
import { readFileSync } from "node:fs";

const env = process.env;
const need = (k) => {
  if (!env[k]) {
    console.error(`Не задана переменная окружения ${k}.`);
    process.exit(1);
  }
  return env[k];
};
const token = need("SUPABASE_ACCESS_TOKEN");
const smtpUser = need("SMTP_USER");
const smtpPass = need("SMTP_PASS");
const siteUrl = need("SITE_URL");
const ref =
  env.SUPABASE_PROJECT_REF ??
  readFileSync(new URL("../supabase/.temp/project-ref", import.meta.url), "utf8").trim();
const template = readFileSync(
  new URL("../supabase/templates/confirmation.html", import.meta.url),
  "utf8",
);
const redirects = [
  siteUrl,
  siteUrl.replace(/\/?$/, "/**"),
  "http://localhost:8081/**",
  "espada://**",
  ...(env.EXTRA_REDIRECT_URLS ?? "").split(",").map((s) => s.trim()),
].filter(Boolean);

const body = {
  site_url: siteUrl,
  uri_allow_list: [...new Set(redirects)].join(","),
  external_email_enabled: true,
  mailer_autoconfirm: false,
  mailer_otp_length: 6,
  smtp_host: env.SMTP_HOST ?? "smtp.gmail.com",
  smtp_port: env.SMTP_PORT ?? "465",
  smtp_user: smtpUser,
  smtp_pass: smtpPass,
  smtp_admin_email: env.SMTP_FROM ?? smtpUser,
  smtp_sender_name: env.SMTP_SENDER_NAME ?? "Espada",
  smtp_max_frequency: 60,
  rate_limit_email_sent: 100,
  mailer_subjects_confirmation: "Espada: код подтверждения",
  mailer_templates_confirmation_content: template,
};

const res = await fetch(
  `https://api.supabase.com/v1/projects/${ref}/config/auth`,
  {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  },
);
if (!res.ok) {
  console.error(`Ошибка ${res.status}: ${await res.text()}`);
  process.exit(1);
}
const saved = await res.json();
console.log(`Готово. Проект ${ref}:`);
console.log(`  SMTP: ${saved.smtp_host}:${saved.smtp_port} от ${saved.smtp_admin_email}`);
console.log(`  Site URL: ${saved.site_url}`);
console.log(`  Redirect URLs: ${saved.uri_allow_list}`);
console.log(`  Лимит писем в час: ${saved.rate_limit_email_sent}`);
