

"use client";
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Send } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { postAnnouncement, submitReport, Announcement as AnnouncementType, getReports, Report } from '@/app/actions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

type User = {
    name: string;
    role: string;
    staff_id: string;
};

function ReportForm({ user, onReportSubmitted }: { user: User | null, onReportSubmitted: () => void }) {
    const { toast } = useToast();
    const [subject, setSubject] = useState('');
    const [reportType, setReportType] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject || !reportType || !message || !user) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please fill out all fields.' });
            return;
        }

        setIsSubmitting(true);
        const result = await submitReport({ subject, reportType, message, user });

        if (result.success) {
            toast({ title: 'Success', description: 'Your report has been submitted.' });
            setSubject('');
            setReportType('');
            setMessage('');
            onReportSubmitted();
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsSubmitting(false);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Submit a Report</CardTitle>
                <CardDescription>File a formal report for incidents, suggestions, or maintenance needs.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="subject">Subject</Label>
                            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g., Faulty Mixer in Kitchen" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="report-type">Report Type</Label>
                            <Select value={reportType} onValueChange={setReportType}>
                                <SelectTrigger id="report-type">
                                    <SelectValue placeholder="Select a type..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Incident">Incident</SelectItem>
                                    <SelectItem value="Suggestion">Suggestion</SelectItem>
                                    <SelectItem value="Maintenance">Maintenance Request</SelectItem>
                                    <SelectItem value="Complaint">Complaint</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="message">Detailed Message</Label>
                        <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Please provide as much detail as possible." rows={6} />
                    </div>
                    <div className="flex justify-end">
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit Report
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

function ViewReportsTab() {
    const [reports, setReports] = useState<Report[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const q = query(collection(db, 'reports'), orderBy('timestamp', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => {
                const docData = doc.data();
                return { id: doc.id, ...docData } as Report;
            });
            setReports(data);
            if (isLoading) setIsLoading(false);
        }, (error) => {
            console.error("Error fetching reports:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch reports.' });
            if (isLoading) setIsLoading(false);
        });

        return () => unsubscribe();
    }, [toast, isLoading]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>View Reports</CardTitle>
                <CardDescription>Review all submitted reports from staff members.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>From</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Subject</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="h-8 w-8 animate-spin" /></TableCell></TableRow>
                        ) : reports.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="h-24 text-center">No reports found.</TableCell></TableRow>
                        ) : (
                            reports.map(report => (
                                <TableRow key={report.id}>
                                    <TableCell>{format(report.timestamp.toDate(), 'PPp')}</TableCell>
                                    <TableCell>{report.staffName}</TableCell>
                                    <TableCell><Badge variant="secondary">{report.reportType}</Badge></TableCell>
                                    <TableCell>{report.subject}</TableCell>
                                    <TableCell><Badge>{report.status}</Badge></TableCell>
                                    <TableCell>
                                        <Button variant="outline" size="sm">View</Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}


export default function CommunicationPage() {
    const { toast } = useToast();
    const [announcements, setAnnouncements] = useState<AnnouncementType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [activeTab, setActiveTab] = useState("announcements");

    useEffect(() => {
        const q = query(collection(db, 'announcements'), orderBy('timestamp', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => {
                 const docData = doc.data();
                return { id: doc.id, ...docData } as AnnouncementType;
            });
            setAnnouncements(data);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching announcements:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch announcements.'});
            setIsLoading(false);
        });

        const storedUser = localStorage.getItem('loggedInUser');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }

        return () => unsubscribe();
    }, [toast]);

    const handlePostAnnouncement = async () => {
        if (!newMessage.trim() || !user) return;

        setIsPosting(true);
        const result = await postAnnouncement(newMessage, user);

        if (result.success) {
            setNewMessage('');
            toast({ title: 'Success', description: 'Your announcement has been posted.' });
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsPosting(false);
    };

    const canPostAnnouncements = user?.role === 'Manager' || user?.role === 'Supervisor' || user?.role === 'Developer';
    const canViewReports = user?.role === 'Manager' || user?.role === 'Supervisor' || user?.role === 'Developer';


    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-bold font-headline">Communication Center</h1>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="announcements">Announcements</TabsTrigger>
                    <TabsTrigger value="submit-report">Submit a Report</TabsTrigger>
                    {canViewReports && <TabsTrigger value="view-reports">View Reports</TabsTrigger>}
                </TabsList>
                <TabsContent value="announcements" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Team Announcements</CardTitle>
                            <CardDescription>Updates and messages from management.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4 h-96 overflow-y-auto p-4 border rounded-md">
                                {isLoading ? (
                                    <div className="flex items-center justify-center h-full">
                                        <Loader2 className="h-8 w-8 animate-spin" />
                                    </div>
                                ) : announcements.length === 0 ? (
                                    <div className="flex items-center justify-center h-full text-muted-foreground">
                                        No announcements yet.
                                    </div>
                                ) : (
                                    announcements.map((announcement) => (
                                        <div key={announcement.id} className="flex items-start gap-4">
                                            <Avatar>
                                                <AvatarImage src={`https://placehold.co/40x40.png?text=${announcement.staffName.charAt(0)}`} alt={announcement.staffName} data-ai-hint="person face" />
                                                <AvatarFallback>{announcement.staffName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold">{announcement.staffName}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {announcement.timestamp ? format(announcement.timestamp.toDate(), 'PPp') : 'Sending...'}
                                                    </p>
                                                </div>
                                                <p className="text-sm">{announcement.message}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            {canPostAnnouncements && (
                                <div className="relative">
                                    <Textarea
                                        placeholder="Type your announcement..."
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        className="pr-16"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handlePostAnnouncement();
                                            }
                                        }}
                                    />
                                    <Button
                                        size="icon"
                                        className="absolute right-2 bottom-2"
                                        onClick={handlePostAnnouncement}
                                        disabled={isPosting || !newMessage.trim()}
                                    >
                                        {isPosting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="submit-report" className="mt-4">
                    <ReportForm user={user} onReportSubmitted={() => setActiveTab("announcements")} />
                </TabsContent>
                 {canViewReports && (
                    <TabsContent value="view-reports" className="mt-4">
                       <ViewReportsTab />
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
}
