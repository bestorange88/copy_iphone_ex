import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";

interface WithdrawalAddress {
  id: string;
  coin_symbol: string;
  coin_name: string;
  network: string;
  address: string;
  label: string | null;
  is_default: boolean;
}

export function WithdrawalAddressManager() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<WithdrawalAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAddress, setEditingAddress] = useState<WithdrawalAddress | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    coin_symbol: "BTC",
    coin_name: "Bitcoin",
    network: "BTC",
    address: "",
    label: "",
    is_default: false,
  });

  useEffect(() => {
    if (user) {
      fetchAddresses();
    }
  }, [user]);

  const fetchAddresses = async () => {
    try {
      const { data, error } = await supabase
        .from("user_withdrawal_addresses")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAddresses(data || []);
    } catch (error) {
      console.error("Error fetching withdrawal addresses:", error);
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAddress) {
        const { error } = await supabase
          .from("user_withdrawal_addresses")
          .update(formData)
          .eq("id", editingAddress.id);

        if (error) throw error;
        toast.success(t("settings.withdrawal_address_updated"));
      } else {
        const { error } = await supabase
          .from("user_withdrawal_addresses")
          .insert({
            ...formData,
            user_id: user?.id,
          });

        if (error) throw error;
        toast.success(t("settings.withdrawal_address_added"));
      }

      setIsDialogOpen(false);
      resetForm();
      fetchAddresses();
    } catch (error) {
      console.error("Error saving withdrawal address:", error);
      toast.error(t("common.error"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("settings.confirm_delete_address"))) return;

    try {
      const { error } = await supabase
        .from("user_withdrawal_addresses")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success(t("settings.withdrawal_address_deleted"));
      fetchAddresses();
    } catch (error) {
      console.error("Error deleting withdrawal address:", error);
      toast.error(t("common.error"));
    }
  };

  const handleEdit = (address: WithdrawalAddress) => {
    setEditingAddress(address);
    setFormData({
      coin_symbol: address.coin_symbol,
      coin_name: address.coin_name,
      network: address.network,
      address: address.address,
      label: address.label || "",
      is_default: address.is_default,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingAddress(null);
    setFormData({
      coin_symbol: "BTC",
      coin_name: "Bitcoin",
      network: "BTC",
      address: "",
      label: "",
      is_default: false,
    });
  };

  const handleOpenDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  if (loading) {
    return <div>{t("common.loading")}</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t("settings.withdrawal_addresses")}</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenDialog}>
              <Plus className="w-4 h-4 mr-2" />
              {t("settings.add_address")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingAddress ? t("settings.edit_address") : t("settings.add_address")}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="coin">{t("settings.coin")}</Label>
                <Select
                  value={formData.coin_symbol}
                  onValueChange={(value) => {
                    const coinMap: Record<string, { name: string; network: string }> = {
                      BTC: { name: "Bitcoin", network: "BTC" },
                      ETH: { name: "Ethereum", network: "ETH" },
                      USDT: { name: "Tether", network: "TRC20" },
                    };
                    const coin = coinMap[value];
                    setFormData({
                      ...formData,
                      coin_symbol: value,
                      coin_name: coin.name,
                      network: coin.network,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BTC">BTC - Bitcoin</SelectItem>
                    <SelectItem value="ETH">ETH - Ethereum</SelectItem>
                    <SelectItem value="USDT">USDT - Tether</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="network">{t("settings.network")}</Label>
                <Input
                  id="network"
                  value={formData.network}
                  onChange={(e) => setFormData({ ...formData, network: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="address">{t("settings.address")}</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="label">{t("settings.label")}</Label>
                <Input
                  id="label"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder={t("settings.label_placeholder")}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit">{t("common.save")}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {addresses.length === 0 ? (
          <p className="text-muted-foreground">{t("settings.no_withdrawal_addresses")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("settings.coin")}</TableHead>
                <TableHead>{t("settings.network")}</TableHead>
                <TableHead>{t("settings.address")}</TableHead>
                <TableHead>{t("settings.label")}</TableHead>
                <TableHead>{t("settings.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {addresses.map((address) => (
                <TableRow key={address.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{address.coin_symbol}</div>
                      <div className="text-sm text-muted-foreground">{address.coin_name}</div>
                    </div>
                  </TableCell>
                  <TableCell>{address.network}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {address.address.slice(0, 10)}...{address.address.slice(-8)}
                  </TableCell>
                  <TableCell>{address.label || "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(address)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(address.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
