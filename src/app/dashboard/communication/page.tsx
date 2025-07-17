
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
import { getAnnouncements, postAnnouncement, Announcement as AnnouncementType } from '@/app/actions';

type User = {
    name: string;
    role: string;
    staff_id: string;
};

export default function CommunicationPage() {
    const { toast } = useToast();
    const [announcements, setAnnouncements] = useState<AnnouncementType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const fetchAnnouncements = async () => {
            setIsLoading(true);
            const data = await getAnnouncements();
            setAnnouncements(data);
            setIsLoading(false);
        };
        fetchAnnouncements();

        const storedUser = localStorage.getItem('loggedInUser');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    const handlePostAnnouncement = async () => {
        if (!newMessage.trim() || !user) return;

        setIsPosting(true);
        const result = await postAnnouncement(newMessage, user);

        if (result.success) {
            setNewMessage('');
            const data = await getAnnouncements();
            setAnnouncements(data);
            toast({ title: 'Success', description: 'Your announcement has been posted.' });
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsPosting(false);
    };

    const isManager = user?.role === 'Manager' || user?.role === 'Supervisor';

    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-bold font-headline">Communication Center</h1>

            <Tabs defaultValue="announcements">
                <TabsList>
                    <TabsTrigger value="announcements">Announcements</TabsTrigger>
                    <TabsTrigger value="submit-report">Submit a Report</TabsTrigger>
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
                                                        {format(announcement.timestamp.toDate(), 'PPp')}
                                                    </p>
                                                </div>
                                                <p className="text-sm">{announcement.message}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            {isManager && (
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
                <TabsContent value="submit-report">
                    <Card>
                        <CardHeader>
                            <CardTitle>Submit a Report</CardTitle>
                            <CardDescription>This feature is coming soon.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
                            <p>A form to submit reports to management will be available here.</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

    