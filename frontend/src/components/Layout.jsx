import React from 'react';
import Navbar from './Navbar';
import { useLocation } from 'react-router-dom';

const Layout = ({ children }) => {
  const location = useLocation();
  const isStatusPage = location.pathname === '/status';

  return (
    <div className="min-h-screen bg-background antialiased">
      <Navbar />
      <main className={`min-h-[calc(100vh-3.5rem)] ${isStatusPage ? 'bg-dot-pattern' : ''}`}>
        {children}
      </main>
      {isStatusPage && (
        <footer className="border-t py-6 md:py-0">
          <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Your Company. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <a 
                href="#" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Terms
              </a>
              <a 
                href="#" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy
              </a>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default Layout;