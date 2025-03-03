import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

interface PublicRouteProps {
  children: JSX.Element;
}

const PublicRoute = ({ children }: PublicRouteProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem("jwtToken");

      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      try {
        const response = await fetch("http://localhost:4000/protected", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });

        setIsAuthenticated(response.ok);
      } catch (error) {
        setIsAuthenticated(false);
        console.error("Public route error:", error);
      }
    };

    verifyToken();
  }, []);

  if (isAuthenticated === null) {
    return <div>Loading...</div>; // Temporary loading state
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />; // Redirect to home if authenticated
  }

  return children; // Render /profile if not authenticated
};

export default PublicRoute;