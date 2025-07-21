
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ShieldCheck, Copy, KeyRound, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { disableMfa, verifyMfaSetup, handleChangePassword, handleUpdateTheme } from '@/app/actions';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type User = {
    name: string;
    role: string;
    staff_id: string;
    email: string;
    theme?: string;
};

type MfaSetup = {
    secret: string;
    qrCode: string;
}

function ChangePasswordForm({ user }: { user: User }) {
    const { toast } = useToast();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast({ variant: 'destructive', title: 'Error', description: 'New passwords do not match.' });
            return;
        }
        if (newPassword.length < 6) {
            toast({ variant: 'destructive', title: 'Error', description: 'New password must be at least 6 characters long.' });
            return;
        }

        setIsSubmitting(true);
        const result = await handleChangePassword(user.staff_id, currentPassword, newPassword);
        if (result.success) {
            toast({ title: 'Success!', description: 'Your password has been changed.' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsSubmitting(false);
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your login password here.</CardDescription>
            </CardHeader>
            <CardContent>
                <form id="change-password-form" onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="current-password">Current Password</Label>
                        <div className="relative">
                            <Input id="current-password" type={showCurrent ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
                            <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowCurrent(!showCurrent)}>
                                {showCurrent ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                            </Button>
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <div className="relative">
                            <Input id="new-password" type={showNew ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                             <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowNew(!showNew)}>
                                {showNew ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                            </Button>
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                        <div className="relative">
                            <Input id="confirm-password" type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                            <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowConfirm(!showConfirm)}>
                                {showConfirm ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                            </Button>
                        </div>
                    </div>
                </form>
            </CardContent>
            <CardFooter>
                 <Button form="change-password-form" type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Change Password
                </Button>
            </CardFooter>
        </Card>
    )
}

function ThemeSettings({ user }: { user: User }) {
    const { toast } = useToast();
    const [selectedTheme, setSelectedTheme] = useState(user.theme || 'default');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setSelectedTheme(user.theme || 'default');
    }, [user.theme]);

    const handleSaveTheme = async () => {
        setIsSaving(true);
        const result = await handleUpdateTheme(user.staff_id, selectedTheme);
        if (result.success) {
            // Write to local storage immediately before reload
            const updatedUser = { ...user, theme: selectedTheme };
            localStorage.setItem('loggedInUser', JSON.stringify(updatedUser));
            toast({ title: 'Theme saved!', description: 'Applying new theme...' });
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not save your theme preference.' });
            setIsSaving(false);
        }
    };
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Theme Preference</CardTitle>
                <CardDescription>Choose a visual theme for your dashboard.</CardDescription>
            </CardHeader>
            <CardContent>
                <Select value={selectedTheme} onValueChange={setSelectedTheme}>
                    <SelectTrigger className="w-[280px]">
                        <SelectValue placeholder="Select a theme" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="default">Default Dark</SelectItem>
                        <SelectItem value="classic-light">Classic Light</SelectItem>
                    </SelectContent>
                </Select>
            </CardContent>
            <CardFooter>
                 <Button onClick={handleSaveTheme} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Save Theme
                </Button>
            </CardFooter>
        </Card>
    )
}

