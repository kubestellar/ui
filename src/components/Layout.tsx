import {
  Outlet,
} from "react-router-dom";
import Header from "./Header";
import Menu from "./menu/Menu";

const GITHUB_REPO_URL = 'https://github.com/kubestellar/ui';


export function Layout() {
  // Log the commit hash to console for debugging
  console.log('Git Commit Hash:', import.meta.env.VITE_GIT_COMMIT_HASH);

  const commitHash = import.meta.env.VITE_GIT_COMMIT_HASH || 'unknown';

  return (
    <div className="w-full min-h-screen flex flex-col justify-between relative">
      <div>
        <Header />
        <div className="w-full flex gap-0 pt-20 xl:pt-[96px] 2xl:pt-[112px] mb-auto">
          <div className="hidden xl:block xl:w-[250px] 2xl:w-[280px] 3xl:w-[350px] border-r-2 border-base-300 dark:border-slate-700 px-3 xl:px-4 xl:py-1">
            <Menu />
          </div>
          <div className="w-full px-4 xl:px-4 2xl:px-5 xl:py-2 overflow-clip">
            <Outlet />
          </div>
        </div>
      </div>
      
      {/* Commit Hash Footer */}
      <div 
          style={{
            position: 'fixed',
            bottom: '10px', 
            right: '10px', 
            color: 'grey',      
            fontSize: '18px',    
            opacity: 0.8,        
            zIndex: 9999,
            fontWeight: 300,     
            letterSpacing: '0.5px' 
          }}
        >
          <a 
            href={`https://github.com/kubestellar/ui/commit/${commitHash}`} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              color: 'black',
              textDecoration: 'none'
            }}
          >
            Commit: {commitHash}
          </a>
        </div>

    </div>
  );
}