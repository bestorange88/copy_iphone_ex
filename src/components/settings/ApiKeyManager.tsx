import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Plus, Trash2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ApiKey {
  id: string;
  exchange: string;
  api_key: string;
  is_active: boolean;
}

export function ApiKeyManager() {
  const { t } = useTranslation();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [showSecret, setShowSecret] = useState<{ [key: string]: boolean }>({});
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();

  const [newKey, setNewKey] = useState({
    exchange: "okx",
    api_key: "",
    api_secret: "",
    passphrase: "",
  });

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    const { data, error } = await supabase
      .from("api_keys")
      .select("id, exchange, api_key, is_active");

    if (error) {
      toast({
        title: t('apiKeys.loadFailed'),
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setApiKeys(data || []);
  };

  const handleAddKey = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("api_keys").insert({
      user_id: user.id,
      exchange: newKey.exchange,
      api_key: newKey.api_key,
      api_secret: newKey.api_secret,
      passphrase: newKey.passphrase || null,
      is_active: true,
    });

    if (error) {
      toast({
        title: t('apiKeys.addFailed'),
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: t('apiKeys.addSuccess'),
      description: `${newKey.exchange.toUpperCase()} ${t('apiKeys.keyAdded')}`,
    });

    setNewKey({ exchange: "okx", api_key: "", api_secret: "", passphrase: "" });
    setIsAdding(false);
    loadApiKeys();
  };

  const handleDeleteKey = async (id: string) => {
    const { error } = await supabase.from("api_keys").delete().eq("id", id);

    if (error) {
      toast({
        title: t('apiKeys.deleteFailed'),
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: t('apiKeys.deleteSuccess'),
      description: t('apiKeys.keyDeleted'),
    });

    loadApiKeys();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('apiKeys.title')}</CardTitle>
        <CardDescription>{t('apiKeys.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {apiKeys.map((key) => (
          <div key={key.id} className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex-1 space-y-1">
              <div className="font-medium">{key.exchange.toUpperCase()}</div>
              <div className="flex items-center gap-2">
                <code className="text-sm text-muted-foreground">
                  {showSecret[key.id] ? key.api_key : "••••••••••••••••"}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setShowSecret({ ...showSecret, [key.id]: !showSecret[key.id] })
                  }
                >
                  {showSecret[key.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDeleteKey(key.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <Alert className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{t('apiKeys.securityWarning')}</strong> {t('apiKeys.securityMessage')}
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong className="text-destructive">{t('apiKeys.noWithdrawal')}</strong></li>
              <li>{t('apiKeys.tradingOnly')}</li>
              <li>{t('apiKeys.ipWhitelist')}</li>
              <li>{t('apiKeys.rotateKeys')}</li>
              <li className="text-muted-foreground text-xs">{t('apiKeys.unencryptedNote')}</li>
            </ul>
          </AlertDescription>
        </Alert>

        {isAdding ? (
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="space-y-2">
              <Label>{t('apiKeys.exchange')}</Label>
              <Select value={newKey.exchange} onValueChange={(value) => setNewKey({ ...newKey, exchange: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="okx">OKX</SelectItem>
                  <SelectItem value="htx">HTX ({t('apiKeys.huobi')})</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                value={newKey.api_key}
                onChange={(e) => setNewKey({ ...newKey, api_key: e.target.value })}
                placeholder={t('apiKeys.enterApiKey')}
              />
            </div>

            <div className="space-y-2">
              <Label>API Secret</Label>
              <Input
                type="password"
                value={newKey.api_secret}
                onChange={(e) => setNewKey({ ...newKey, api_secret: e.target.value })}
                placeholder={t('apiKeys.enterApiSecret')}
              />
            </div>

            {newKey.exchange === "okx" && (
              <div className="space-y-2">
                <Label>Passphrase (OKX)</Label>
                <Input
                  type="password"
                  value={newKey.passphrase}
                  onChange={(e) => setNewKey({ ...newKey, passphrase: e.target.value })}
                  placeholder={t('apiKeys.enterPassphrase')}
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleAddKey}>{t('common.save')}</Button>
              <Button variant="outline" onClick={() => setIsAdding(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => setIsAdding(true)} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            {t('apiKeys.addKey')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
