import { redirect } from 'next/navigation';

export default function HomePage() {
    // Redirect to login by default
    // In production, this would check for org context
    redirect('/login');
}
