import React from 'react';

const GITHUB_REPO_URL = 'https://github.com/kubestellar/ui';

interface FooterProps {
  commitHash: string;
}

const Footer: React.FC<FooterProps> = ({ commitHash }) => {
  return (
    <div className="fixed bottom-2.5 right-2.5 z-50">
      <a
        href={`${GITHUB_REPO_URL}/commit/${commitHash}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-300/40 transition-colors hover:text-blue-300/60"
      >
        Commit: {commitHash.slice(0, 7)}
      </a>
    </div>
  );
};

export default Footer;
