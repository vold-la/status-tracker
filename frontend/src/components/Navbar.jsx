import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import EmailSubscribe from '@/components/EmailSubscribe';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showSubscribe, setShowSubscribe] = useState(false);

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged out successfully",
      variant: "default",
    });
    navigate('/login');
  };

  const navLinks = [
    { path: '/status', label: 'Status', public: true },
    { path: '/dashboard', label: 'Dashboard', protected: true },
    { path: '/services', label: 'Services', protected: true },
    { path: '/incidents', label: 'Incidents', protected: true },
  ];

  return (
    <>
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Link to="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold">Status Page</span>
          </Link>
          <div className="flex flex-1 items-center justify-between">
            <div className="flex items-center space-x-6">
              {navLinks.map(({ path, label, public: isPublic, protected: isProtected }) => {
                if ((isProtected && !isAuthenticated) || (isPublic === false && !isAuthenticated)) {
                  return null;
                }
                return (
                  <Link
                    key={path}
                    to={path}
                    className={`text-sm font-medium transition-colors hover:text-primary ${
                      location.pathname === path ? 'text-foreground' : 'text-foreground/60'
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <span className="text-sm text-foreground/60">
                    {user?.email}
                  </span>
                  <Button variant="ghost" onClick={handleLogout}>
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => setShowSubscribe(true)}>
                    Subscribe for Updates
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link to="/login">Login</Link>
                  </Button>
                  <Button asChild>
                    <Link to="/register">Register</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <AlertDialog open={showSubscribe} onOpenChange={setShowSubscribe}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Subscribe to Status Updates</AlertDialogTitle>
            <AlertDialogDescription>
              Enter your email to receive notifications about service status changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <EmailSubscribe />
          <AlertDialogCancel>Close</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Navbar;