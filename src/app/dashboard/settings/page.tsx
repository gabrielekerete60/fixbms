
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ShieldCheck, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { disableMfa, verifyMfaSetup } from '@/app/actions';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type User = {
    name: string;
    role: string;
    staff_id: string;
    email: string;
};

type MfaSetup = {
    secret: string;
    qrCode: string;
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
                    setIsMfaEnabled(doc.data().mfa_enabled || false);
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

    if (isLoading || isMfaEnabled === null) {
        return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin"/></div>
    }

    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-bold font-headline">Settings</h1>
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
                             <div className="flex justify-center bg-white p-4 rounded-md">
                               <img src={mfaSetup.qrCode} alt="MFA QR Code" />
                             </div>
                            <p className="text-xs text-muted-foreground">Or enter this key manually:</p>
                            <div className="flex items-center justify-center gap-2">
                                <code className="p-2 bg-muted rounded-md">{mfaSetup.secret}</code>
                                <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(mfaSetup.secret); toast({title: "Copied!"}) }}><Copy className="h-4 w-4"/></Button>
                            </div>
                            <Button onClick={() => setView('verify')}>Next: Verify Code</Button>
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
