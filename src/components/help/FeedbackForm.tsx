import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Send, MessageSquarePlus, Loader2 } from "lucide-react";
import { z } from "zod";

const feedbackSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name too long"),
  email: z.string().trim().email("Invalid email").max(255, "Email too long"),
  category: z.string().min(1, "Category is required"),
  subject: z.string().trim().min(1, "Subject is required").max(200, "Subject too long"),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(2000, "Message too long")
});

export const FeedbackForm = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: user?.email || "",
    category: "general",
    subject: "",
    message: ""
  });

  const categories = [
    { value: "general", label: t('help.feedback.categories.general') },
    { value: "bug", label: t('help.feedback.categories.bug') },
    { value: "feature", label: t('help.feedback.categories.feature') },
    { value: "account", label: t('help.feedback.categories.account') },
    { value: "trading", label: t('help.feedback.categories.trading') },
    { value: "other", label: t('help.feedback.categories.other') }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = feedbackSchema.safeParse(formData);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('user_feedback')
        .insert({
          user_id: user?.id || null,
          name: formData.name.trim(),
          email: formData.email.trim(),
          category: formData.category,
          subject: formData.subject.trim(),
          message: formData.message.trim(),
          status: 'pending'
        });

      if (error) throw error;

      toast.success(t('help.feedback.success'));
      setFormData({
        name: "",
        email: user?.email || "",
        category: "general",
        subject: "",
        message: ""
      });
    } catch (error) {
      console.error('Feedback submission error:', error);
      toast.error(t('help.feedback.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquarePlus className="h-5 w-5 text-primary" />
          {t('help.feedback.title')}
        </CardTitle>
        <CardDescription>{t('help.feedback.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('help.feedback.name')} *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('help.feedback.namePlaceholder')}
                maxLength={100}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('help.feedback.email')} *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder={t('help.feedback.emailPlaceholder')}
                maxLength={255}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">{t('help.feedback.category')} *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">{t('help.feedback.subject')} *</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder={t('help.feedback.subjectPlaceholder')}
                maxLength={200}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">{t('help.feedback.message')} *</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder={t('help.feedback.messagePlaceholder')}
              rows={5}
              maxLength={2000}
              required
            />
            <p className="text-xs text-muted-foreground text-right">
              {formData.message.length}/2000
            </p>
          </div>

          <Button type="submit" disabled={submitting} className="w-full md:w-auto">
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('common.submitting')}
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                {t('help.feedback.submit')}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
