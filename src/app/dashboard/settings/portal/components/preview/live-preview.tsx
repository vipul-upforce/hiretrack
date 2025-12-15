import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { PortalSettings } from '../../types';

interface LivePreviewProps {
  settings: PortalSettings;
  headerHtml: string;
  footerHtml: string;
  theme: 'light' | 'dark';
}

export function LivePreview({
  settings,
  headerHtml,
  footerHtml,
  theme,
}: LivePreviewProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border',
        theme === 'dark' ? 'bg-slate-900' : 'bg-white',
      )}
      style={
        {
          '--portal-primary': settings.primaryColor,
          '--portal-secondary': settings.secondaryColor,
        } as React.CSSProperties
      }
    >
      {/* Custom Header Preview */}
      {headerHtml && (
        <div className="border-b">
          {/* eslint-disable-next-line react/no-danger */}
          <div dangerouslySetInnerHTML={{ __html: headerHtml }} />
        </div>
      )}

      {/* Default Header if no custom header */}
      {!headerHtml && (
        <div
          className="p-4"
          style={{
            background: `linear-gradient(135deg, ${settings.primaryColor} 0%, ${settings.secondaryColor} 100%)`,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {(theme === 'dark'
                ? settings.portalLogoDark
                : settings.portalLogo) && (
                <div className="relative h-10 w-32 rounded bg-white/10">
                  <Image
                    src={
                      theme === 'dark'
                        ? settings.portalLogoDark?.url || ''
                        : settings.portalLogo?.url || ''
                    }
                    alt="Logo"
                    fill
                    className="object-contain p-2"
                  />
                </div>
              )}
              <h3 className="font-semibold text-white">
                {settings.portalName || 'Portal Name'}
              </h3>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Portal Preview Content */}
      <div className="space-y-6 p-6">
        <div
          className={cn(
            'space-y-4',
            theme === 'dark' ? 'text-white' : 'text-gray-900',
          )}
        >
          {/* Job Application Header */}
          <div className="border-b pb-4">
            <h1 className="text-2xl font-bold">Senior Frontend Developer</h1>
            <p className="mt-1 text-sm opacity-70">
              Technology • Full-time • Remote
            </p>
          </div>

          {/* Job Details */}
          <div className="space-y-3">
            <h3 className="font-semibold">Job Description</h3>
            <p className="text-sm leading-relaxed opacity-80">
              We are seeking a talented Senior Frontend Developer to join our
              dynamic team. You will be responsible for creating exceptional
              user experiences using modern web technologies.
            </p>
          </div>

          {/* Application Form Preview */}
          <div className="space-y-3 border-t pt-4">
            <h3 className="font-semibold">Apply for this position</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium opacity-70">
                    First Name
                  </label>
                  <div
                    className="h-9 rounded border"
                    style={{
                      backgroundColor:
                        theme === 'dark'
                          ? 'rgba(255,255,255,0.1)'
                          : 'rgba(0,0,0,0.05)',
                      borderColor:
                        theme === 'dark'
                          ? 'rgba(255,255,255,0.2)'
                          : 'rgba(0,0,0,0.15)',
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium opacity-70">
                    Last Name
                  </label>
                  <div
                    className="h-9 rounded border"
                    style={{
                      backgroundColor:
                        theme === 'dark'
                          ? 'rgba(255,255,255,0.1)'
                          : 'rgba(0,0,0,0.05)',
                      borderColor:
                        theme === 'dark'
                          ? 'rgba(255,255,255,0.2)'
                          : 'rgba(0,0,0,0.15)',
                    }}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium opacity-70">
                  Email Address
                </label>
                <div
                  className="h-9 rounded border"
                  style={{
                    backgroundColor:
                      theme === 'dark'
                        ? 'rgba(255,255,255,0.1)'
                        : 'rgba(0,0,0,0.05)',
                    borderColor:
                      theme === 'dark'
                        ? 'rgba(255,255,255,0.2)'
                        : 'rgba(0,0,0,0.15)',
                  }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium opacity-70">
                  Upload Resume
                </label>
                <div
                  className="flex h-20 items-center justify-center rounded border-2 border-dashed"
                  style={{
                    backgroundColor:
                      theme === 'dark'
                        ? 'rgba(255,255,255,0.1)'
                        : 'rgba(0,0,0,0.05)',
                    borderColor:
                      theme === 'dark'
                        ? 'rgba(255,255,255,0.2)'
                        : 'rgba(0,0,0,0.15)',
                  }}
                >
                  <span className="text-xs opacity-60">
                    Drop files here or click to browse
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              className="flex-1 rounded-lg px-6 py-2 text-sm font-medium text-white"
              style={{ backgroundColor: settings.primaryColor }}
            >
              Submit Application
            </button>
            <button
              type="button"
              className="rounded-lg border border-white/20 px-6 py-2 text-sm font-medium text-current"
            >
              Save as Draft
            </button>
          </div>
        </div>
      </div>

      {/* Custom Footer Preview */}
      {footerHtml && (
        <div className="border-t">
          {/* eslint-disable-next-line react/no-danger */}
          <div dangerouslySetInnerHTML={{ __html: footerHtml }} />
        </div>
      )}
    </div>
  );
}
