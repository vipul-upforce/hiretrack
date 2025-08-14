"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Calendar, LogIn, Palette } from "lucide-react";

export default function TestPage() {
  const testPages = [
    {
      title: "DatePicker Test",
      description:
        "Test the new DatePicker component with various configurations",
      href: "/test-datepicker",
      icon: Calendar,
      color: "bg-blue-500 hover:bg-blue-600",
    },
    {
      title: "Login Page Test",
      description:
        "Test the improved login page with logo, theme toggle, and styling",
      href: "/test-login",
      icon: LogIn,
      color: "bg-green-500 hover:bg-green-600",
    },
  ];

  return (
    <div className="container mx-auto p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Test Pages</h1>

        <div className="grid gap-6 md:grid-cols-2">
          {testPages.map((page) => {
            const Icon = page.icon;
            return (
              <Link key={page.href} href={page.href}>
                <div className="p-6 border rounded-lg hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${page.color} text-white`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="text-xl font-semibold">{page.title}</h2>
                  </div>
                  <p className="text-muted-foreground">{page.description}</p>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-8 p-6 bg-muted rounded-lg">
          <h2 className="text-lg font-semibold mb-3">Quick Access Links</h2>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/test-datepicker">DatePicker Test</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/test-login">Login Page Test</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/auth/login">Actual Login Page</Link>
            </Button>
          </div>
        </div>

        <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">What to Test</h2>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>
              <strong>DatePicker:</strong> Theme adaptation, custom actions,
              date ranges, formats
            </li>
            <li>
              <strong>Login Page:</strong> Logo display, theme toggle, button
              styling, reCAPTCHA theming
            </li>
            <li>
              <strong>Theme Switching:</strong> Use the theme toggle to test
              light/dark mode
            </li>
            <li>
              <strong>Responsive Design:</strong> Test on different screen sizes
            </li>
            <li>
              <strong>Accessibility:</strong> Keyboard navigation and screen
              reader support
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
