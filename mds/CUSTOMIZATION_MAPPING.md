# Customization System - CSS Variable Mapping

## How Admin Settings Map to CSS Variables

### 1. **Primary Color System**
```typescript
// Admin Setting: primaryColor
primaryColor: "#3b82f6" // Blue-500
```
**Maps to CSS Variables:**
```css
--primary: 217 91% 60%;           /* Calculated from hex */
--primary-hover: 217 91% 55%;     /* Auto-generated darker */
--primary-active: 217 91% 50%;    /* Auto-generated darkest */
--primary-foreground: 0 0% 98%;   /* Auto-calculated contrast */
```

### 2. **Secondary Color System**
```typescript
// Admin Setting: secondaryColor  
secondaryColor: "#6b7280" // Gray-500
```
**Maps to CSS Variables:**
```css
--secondary: 220 14% 41%;         /* Calculated from hex */
--secondary-hover: 220 14% 36%;   /* Auto-generated darker */
--secondary-active: 220 14% 31%;  /* Auto-generated darkest */
--secondary-foreground: 0 0% 98%; /* Auto-calculated contrast */
```

### 3. **Accent Color System**
```typescript
// Admin Setting: accentColor
accentColor: "#f59e0b" // Amber-500
```
**Maps to CSS Variables:**
```css
--accent: 38 92% 50%;             /* Calculated from hex */
--accent-hover: 38 92% 45%;       /* Auto-generated darker */
--accent-foreground: 0 0% 9%;     /* Auto-calculated contrast */
```

### 4. **Semantic Colors**
```typescript
// Admin Settings
successColor: "#10b981"  // Emerald-500
warningColor: "#f59e0b"  // Amber-500  
errorColor: "#ef4444"    // Red-500
```
**Maps to CSS Variables:**
```css
--success: 160 84% 39%;
--success-hover: 160 84% 34%;
--success-foreground: 0 0% 98%;

--warning: 38 92% 50%;
--warning-hover: 38 92% 45%;
--warning-foreground: 0 0% 9%;

--destructive: 0 84% 60%;
--destructive-hover: 0 84% 55%;
--destructive-foreground: 0 0% 98%;
```

### 5. **Background & Surface Colors**
```typescript
// Admin Settings
backgroundColor: "#ffffff"    // Light mode main bg
surfaceColor: "#f9fafb"      // Cards, modals
borderColor: "#e5e7eb"       // Borders, dividers
```
**Maps to CSS Variables:**
```css
--background: 0 0% 100%;
--card: 210 40% 98%;
--border: 220 13% 91%;
--input: 220 13% 91%;
```

### 6. **Typography System**
```typescript
// Admin Settings
fontFamily: "Inter, sans-serif"
headingFontFamily: "Inter, sans-serif" // Optional
fontSize: "normal" // compact | normal | comfortable
fontWeight: "normal" // light | normal | medium | bold
```
**Maps to CSS Variables:**
```css
--font-family-sans: Inter, ui-sans-serif, system-ui, sans-serif;
--font-family-heading: Inter, ui-sans-serif, system-ui, sans-serif;

/* Font Size Scales */
--font-size-xs: 0.75rem;      /* 12px */
--font-size-sm: 0.875rem;     /* 14px */
--font-size-base: 1rem;       /* 16px */
--font-size-lg: 1.125rem;     /* 18px */
--font-size-xl: 1.25rem;      /* 20px */

/* Typography Scale Modifiers */
.font-scale-compact {
  --font-size-multiplier: 0.9;
}
.font-scale-comfortable {
  --font-size-multiplier: 1.1;
}
```

### 7. **Layout & Spacing**
```typescript
// Admin Settings
borderRadius: "medium"    // none | small | medium | large
spacing: "normal"         // compact | normal | spacious
shadowIntensity: "normal" // none | subtle | normal | strong
```
**Maps to CSS Variables:**
```css
/* Border Radius Scales */
--radius-none: 0px;
--radius-sm: 0.125rem;      /* 2px */
--radius-md: 0.375rem;      /* 6px */
--radius-lg: 0.5rem;        /* 8px */
--radius-xl: 0.75rem;       /* 12px */

/* Spacing Scales */
--spacing-xs: 0.25rem;      /* 4px */
--spacing-sm: 0.5rem;       /* 8px */
--spacing-md: 1rem;         /* 16px */
--spacing-lg: 1.5rem;       /* 24px */
--spacing-xl: 2rem;         /* 32px */

/* Shadow Scales */
--shadow-none: none;
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
```

## Implementation Strategy

### 1. **Color Conversion Utilities**
```typescript
// Convert hex to HSL for CSS variables
function hexToHsl(hex: string): string {
  // Implementation to convert #3b82f6 → "217 91% 60%"
}

// Auto-generate hover/active states
function generateColorVariants(baseHsl: string): {
  hover: string;
  active: string;
  foreground: string;
} {
  // Implementation to generate darker variants and contrast colors
}
```

### 2. **CSS Variable Injection**
```typescript
// Inject custom CSS variables dynamically
function applyCustomTheme(customization: ThemeCustomization) {
  const root = document.documentElement;
  
  // Apply primary colors
  const primaryHsl = hexToHsl(customization.primaryColor);
  const primaryVariants = generateColorVariants(primaryHsl);
  
  root.style.setProperty('--primary', primaryHsl);
  root.style.setProperty('--primary-hover', primaryVariants.hover);
  root.style.setProperty('--primary-foreground', primaryVariants.foreground);
  
  // Apply other customizations...
}
```

### 3. **Dark Mode Handling**
```typescript
interface ThemeCustomization {
  // Light mode colors
  light: ColorCustomization;
  
  // Dark mode colors (auto-generated or custom)
  dark?: ColorCustomization;
  
  // Global settings
  typography: TypographyCustomization;
  layout: LayoutCustomization;
}
```

### 4. **Validation & Accessibility**
```typescript
// Ensure WCAG compliance
function validateColorContrast(
  foreground: string, 
  background: string
): boolean {
  // Check if contrast ratio meets WCAG AA standards (4.5:1)
}

// Provide accessible alternatives
function ensureAccessibility(customization: ThemeCustomization): ThemeCustomization {
  // Auto-adjust colors if they don't meet accessibility standards
}
```

## Database Schema

```typescript
interface OrganizationTheme {
  id: string;
  organizationId: string;
  
  // Colors
  primaryColor: string;
  secondaryColor?: string;
  accentColor?: string;
  successColor?: string;
  warningColor?: string;
  errorColor?: string;
  backgroundColor?: string;
  surfaceColor?: string;
  borderColor?: string;
  
  // Typography  
  fontFamily: string;
  headingFontFamily?: string;
  fontSizeScale: 'compact' | 'normal' | 'comfortable';
  fontWeightDefault: 'light' | 'normal' | 'medium' | 'bold';
  
  // Layout
  borderRadiusScale: 'none' | 'small' | 'medium' | 'large';
  spacingScale: 'compact' | 'normal' | 'spacious';
  shadowIntensity: 'none' | 'subtle' | 'normal' | 'strong';
  
  // Branding
  logoUrl?: string;
  logoUrlDark?: string;
  companyName: string;
  faviconUrl?: string;
  
  // Meta
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}
```

This mapping provides a complete system for translating admin customization preferences into our existing CSS variable architecture while maintaining design consistency and accessibility standards.