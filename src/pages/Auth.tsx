import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import arxLogo from "@/assets/arx-logo-text.png";
import { sendLoginNotification } from "@/services/notificationService";
import { Eye, EyeOff, Headset, Loader2, Mail, User } from "lucide-react";

export default function Auth() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [showSigninPassword, setShowSigninPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupStep, setSignupStep] = useState<'credentials' | 'email_verify'>('credentials');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [newUserId, setNewUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Dynamic password schema with i18n
  const passwordSchema = z.string()
    .min(6, t('auth.validation.password_min'))
    .max(8, t('auth.validation.password_max'))
    .regex(/[A-Z]/, t('auth.validation.password_uppercase'))
    .regex(/[a-z]/, t('auth.validation.password_lowercase'));

  // Send verification code
  const handleSendVerificationCode = async (email: string) => {
    if (!email) {
      toast({
        title: t('auth.error'),
        description: t('auth.email_required'),
        variant: "destructive",
      });
      return;
    }

    setIsSendingCode(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-verification-email', {
        body: { action: 'send_code', email }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setCountdown(60);
      toast({
        title: t('auth.code_sent'),
        description: t('auth.check_email'),
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('auth.send_code_failed');
      toast({
        title: t('auth.error'),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyEmailAndUpdate = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: t('auth.error'),
        description: t('auth.invalid_code'),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-verification-email', {
        body: { action: 'verify_code', email: signupEmail, code: verificationCode }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (newUserId) {
        await supabase.from('profiles').update({ 
          email: signupEmail,
          email_verified: true 
        }).eq('id', newUserId);
      }

      toast({
        title: t('auth.verification_success'),
        description: t('auth.email_bound_success'),
      });

      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get('redirect');
      navigate(redirect || "/trade");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('auth.verify_failed');
      toast({
        title: t('auth.error'),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUsernameSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const username = formData.get("signup-username") as string;
    const password = formData.get("signup-password") as string;

    const passwordValidation = passwordSchema.safeParse(password);
    if (!passwordValidation.success) {
      setIsLoading(false);
      toast({
        title: t('auth.validation.password_requirements'),
        description: passwordValidation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    const generatedEmail = `${username.toLowerCase().replace(/[^a-z0-9]/g, '')}@arx.local`;

    const { data: signUpData, error } = await supabase.auth.signUp({
      email: generatedEmail,
      password,
      options: {
        data: { username },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      setIsLoading(false);
      if (error.message.includes('already registered')) {
        toast({
          title: t('auth.signup_failed'),
          description: t('auth.username_taken'),
          variant: "destructive",
        });
      } else {
        toast({
          title: t('auth.signup_failed'),
          description: error.message,
          variant: "destructive",
        });
      }
      return;
    }

    if (signUpData.user) {
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: signUpData.user.id,
        email: generatedEmail,
        username: username,
      }, { onConflict: 'id' });

      if (profileError) {
        console.error('Failed to create profile:', profileError);
      }

      const { error: roleError } = await supabase.from('user_roles').upsert({
        user_id: signUpData.user.id,
        role: 'trader' as const,
      }, { onConflict: 'user_id,role' });

      if (roleError) {
        console.error('Failed to create user role:', roleError);
      }

      setNewUserId(signUpData.user.id);
      setSignupUsername(username);
    }

    setIsLoading(false);
    toast({
      title: t('auth.signup_success'),
      description: t('auth.welcome_coinmax'),
    });
    
    setSignupStep('email_verify');
  };

  const handleSkipEmailVerification = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const redirect = urlParams.get('redirect');
    navigate(redirect || "/trade");
  };

  const handleUsernameSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const username = formData.get("signin-username") as string;
    const password = formData.get("signin-password") as string;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('email')
      .eq('username', username)
      .maybeSingle();

    let loginEmail = username;
    
    if (profileData?.email) {
      loginEmail = profileData.email;
    } else {
      loginEmail = `${username.toLowerCase().replace(/[^a-z0-9]/g, '')}@arx.local`;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    setIsLoading(false);

    if (error) {
      toast({
        title: t('auth.signin_failed'),
        description: t('auth.invalid_credentials'),
        variant: "destructive",
      });
    } else {
      toast({
        title: t('auth.signin_success'),
        description: t('common.welcome'),
      });

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        sendLoginNotification(authUser.id).catch(console.error);
      }
      
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get('redirect');
      navigate(redirect || "/trade");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-auth-background p-4 relative overflow-hidden">
      {/* Animated background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-primary/30 via-primary-light/20 to-transparent rounded-full blur-3xl animate-glow-drift" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-gradient-to-tl from-accent/25 via-primary/15 to-transparent rounded-full blur-3xl animate-glow-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-primary/10 via-transparent to-transparent rounded-full blur-3xl animate-glow-pulse" style={{ animationDelay: '2s' }} />
      
      {/* Subtle grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(205_100%_55%/0.03)_1px,transparent_1px),linear-gradient(to_bottom,hsl(205_100%_55%/0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
      
      <Card className="w-full max-w-md bg-auth-card/90 backdrop-blur-xl border-auth-border shadow-2xl shadow-primary/10 relative z-10 card-gradient-border">
        <CardHeader className="space-y-4 text-center pb-2">
          <div className="flex justify-center">
            <div className="relative animate-float">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-primary-light/40 to-primary/30 rounded-full blur-2xl scale-150 animate-glow-pulse" />
              <img src={arxLogo} alt="ARX" className="h-28 w-auto object-contain relative z-10 drop-shadow-2xl" />
            </div>
          </div>
          <CardDescription className="text-muted-foreground">
            {t('auth.platform_subtitle')}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-auth-background/50 border border-auth-border">
              <TabsTrigger value="signin" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">{t('auth.signin')}</TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">{t('auth.signup')}</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4 mt-4">
              <form onSubmit={handleUsernameSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-username" className="text-foreground">{t('auth.username')}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-username"
                      name="signin-username"
                      type="text"
                      placeholder={t('auth.username_placeholder')}
                      required
                      className="bg-auth-background/50 border-auth-border focus:border-primary focus:ring-primary/30 text-foreground placeholder:text-muted-foreground pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="text-foreground">{t('auth.signin_password')}</Label>
                  <div className="relative">
                    <Input
                      id="signin-password"
                      name="signin-password"
                      type={showSigninPassword ? "text" : "password"}
                      placeholder={t('auth.password_placeholder')}
                      required
                      className="bg-auth-background/50 border-auth-border focus:border-primary focus:ring-primary/30 text-foreground placeholder:text-muted-foreground pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSigninPassword(!showSigninPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showSigninPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full bg-gradient-to-r from-primary-dark via-primary to-primary-light text-primary-foreground font-semibold shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] transition-all duration-300" disabled={isLoading}>
                  {isLoading ? t('auth.signing_in') : t('auth.signin')}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4 mt-4">
              {signupStep === 'credentials' && (
                <form onSubmit={handleUsernameSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-username" className="text-foreground">{t('auth.username')}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-username"
                        name="signup-username"
                        type="text"
                        placeholder={t('auth.username_placeholder')}
                        required
                        className="bg-auth-background/50 border-auth-border focus:border-primary focus:ring-primary/30 text-foreground placeholder:text-muted-foreground pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-foreground">{t('auth.set_password')}</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        name="signup-password"
                        type={showSignupPassword ? "text" : "password"}
                        placeholder={t('auth.password_min_length')}
                        required
                        minLength={6}
                        maxLength={8}
                        className="bg-auth-background/50 border-auth-border focus:border-primary focus:ring-primary/30 text-foreground placeholder:text-muted-foreground pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('auth.password_hint')}
                    </p>
                  </div>
                  <Button type="submit" className="w-full bg-gradient-to-r from-primary-dark via-primary to-primary-light text-primary-foreground font-semibold shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] transition-all duration-300" disabled={isLoading}>
                    {isLoading ? t('auth.registering') : t('auth.register_now')}
                  </Button>
                </form>
              )}

              {signupStep === 'email_verify' && (
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <div className="h-12 w-12 mx-auto bg-green-500/20 rounded-full flex items-center justify-center mb-2">
                      <User className="h-6 w-6 text-green-500" />
                    </div>
                    <p className="text-sm text-green-500 font-medium">{t('auth.account_created')}</p>
                    <p className="text-xs text-muted-foreground">{t('auth.username')}: {signupUsername}</p>
                  </div>

                  <div className="p-4 bg-secondary/30 rounded-lg space-y-3">
                    <p className="text-sm text-foreground font-medium">{t('auth.bind_email_optional')}</p>
                    <p className="text-xs text-muted-foreground">{t('auth.bind_email_description')}</p>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bind-email" className="text-foreground">{t('auth.email_address')}</Label>
                      <Input
                        id="bind-email"
                        type="email"
                        placeholder={t('auth.email_placeholder')}
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        className="bg-auth-background/50 border-auth-border focus:border-primary focus:ring-primary/30 text-foreground placeholder:text-muted-foreground"
                      />
                    </div>

                    {signupEmail && (
                      <>
                        <Button 
                          type="button"
                          onClick={() => handleSendVerificationCode(signupEmail)}
                          variant="outline"
                          className="w-full" 
                          disabled={isSendingCode || countdown > 0}
                        >
                          {isSendingCode ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              {t('auth.sending_code')}
                            </>
                          ) : countdown > 0 ? (
                            `${t('auth.resend_in')} ${countdown}s`
                          ) : (
                            <>
                              <Mail className="mr-2 h-4 w-4" />
                              {t('auth.send_verification_code')}
                            </>
                          )}
                        </Button>

                        {countdown > 0 && (
                          <div className="space-y-2">
                            <Label htmlFor="verification-code" className="text-foreground">{t('auth.verification_code')}</Label>
                            <Input
                              id="verification-code"
                              type="text"
                              placeholder={t('auth.enter_6_digit_code')}
                              value={verificationCode}
                              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              maxLength={6}
                              className="bg-auth-background/50 border-auth-border focus:border-primary focus:ring-primary/30 text-foreground placeholder:text-muted-foreground text-center text-xl tracking-widest"
                            />
                            <Button 
                              type="button"
                              onClick={handleVerifyEmailAndUpdate}
                              className="w-full bg-gradient-to-r from-primary-dark via-primary to-primary-light text-primary-foreground" 
                              disabled={isLoading || verificationCode.length !== 6}
                            >
                              {isLoading ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  {t('auth.verifying')}
                                </>
                              ) : t('auth.verify_and_bind')}
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <Button 
                    type="button"
                    onClick={handleSkipEmailVerification}
                    variant="ghost"
                    className="w-full text-muted-foreground hover:text-foreground"
                  >
                    {t('auth.skip_for_now')}
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>

              <p className="text-xs text-center text-muted-foreground">
                {t('auth.terms_text')}
              </p>

              {/* Online Customer Service Entry */}
              <div className="pt-2 border-t border-auth-border">
                <Link 
                  to="/customer-service" 
                  className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  <Headset className="h-4 w-4" />
                  <span>{t('common.online_support')}</span>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
  );
}
