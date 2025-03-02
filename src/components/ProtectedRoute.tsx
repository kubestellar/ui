import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: JSX.Element;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem("jwtToken");

      if (!token) {
        setErrorMessage("Missing token");
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

        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          const data = await response.json();
          setErrorMessage(data.error || "Invalid token");
          setIsAuthenticated(false);
        }
      } catch (error) {
        setErrorMessage("Invalid token");
        setIsAuthenticated(false);
        console.error("Protected route error:", error);
      }
    };

    verifyToken();
  }, []);

  if (isAuthenticated === null) {
    return <div>Loading...</div>; // Temporary loading state while verifying
  }

  if (!isAuthenticated) {
    // Redirect to /profile with error message in state
    return <Navigate to="/profile" state={{ errorMessage }} replace />;
  }

  return children; // Render the protected route if authenticated
};

export default ProtectedRoute;