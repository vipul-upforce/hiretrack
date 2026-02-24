import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RedirectUriCardProps {
  redirectUri: string;
}

export function RedirectUriCard({ redirectUri }: RedirectUriCardProps) {
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(redirectUri);
    toast({
      title: 'Copied!',
      description: 'Redirect URI copied to clipboard',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Redirect URI</CardTitle>
        <CardDescription>
          Add this exact URI to your Azure AD app registration redirect URIs
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Input value={redirectUri} readOnly className="font-mono text-sm" />
          <Button size="sm" variant="outline" onClick={handleCopy}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Go to Azure Portal → App registrations → Your app → Authentication →
          Add this URI to &quot;Redirect URIs&quot;
        </p>
      </CardContent>
    </Card>
  );
}
