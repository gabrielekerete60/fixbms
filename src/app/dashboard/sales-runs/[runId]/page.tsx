
import { getSalesRunDetails, getAllSalesRuns, SalesRun } from '@/app/actions';
import { SalesRunDetailsPageClient } from './client';

export const dynamicParams = true;

type SalesRunDetailsProps = {
    params: {
        runId: string;
    }
}

// This function tells Next.js which dynamic pages to build at build time.
export async function generateStaticParams() {
    try {
        const { active, completed } = await getAllSalesRuns();
        const allRuns = [...active, ...completed];
        if (allRuns.length === 0) {
            // Return an empty array if no runs are found, dynamicParams = true will handle the rest.
            return [];
        }
        return allRuns.map((run) => ({
            runId: run.id,
        }));
    } catch (error) {
        console.error("Failed to generate static params for sales runs, returning empty array. This is expected during build if DB is not available:", error);
        // Return empty array on error to allow build to succeed.
        // Pages will be generated on-demand thanks to dynamicParams = true.
        return [];
    }
}

export default async function SalesRunPage({ params }: SalesRunDetailsProps) {
    const { runId } = params;
    
    // It's good practice to re-fetch here, even with generateStaticParams
    // This ensures data is fresh if something changes post-build in ISR scenarios.
    const runDetails = await getSalesRunDetails(runId);

    if (!runDetails) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <h1 className="text-2xl font-bold">Sales Run Not Found</h1>
                <p className="text-muted-foreground">The sales run with ID "{runId}" could not be found.</p>
            </div>
        )
    }

    return <SalesRunDetailsPageClient initialRun={runDetails} />;
}
