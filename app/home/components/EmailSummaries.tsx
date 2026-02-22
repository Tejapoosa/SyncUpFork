import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mail, RefreshCw, Check, AlertCircle, Loader2, ExternalLink } from "lucide-react";

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

interface EmailSummariesProps {
  gmailConnected: boolean;
  onConnectGmail: () => void;
}

export default function EmailSummaries({ gmailConnected, onConnectGmail }: EmailSummariesProps) {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [emails, setEmails] = useState<Email[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (gmailConnected) {
      loadEmails();
    }
  }, [gmailConnected]);

  const loadEmails = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/emails/list?limit=10");
      const data = await response.json();
      setEmails(data.emails || []);
    } catch (error) {
      console.error("Failed to load emails:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkEmails = async () => {
    setChecking(true);
    setStatus("Fetching and summarizing emails...");
    try {
      const response = await fetch("/api/emails/check", { method: "POST" });
      const data = await response.json();
      if (response.ok) {
        setEmails(data.emails || []);
        setStatus(`Found ${data.processed} emails!`);
        setTimeout(() => setStatus(null), 3000);
      } else {
        setStatus(data.error || "Failed to check emails");
      }
    } catch (error) {
      setStatus("Failed to check emails");
    } finally {
      setChecking(false);
    }
  };

  if (!gmailConnected) {
    return (
      <div className="bg-card rounded-lg p-6 border border-border">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="h-5 w-5 text-blue-500" />
          <h2 className="text-xl font-semibold">Email Summaries</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Connect your Gmail to get AI-powered summaries of your emails.
        </p>
        <Button onClick={onConnectGmail} className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Connect Gmail
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg p-6 border border-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-blue-500" />
          <h2 className="text-xl font-semibold">Email Summaries</h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={checkEmails}
          disabled={checking}
          className="flex items-center gap-1"
        >
          {checking ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          {checking ? "Checking..." : "Check"}
        </Button>
      </div>

      {status && (
        <p className="text-sm text-muted-foreground mb-4">{status}</p>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : emails.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No emails yet. Click "Check" to fetch emails.
        </p>
      ) : (
        <div className="space-y-3">
          {emails.slice(0, 5).map((email) => (
            <div
              key={email.id}
              className="p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-medium text-sm line-clamp-1">{email.subject}</h3>
                <span className="text-xs text-muted-foreground">{email.domain}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                From: {email.fromName || email.fromEmail}
              </p>
              {email.summary ? (
                <p className="text-xs line-clamp-2">{email.summary}</p>
              ) : (
                <p className="text-xs text-yellow-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Processing...
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
