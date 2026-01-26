# Premium Bespoke Branding Guide

This document outlines the architecture and implementation steps to achieve a "bespoke" application feel for premium B2B clients (Country Clubs, Private Communities) using the Aavit platform.

## Core Philosophy
The goal is to avoid a "generic white-labeled" look. Instead of just swapping a primary color, we leverage **Design Tokens** and **Dynamic Assets** to change the entire aesthetic (Refinement vs. Modernity, Luxury vs. Utility).

---

## 1. Data Schema (`Organization.settings`)

The `settings` field in the Prisma `Organization` model stores the branding configuration.

```json
{
  "branding": {
    "name": "Royal Oaks Country Club",
    "logo": "https://assets.acme.com/royal-oaks-logo.png",
    "favicon": "https://assets.acme.com/favicon-gold.ico",
    "themes": {
      "light": {
        "primary": "24 60% 35%", // HSL Gold
        "background": "40 20% 98%", // Off-white cream
        "foreground": "20 10% 10%",
        "radius": "0px", // Sharp corners for luxury feel
        "shadow": "0 10px 30px -10px rgba(0,0,0,0.1)"
      }
    },
    "typography": {
      "display": "Cormorant Garamond",
      "sans": "Inter",
      "weights": ["400", "600"]
    },
    "assets": {
      "loginHero": "https://images.unsplash.com/golf-course-premium.jpg",
      "dashboardBanner": "https://images.unsplash.com/club-house.jpg"
    },
    "auth": {
      "googleClientId": "ORG_SPECIFIC_ID",
      "googleClientSecret": "ORG_SPECIFIC_SECRET" // Encrypted at rest
    },
    "customDomain": "members.royaloaks.com"
  }
}
```

---

## 2. Infrastructure: Custom Domains

To make the app feel truly bespoke, each organization can point their own domain (e.g., `members.royaloaks.com`) to your server.

### Middleware Routing (`apps/web/middleware.ts`)
Next.js middleware must intercept requests and map the hostname to the internal organization slug.

```typescript
// Simplified Middleware Logic
const host = request.headers.get('host');
if (host !== 'avith.app') {
  const org = await getOrgByDomain(host); // Map domain to slug
  return NextResponse.rewrite(new URL(`/org/${org.slug}${path}`, request.url));
}
```

---

## 3. Bespoke Auth: Organization-Specific OAuth

To ensure users see "Sign in to Royal Oaks" on the Google consent screen and the URL is their own domain:

1. **Client Setup**: The Super Admin sets up a dedicated Google Cloud Project for the premium client.
2. **Credential Storage**: Store these credentials in the `Organization.settings.auth` block (encrypted).
3. **Dynamic Providers**: Configure NextAuth to dynamically resolve the client ID/secret based on the incoming host.

> [!IMPORTANT]
> This requires each organization to have its own Google Cloud Project to fully own the branding of the "Sign in with Google" screen.

---

## 4. Dynamic Injection (`BrandingProvider`)

Create a client-side provider in `apps/web/components/providers/BrandingProvider.tsx` that:
1. Receives the `branding` object from the server.
2. Injects CSS Variables into the document root.
3. Dynamically loads Google Fonts using standard link tags.

### Implementation Snippet:
```tsx
useEffect(() => {
  const root = document.documentElement;
  const { themes, typography } = branding;
  
  // Set Colors
  root.style.setProperty('--primary', themes.light.primary);
  root.style.setProperty('--radius', themes.light.radius);
  
  // Set Fonts
  root.style.setProperty('--font-display', typography.display);
  root.style.setProperty('--font-sans', typography.sans);
  
  // Load Fonts via Link
  const link = document.createElement('link');
  link.href = `https://fonts.googleapis.com/css2?family=${typography.display.replace(/ /g, '+')}:wght@400;700&display=swap`;
  link.rel = 'stylesheet';
  document.head.appendChild(link);
}, [branding]);
```

---

## 3. Tailwind Integration

Update `tailwind.config.js` to use these variables so that utility classes like `text-primary` or `font-display` automatically adapt.

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: 'hsl(var(--primary))',
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        sans: ['var(--font-sans)', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
      }
    }
  }
}
```

---

## 4. Bespoke Components

### A. The Dynamic Login Page
Instead of a static background, use the `loginHero` URL from the organization settings.
```tsx
const loginHero = org.settings.branding.assets.loginHero;
return (
  <div style={{ backgroundImage: `url(${loginHero})` }} className="bg-cover bg-center h-screen">
    {/* Login Form */}
  </div>
)
```

### B. Logo Customization
The high-quality SVG or PNG logo should be sized correctly based on the org's layout needs (Horizontal vs Stacked) stored in settings.

---

## 5. Super Admin Implementation Flow
Since these changes are bespoke and managed by the Super Admin:

1. **Brand Discovery**: Recieve brand guidelines (HEX, Fonts, Imagery) from the client.
2. **Token Compilation**: Convert HEX to HSL and find matching fonts on Google Fonts.
3. **Database Update**: Execute a direct Prisma update or use a Super-Admin script to patch the `Organization` record.
4. **Validation**: Preview the org's slug (e.g., `avith.com/org/royal-oaks`) to ensure the aesthetic is premium and coherent.
