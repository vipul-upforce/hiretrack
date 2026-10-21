export type ErrorPageTemplateId = 'organization-spotlight';

export interface ErrorPageTemplate {
  id: ErrorPageTemplateId;
  name: string;
  description: string;
  previewTint: string;
  html: string;
}

export const errorPageTemplates: ErrorPageTemplate[] = [
  {
    id: 'organization-spotlight',
    name: 'Organization Spotlight',
    description: 'Personalized with your organization name and brand colors.',
    previewTint: 'linear-gradient(135deg, #3b82f6, #22c55e)',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="org:name" content="{{ORG_NAME}}" />
  <meta name="org:primary" content="{{PRIMARY_COLOR}}" />
  <meta name="org:secondary" content="{{SECONDARY_COLOR}}" />
  <meta name="org:tagline" content="{{ORG_TAGLINE}}" />
  <title>Under Maintenance</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Urbanist:wght@400;600;700&display=swap');
    :root {
      --brand: {{PRIMARY_COLOR}};
      --brand-2: {{SECONDARY_COLOR}};
      --ink: #0f172a;
      --muted: #475569;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Urbanist', sans-serif;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: linear-gradient(150deg, #f8fafc 0%, #eef2ff 55%, var(--brand-2) 120%);
      color: var(--ink);
      padding: 24px 0;
    }
    main {
      position: relative;
      max-width: 520px;
      width: min(90vw, 520px);
      padding: 34px 30px;
      border-radius: 20px;
      background: #ffffff;
      border: 1px solid rgba(15, 23, 42, 0.08);
      box-shadow: 0 18px 50px rgba(15, 23, 42, 0.16);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      border-radius: 999px;
      border: 1px solid var(--brand);
      color: var(--brand);
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      font-size: 11px;
    }
    h1 {
      margin-top: 16px;
      font-size: 30px;
    }
    .subtitle {
      margin-top: 6px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      color: var(--brand);
      font-weight: 700;
    }
    p {
      margin-top: 10px;
      color: var(--muted);
      line-height: 1.6;
      font-size: 15px;
    }
    .actions {
      margin-top: 18px;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .actions a {
      text-decoration: none;
      font-weight: 600;
      padding: 10px 16px;
      border-radius: 10px;
      display: inline-flex;
      align-items: center;
      border: 1px solid var(--brand);
      color: var(--brand);
    }
    .meta {
      margin-top: 14px;
      font-size: 12px;
      color: #64748b;
    }
    @media (max-width: 640px) {
      main { padding: 28px 20px; border-radius: 18px; }
      h1 { font-size: 26px; }
      p { font-size: 14px; }
      .actions { flex-direction: column; }
      .actions a { width: 100%; justify-content: center; }
    }
  </style>
</head>
<body>
  <main>
    <span class="badge">502 - Bad Gateway</span>
    <h1>{{ORG_NAME}} is undergoing maintenance.</h1>
    <div class="subtitle">Site under maintenance</div>
    <p>{{ORG_TAGLINE}}</p>
    <div class="actions">
      <a href="mailto:{{SUPPORT_EMAIL}}">Contact support</a>
    </div>
    <div class="meta">We'll be back shortly with a smoother experience.</div>
  </main>
</body>
</html>`,
  },
];

export const DEFAULT_ERROR_PAGE_HTML = errorPageTemplates[0]?.html ?? '';

export const getErrorPageTemplate = (id: ErrorPageTemplateId) =>
  errorPageTemplates.find((template) => template.id === id);
