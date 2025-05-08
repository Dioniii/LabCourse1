import { useEffect, useState } from "react";

const CheckinStatus = () => {
  const [userRole, setUserRole] = useState<string | null>(null);

  const parseJwt = (token: string) => {
    const base64Url = token.split('.')[1]; 
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/'); 
    const jsonPayload = decodeURIComponent(
      atob(base64) 
        .split('') 
        .map((c) => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join('')
    );

    return JSON.parse(jsonPayload); 
  };

  useEffect(() => {
    const token = localStorage.getItem("jwtToken");
    if (token) {
      const decodedToken = parseJwt(token);
      const userRole = decodedToken.role; 
      setUserRole(userRole); 
    }
  }, []);

  // Nëse roli është 'guest', mos shfaq përmbajtjen
  if (userRole === "guest") {
    return <div>You do not have permission to view this page.</div>;
  }

  return (
    <div>
      {}
      <h2>Check-in Status</h2>
      {}
    </div>
  );
};

export default CheckinStatus;
