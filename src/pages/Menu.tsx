import { Navigate } from 'react-router-dom';

/** The menu now lives inside the Profile page. Old links to /menu land on the Menu tab. */
export default function Menu() {
  return <Navigate to='/profile?tab=menu' replace />;
}