export default function SettingsPage() {
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [isMfaEnabled, setIsMfaEnabled] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [view, setView] = useState<'main' | 'setup' | 'verify'>('main');

    // MFA Setup State
    const [mfaSetup, setMfaSetup] = useState<MfaSetup | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem('loggedInUser');
        if (storedUser) {
            const parsedUser: User = JSON.parse(storedUser);
            setUser(parsedUser);

            const unsub = onSnapshot(doc(db, "staff", parsedUser.staff_id), (doc) => {
                if (doc.exists()) {
                    const data = doc.data();
                    setIsMfaEnabled(data.mfa_enabled || false);
                    setUser(prev => ({...prev!, theme: data.theme || 'default'}));
                }
                if (isLoading) setIsLoading(false);
            });
            return () => unsub();
        } else {
            setIsLoading(false);
        }
    }, [isLoading]);
    
    const handleGenerateMfa = async () => {
        if (!user) return;
        setIsGenerating(true);
        try {
            const secret = speakeasy.generateSecret({ name: `BMS (${user.email})` });
            const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);
            setMfaSetup({ secret: secret.base32, qrCode: qrCodeUrl });
            setView('setup');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not generate MFA setup key.' });
        }
        setIsGenerating(false);
    };

    const handleVerifyAndEnable = async () => {
        if (!user || !mfaSetup || !verificationCode) {
            toast({ variant: 'destructive', title: 'Error', description: 'Missing required information.' });
            return;
        }
        setIsVerifying(true);
        const result = await verifyMfaSetup(user.staff_id, verificationCode, mfaSetup.secret);
        if (result.success) {
            toast({ title: 'Success!', description: 'MFA has been enabled on your account.' });
            setView('main');
            setMfaSetup(null);
            setVerificationCode('');
        } else {
            toast({ variant: 'destructive', title: 'Verification Failed', description: result.error });
            setView('setup'); // Go back to QR code screen
        }
        setIsVerifying(false);
    };

    const handleDisableMfa = async () => {
        if (!user) return;
        const result = await disableMfa(user.staff_id);
        if (result.success) {
            toast({ title: 'Success', description: 'MFA has been disabled.' });
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
    }

    if (isLoading || isMfaEnabled === null || !user) {
        return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin"/></div>
    }

    return (
        <div className="flex flex-col gap-8">
            <h1 className="text-2xl font-bold font-headline">Settings</h1>

            <ThemeSettings user={user} />
            
            <ChangePasswordForm user={user} />
            
            <Card>
                <CardHeader>
                    <CardTitle>Multi-Factor Authentication (MFA)</CardTitle>
                    <CardDescription>
                        Add an extra layer of security to your account.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {view === 'main' && (
                         <Alert>
                            <ShieldCheck className="h-4 w-4" />
                            <AlertTitle>MFA Status: {isMfaEnabled ? <span className="text-green-500">Enabled</span> : <span className="text-destructive">Disabled</span>}</AlertTitle>
                            <AlertDescription>
                                {isMfaEnabled 
                                    ? "Your account is protected with an additional layer of security." 
                                    : "It's highly recommended to enable MFA to protect your account from unauthorized access."
                                }
                            </AlertDescription>
                            <div className="mt-4">
                                {isMfaEnabled ? (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive">Disable MFA</Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>This will remove the extra security layer from your account.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleDisableMfa}>Yes, Disable</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                ) : (
                                    <Button onClick={handleGenerateMfa} disabled={isGenerating}>
                                        {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                        Enable MFA
                                    </Button>
                                )}
                            </div>
                        </Alert>
                    )}
                    {view === 'setup' && mfaSetup && (
                        <div className="space-y-4 text-center p-4 border rounded-lg">
                            <h3 className="font-semibold text-lg">Step 1: Scan QR Code</h3>
                            <p className="text-sm text-muted-foreground">Scan this QR code with an authenticator app (e.g., Google Authenticator, Authy).</p>
                             <div className="bg-white p-2 rounded-md inline-block">
                               <img src={mfaSetup.qrCode} alt="MFA QR Code" className="max-w-48"/>
                             </div>
                            <p className="text-xs text-muted-foreground">Or enter this key manually:</p>
                            <div className="flex items-center justify-center gap-2">
                                <code className="p-2 bg-muted rounded-md">{mfaSetup.secret}</code>
                                <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(mfaSetup.secret); toast({title: "Copied!"}) }}><Copy className="h-4 w-4"/></Button>
                            </div>
                             <div className="flex justify-center gap-2">
                                <Button variant="outline" onClick={() => setView('main')}>Cancel</Button>
                                <Button onClick={() => setView('verify')}>Next: Verify Code</Button>
                            </div>
                        </div>
                    )}
                    {view === 'verify' && (
                         <div className="space-y-4 text-center p-4 border rounded-lg">
                            <h3 className="font-semibold text-lg">Step 2: Verify Your Device</h3>
                            <p className="text-sm text-muted-foreground">Enter the 6-digit code from your authenticator app to complete the setup.</p>
                             <div className="mx-auto max-w-xs space-y-2">
                                <Label htmlFor="verification-code" className="sr-only">Verification Code</Label>
                                <Input 
                                    id="verification-code"
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value)}
                                    maxLength={6}
                                    placeholder="123456"
                                    className="text-center text-2xl tracking-[0.3em]"
                                />
                             </div>
                             <div className="flex gap-2 justify-center">
                                <Button variant="outline" onClick={() => { setView('setup'); setVerificationCode(''); }}>Back</Button>
                                <Button onClick={handleVerifyAndEnable} disabled={isVerifying || verificationCode.length !== 6}>
                                    {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                    Enable MFA
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
