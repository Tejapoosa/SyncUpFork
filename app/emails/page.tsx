"use client";

import { useState, useEffect } from "react";
import { useUserButton } from "@clerk/nextjs";
import { Mail, RefreshCw, Check, AlertCircle, Loader2 } from "lucide-react";

interface Email {
    id: string;
    subject: string;
    fromEmail: string;
    fromName: string;
    snippet: string;
    summary: string | null;
    actionItems: any;
    receivedAt: string;
    domain: string;
}

export default function EmailsPage() {
    const [loading, setLoading] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [emails, setEmails] = useState<Email[]>([]);
    const [gmailConnected, setGmailConnected] = useState(false);
    const [status, setStatus] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        // Check if user is logged in by calling the API
        checkGmailStatus();
    }, []);

    const checkGmailStatus = async () => {
        try {
            const response = await fetch("/api/emails/list?limit=1");
            if (response.ok) {
                setGmailConnected(true);
            }
        } catch (error) {
            // User might not be connected
            setGmailConnected(false);
        }
    };

    const connectGmail = async () => {
        setConnecting(true);
        setStatus({ type: "info", message: "Redirecting to Google..." });

        try {
            const response = await fetch("/api/integrations/gmail/setup", {
                method: "POST",
            });

            const data = await response.json();

            if (data.url) {
                window.location.href = data.url;
            } else {
                setStatus({ type: "error", message: data.error || "Failed to connect Gmail" });
            }
        } catch (error) {
            setStatus({ type: "error", message: "Failed to connect Gmail" });
        } finally {
            setConnecting(false);
        }
    };

    const checkEmails = async () => {
        setLoading(true);
        setStatus({ type: "info", message: "Fetching and summarizing emails..." });

        try {
            const response = await fetch("/api/emails/check", {
                method: "POST",
            });

            const data = await response.json();

            if (response.ok) {
                setEmails(data.emails || []);
                setGmailConnected(true);
                setStatus({
                    type: "success",
                    message: `Found ${data.processed} emails!`,
                });
            } else {
                setStatus({ type: "error", message: data.error || "Failed to check emails" });
            }
        } catch (error) {
            setStatus({ type: "error", message: "Failed to check emails" });
        } finally {
            setLoading(false);
        }
    };

    const loadEmails = async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/emails/list");
            const data = await response.json();
            setEmails(data.emails || []);
        } catch (error) {
            console.error("Failed to load emails:", error);
        } finally {
            setLoading(false);
        }
    };

    // Load emails if connected
    useEffect(() => {
        if (gmailConnected) {
            loadEmails();
        }
    }, [gmailConnected]);

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-3 mb-8">
                    <Mail className="h-8 w-8 text-blue-500" />
                    <h1 className="text-3xl font-bold">Email Summaries</h1>
                </div>

                {/* Status Message */}
                {status && (
                    <div
                        className={`p-4 rounded-lg mb-6 ${
                            status.type === "success"
                                ? "bg-green-500/20 text-green-400"
                                : status.type === "error"
                                ? "bg-red-500/20 text-red-400"
                                : "bg-blue-500/20 text-blue-400"
                        }`}
                    >
                        {status.message}
                    </div>
                )}

                {/* Connection Status */}
                <div className="bg-card rounded-lg p-6 border border-border mb-6">
                    <h2 className="text-xl font-semibold mb-4">Gmail Connection</h2>

                    {!gmailConnected ? (
                        <button
                            onClick={connectGmail}
                            disabled={connecting}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {connecting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Mail className="h-4 w-4" />
                            )}
                            Connect Gmail
                        </button>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-green-400">
                                <Check className="h-5 w-5" />
                                <span>Gmail is connected!</span>
                            </div>

                            <button
                                onClick={checkEmails}
                                disabled={loading}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {loading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="h-4 w-4" />
                                )}
                                Check for New Emails
                            </button>
                        </div>
                    )}
                </div>

                {/* Email List */}
                {emails.length > 0 && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold">Summarized Emails</h2>

                        {emails.map((email) => (
                            <div
                                key={email.id}
                                className="bg-card rounded-lg p-6 border border-border"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-semibold text-lg">{email.subject}</h3>
                                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                                        {email.domain}
                                    </span>
                                </div>

                                <p className="text-sm text-muted-foreground mb-2">
                                    From: {email.fromName} ({email.fromEmail})
                                </p>

                                <p className="text-sm text-muted-foreground mb-4">
                                    {new Date(email.receivedAt).toLocaleString()}
                                </p>

                                {email.summary ? (
                                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                                        <h4 className="font-medium text-green-400 mb-2">Summary</h4>
                                        <p className="text-sm">{email.summary}</p>
                                    </div>
                                ) : (
                                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                                        <p className="text-sm text-yellow-400">
                                            <AlertCircle className="h-4 w-4 inline mr-2" />
                                            No summary available yet
                                        </p>
                                    </div>
                                )}

                                {email.actionItems && Array.isArray(email.actionItems) && email.actionItems.length > 0 && (
                                    <div className="mt-4">
                                        <h4 className="font-medium mb-2">Action Items</h4>
                                        <ul className="list-disc list-inside space-y-1">
                                            {email.actionItems.map((item: any, idx: number) => (
                                                <li key={idx} className="text-sm">
                                                    {item.text}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {gmailConnected && emails.length === 0 && !loading && (
                    <div className="text-center py-12 text-muted-foreground">
                        <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No emails found. Click "Check for New Emails" to fetch them.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
