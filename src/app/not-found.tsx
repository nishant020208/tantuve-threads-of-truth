import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <ShieldAlert className="mx-auto h-12 w-12 text-madder" />
          <h1 className="mt-4 font-display text-3xl text-primary">Page not found</h1>
          <p className="mt-2 text-muted-foreground">
            The page you are looking for does not exist or has been moved.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Return home
          </Link>
        </div>
      </div>
    </div>
  );
}
