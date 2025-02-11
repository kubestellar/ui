const Version = () => {
  // This will show both the env var and a fallback for easy testing
  const version = import.meta.env.VITE_GIT_COMMIT_HASH || "development";
  const isDev = import.meta.env.DEV;

  return (
    <div className="fixed bottom-2 right-2 text-gray-400 text-xs opacity-50">
      {`Version: ${isDev ? "(DEV) " : ""}${version.slice(0, 7)}`}
    </div>
  );
};

export default Version;
