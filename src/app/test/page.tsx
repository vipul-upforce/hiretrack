'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotificationType } from "@/lib/models/notification";

export default function TestNotificationsPage() {
    const [loading, setLoading] = useState<string | null>(null);
    const [result, setResult] = useState<string | null>(null);

    const triggerNotification = async (type: NotificationType) => {
        setLoading(type);
        setResult(null);
        try {
            const response = await fetch('/api/test-notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type }),
            });
            const data = await response.json();
            if (response.ok) {
                setResult(`Successfully triggered ${type}.`);
            } else {
                setResult(`Error triggering ${type}: ${data.error}`);
            }
        } catch (error) {
            setResult(`Error: ${(error as Error).message}`);
        } finally {
            setLoading(null);
        }
    };

    const notificationTypes = Object.values(NotificationType).filter(
        (type) =>
            ![
                "deadline_reminder",
                "email_failed",
                "system_maintenance",
                "file_upload_completed",
                "report_generated",
            ].includes(type)
    );

    return (
        <div className="container mx-auto p-4">
            <Card>
                <CardHeader>
                    <CardTitle>Test Notifications</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {notificationTypes.map((type) => (
                        <Button
                            key={type}
                            onClick={() => triggerNotification(type)}
                            disabled={loading === type}
                        >
                            {loading === type ? "Sending..." : `Trigger ${type}`}
                        </Button>
                    ))}
                </CardContent>
            </Card>
            {result && (
                <div className="mt-4 p-4 bg-gray-100 rounded">
                    <p>{result}</p>
                </div>
            )}
        </div>
    );
}