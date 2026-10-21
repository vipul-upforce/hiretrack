'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import {
  useGetPortalConfigsQuery,
  useGetErrorPageTemplateQuery,
  useUpdateErrorPageTemplateMutation,
} from '@/lib/features/settings';
import { errorPageTemplates } from '../constants';

const DEFAULT_TEMPLATE_HTML = errorPageTemplates[0]?.html ?? '';
const DEFAULT_SUPPORT_EMAIL = 'support@example.com';
const DEFAULT_ORG_NAME = 'Your organization';
const DEFAULT_ORG_TAGLINE =
  'We are performing scheduled maintenance. Please check back soon.';
const DEFAULT_PRIMARY_COLOR = '#3b82f6';
const DEFAULT_SECONDARY_COLOR = '#22c55e';

const SUPPORT_EMAIL_TOKEN = '{{SUPPORT_EMAIL}}';
const ORG_NAME_TOKEN = '{{ORG_NAME}}';
const ORG_TAGLINE_TOKEN = '{{ORG_TAGLINE}}';
const PRIMARY_COLOR_TOKEN = '{{PRIMARY_COLOR}}';
const SECONDARY_COLOR_TOKEN = '{{SECONDARY_COLOR}}';

const emailPattern = /mailto:([^"']+)/i;
const mailtoPattern = /mailto:[^"']+/gi;
const basicEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const colorPattern = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

type TemplateValues = {
  supportEmail: string;
  orgName: string;
  orgTagline: string;
  primaryColor: string;
  secondaryColor: string;
};

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const replaceAllLiteral = (source: string, search: string, replacement: string) =>
  search
    ? source.replace(new RegExp(escapeRegExp(search), 'g'), replacement)
    : source;

const replaceMetaContent = (html: string, name: string, content: string) => {
  const metaRegex = new RegExp(
    `(<meta\\s+name=["']${name}["']\\s+content=["'])([^"']*)(["'][^>]*>)`,
    'i',
  );
  if (!metaRegex.test(html)) return html;
  return html.replace(metaRegex, `$1${content}$3`);
};

const extractSupportEmail = (html: string) => {
  const match = html.match(emailPattern);
  if (!match?.[1]) return '';
  return match[1].replace(/^mailto:/i, '').trim();
};

const extractMetaContent = (html: string, name: string) => {
  const regex = new RegExp(
    `<meta\\s+name=["']${name}["']\\s+content=["']([^"']*)["']`,
    'i',
  );
  const match = html.match(regex);
  return match?.[1]?.trim() ?? '';
};

const normalizeColor = (value: string, fallback: string) => {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  if (!colorPattern.test(trimmed)) return fallback;
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
};

const injectTemplateValues = (html: string, values: TemplateValues) =>
  html
    .replaceAll(SUPPORT_EMAIL_TOKEN, values.supportEmail)
    .replaceAll(ORG_NAME_TOKEN, values.orgName)
    .replaceAll(ORG_TAGLINE_TOKEN, values.orgTagline)
    .replaceAll(PRIMARY_COLOR_TOKEN, values.primaryColor)
    .replaceAll(SECONDARY_COLOR_TOKEN, values.secondaryColor)
    .replace(mailtoPattern, `mailto:${values.supportEmail}`);

const applyPersonalization = (
  html: string,
  nextValues: TemplateValues,
  prevValues?: TemplateValues | null,
) => {
  let updated = injectTemplateValues(html, nextValues);

  updated = replaceMetaContent(updated, 'org:name', nextValues.orgName);
  updated = replaceMetaContent(updated, 'org:primary', nextValues.primaryColor);
  updated = replaceMetaContent(updated, 'org:secondary', nextValues.secondaryColor);
  updated = replaceMetaContent(updated, 'org:tagline', nextValues.orgTagline);

  if (prevValues) {
    if (prevValues.supportEmail !== nextValues.supportEmail) {
      updated = replaceAllLiteral(
        updated,
        prevValues.supportEmail,
        nextValues.supportEmail,
      );
    }
    if (prevValues.orgName !== nextValues.orgName) {
      updated = replaceAllLiteral(updated, prevValues.orgName, nextValues.orgName);
    }
    if (prevValues.orgTagline !== nextValues.orgTagline) {
      updated = replaceAllLiteral(
        updated,
        prevValues.orgTagline,
        nextValues.orgTagline,
      );
    }
    if (prevValues.primaryColor !== nextValues.primaryColor) {
      updated = replaceAllLiteral(
        updated,
        prevValues.primaryColor,
        nextValues.primaryColor,
      );
    }
    if (prevValues.secondaryColor !== nextValues.secondaryColor) {
      updated = replaceAllLiteral(
        updated,
        prevValues.secondaryColor,
        nextValues.secondaryColor,
      );
    }
  }

  return updated;
};

const areValuesEqual = (a: TemplateValues, b: TemplateValues) =>
  a.supportEmail === b.supportEmail &&
  a.orgName === b.orgName &&
  a.orgTagline === b.orgTagline &&
  a.primaryColor === b.primaryColor &&
  a.secondaryColor === b.secondaryColor;

export function useErrorPageEditor() {
  const { toast } = useToast();
  const { data: portalConfigs } = useGetPortalConfigsQuery();
  const {
    data: errorPageData,
    isLoading: isTemplateLoading,
    error: templateError,
    refetch: refetchTemplate,
  } = useGetErrorPageTemplateQuery();
  const [updateErrorPageTemplate, { isLoading: isSaving }] =
    useUpdateErrorPageTemplateMutation();
  const [customHtml, setCustomHtml] = useState('');
  const [supportEmail, setSupportEmail] = useState(DEFAULT_SUPPORT_EMAIL);
  const [orgName, setOrgName] = useState(DEFAULT_ORG_NAME);
  const [orgTagline, setOrgTagline] = useState(DEFAULT_ORG_TAGLINE);
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY_COLOR);
  const [secondaryColor, setSecondaryColor] = useState(DEFAULT_SECONDARY_COLOR);
  const [hasUserEditedOrg, setHasUserEditedOrg] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const debouncedSupportEmail = useDebounce(supportEmail, 1000);
  const debouncedOrgName = useDebounce(orgName, 1000);
  const debouncedOrgTagline = useDebounce(orgTagline, 1000);
  const debouncedPrimaryColor = useDebounce(primaryColor, 1000);
  const debouncedSecondaryColor = useDebounce(secondaryColor, 1000);

  const lastInjectedRef = useRef<TemplateValues | null>(null);

  const debouncedValues = useMemo<TemplateValues>(() => {
    const normalizedEmail =
      debouncedSupportEmail.trim() || DEFAULT_SUPPORT_EMAIL;
    const resolvedOrgName = debouncedOrgName.trim() || DEFAULT_ORG_NAME;
    const resolvedTagline = debouncedOrgTagline.trim() || DEFAULT_ORG_TAGLINE;
    const resolvedPrimary = normalizeColor(
      debouncedPrimaryColor,
      DEFAULT_PRIMARY_COLOR,
    );
    const resolvedSecondary = normalizeColor(
      debouncedSecondaryColor,
      DEFAULT_SECONDARY_COLOR,
    );
    return {
      supportEmail: normalizedEmail,
      orgName: resolvedOrgName,
      orgTagline: resolvedTagline,
      primaryColor: resolvedPrimary,
      secondaryColor: resolvedSecondary,
    };
  }, [
    debouncedSupportEmail,
    debouncedOrgName,
    debouncedOrgTagline,
    debouncedPrimaryColor,
    debouncedSecondaryColor,
  ]);

  const previewHtml = useMemo(() => {
    return injectTemplateValues(customHtml, debouncedValues);
  }, [customHtml, debouncedValues]);

  useEffect(() => {
    if (isTemplateLoading) return;

    if (templateError) {
      setCustomHtml(DEFAULT_TEMPLATE_HTML);
      setSupportEmail(DEFAULT_SUPPORT_EMAIL);
      setOrgName(DEFAULT_ORG_NAME);
      setOrgTagline(DEFAULT_ORG_TAGLINE);
      setPrimaryColor(DEFAULT_PRIMARY_COLOR);
      setSecondaryColor(DEFAULT_SECONDARY_COLOR);
      lastInjectedRef.current = {
        supportEmail: DEFAULT_SUPPORT_EMAIL,
        orgName: DEFAULT_ORG_NAME,
        orgTagline: DEFAULT_ORG_TAGLINE,
        primaryColor: DEFAULT_PRIMARY_COLOR,
        secondaryColor: DEFAULT_SECONDARY_COLOR,
      };
      setIsLoading(false);
      return;
    }

    const html = errorPageData?.html;
    if (!html) {
      setCustomHtml(DEFAULT_TEMPLATE_HTML);
      setSupportEmail(DEFAULT_SUPPORT_EMAIL);
      setOrgName(DEFAULT_ORG_NAME);
      setOrgTagline(DEFAULT_ORG_TAGLINE);
      setPrimaryColor(DEFAULT_PRIMARY_COLOR);
      setSecondaryColor(DEFAULT_SECONDARY_COLOR);
      lastInjectedRef.current = {
        supportEmail: DEFAULT_SUPPORT_EMAIL,
        orgName: DEFAULT_ORG_NAME,
        orgTagline: DEFAULT_ORG_TAGLINE,
        primaryColor: DEFAULT_PRIMARY_COLOR,
        secondaryColor: DEFAULT_SECONDARY_COLOR,
      };
      setIsLoading(false);
      return;
    }

    setCustomHtml(html);
    const detectedEmail = extractSupportEmail(html);
    const detectedOrgName = extractMetaContent(html, 'org:name');
    const detectedPrimary = extractMetaContent(html, 'org:primary');
    const detectedSecondary = extractMetaContent(html, 'org:secondary');
    const detectedTagline = extractMetaContent(html, 'org:tagline');

    const resolvedSupport = detectedEmail?.trim() || DEFAULT_SUPPORT_EMAIL;
    const resolvedOrgName = detectedOrgName || DEFAULT_ORG_NAME;
    const resolvedPrimary = detectedPrimary || DEFAULT_PRIMARY_COLOR;
    const resolvedSecondary = detectedSecondary || DEFAULT_SECONDARY_COLOR;
    const resolvedTagline = detectedTagline || DEFAULT_ORG_TAGLINE;

    setSupportEmail(resolvedSupport);
    setOrgName(resolvedOrgName);
    setPrimaryColor(resolvedPrimary);
    setSecondaryColor(resolvedSecondary);
    setOrgTagline(resolvedTagline);
    lastInjectedRef.current = {
      supportEmail: resolvedSupport,
      orgName: resolvedOrgName,
      orgTagline: resolvedTagline,
      primaryColor: resolvedPrimary,
      secondaryColor: resolvedSecondary,
    };
    setIsLoading(false);
  }, [errorPageData?.html, isTemplateLoading, templateError]);

  useEffect(() => {
    if (!portalConfigs || hasUserEditedOrg) return;
    setOrgName((prev) =>
      prev === DEFAULT_ORG_NAME ? portalConfigs.portalName || prev : prev,
    );
    setPrimaryColor((prev) =>
      prev === DEFAULT_PRIMARY_COLOR
        ? portalConfigs.primaryColor || prev
        : prev,
    );
    setSecondaryColor((prev) =>
      prev === DEFAULT_SECONDARY_COLOR
        ? portalConfigs.secondaryColor || prev
        : prev,
    );
  }, [portalConfigs, hasUserEditedOrg]);

  useEffect(() => {
    if (!customHtml) return;

    const previous = lastInjectedRef.current;
    const hasTokens =
      customHtml.includes(SUPPORT_EMAIL_TOKEN) ||
      customHtml.includes(ORG_NAME_TOKEN) ||
      customHtml.includes(ORG_TAGLINE_TOKEN) ||
      customHtml.includes(PRIMARY_COLOR_TOKEN) ||
      customHtml.includes(SECONDARY_COLOR_TOKEN);

    if (previous && areValuesEqual(previous, debouncedValues) && !hasTokens) {
      return;
    }

    const updated = applyPersonalization(customHtml, debouncedValues, previous);
    if (updated !== customHtml) {
      setCustomHtml(updated);
    }
    lastInjectedRef.current = debouncedValues;
  }, [customHtml, debouncedValues]);

  const saveHtml = useCallback(
    async (html: string) => {
      if (!html || html.trim().length < 20) {
        toast({
          title: 'Invalid HTML',
          description: 'Please provide a valid HTML document before saving.',
          variant: 'destructive',
        });
        return false;
      }

      const normalizedEmail = supportEmail.trim();

      if (!basicEmailPattern.test(normalizedEmail)) {
        toast({
          title: 'Invalid support email',
          description: 'Please enter a valid email address.',
          variant: 'destructive',
        });
        return false;
      }

      const resolvedOrgName = orgName.trim() || DEFAULT_ORG_NAME;
      const resolvedTagline = orgTagline.trim() || DEFAULT_ORG_TAGLINE;
      const resolvedPrimary = normalizeColor(primaryColor, DEFAULT_PRIMARY_COLOR);
      const resolvedSecondary = normalizeColor(
        secondaryColor,
        DEFAULT_SECONDARY_COLOR,
      );

      const resolvedHtml = injectTemplateValues(html, {
        supportEmail: normalizedEmail,
        orgName: resolvedOrgName,
        orgTagline: resolvedTagline,
        primaryColor: resolvedPrimary,
        secondaryColor: resolvedSecondary,
      });

      try {
        await updateErrorPageTemplate({ html: resolvedHtml }).unwrap();

        toast({
          title: 'Saved',
          description:
            'Your 502 error page has been saved to public/templates/502.html.',
        });
        refetchTemplate();
        return true;
      } catch {
        toast({
          title: 'Save failed',
          description: 'Unable to save the 502 page. Please try again.',
          variant: 'destructive',
        });
        return false;
      }
    },
    [
      toast,
      supportEmail,
      orgName,
      orgTagline,
      primaryColor,
      secondaryColor,
      updateErrorPageTemplate,
      refetchTemplate,
    ],
  );

  const saveCurrent = useCallback(async () => {
    if (!customHtml) return false;
    return saveHtml(customHtml);
  }, [customHtml, saveHtml]);

  return {
    customHtml,
    setCustomHtml,
    supportEmail,
    setSupportEmail,
    orgName,
    setOrgName: (value: string) => {
      setHasUserEditedOrg(true);
      setOrgName(value);
    },
    orgTagline,
    setOrgTagline: (value: string) => {
      setHasUserEditedOrg(true);
      setOrgTagline(value);
    },
    primaryColor,
    setPrimaryColor: (value: string) => {
      setHasUserEditedOrg(true);
      setPrimaryColor(value);
    },
    secondaryColor,
    setSecondaryColor: (value: string) => {
      setHasUserEditedOrg(true);
      setSecondaryColor(value);
    },
    previewHtml,
    saveCurrent,
    isLoading,
    isSaving,
  };
}
