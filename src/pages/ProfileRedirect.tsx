import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ProfilePage from './ProfilePage';

/**
 * /profile manda a /users/{tu id}.
 *
 * /profile no muestra un perfil, muestra "el perfil del que esta mirando": no
 * lleva ningun id en la url, lo saca de la sesion. Asi que copiarla y pasarsela
 * a alguien nunca mostro tu perfil, le mostraba el suyo, y si no tenia sesion
 * lo mandaba a la portada. Se veia como un bug intermitente y en realidad la
 * url nunca fue compartible.
 *
 * Se arregla aca y no cambiando los links de todos lados: hay ocho lugares que
 * apuntan a /profile (el menu, el avatar de arriba, la home, y las cuatro
 * pantallas que te mandan ahi despues de loguearte o registrarte). Redirigiendo
 * quedan todos bien de una, y los links viejos que ya ande dando vueltas por el
 * discord tambien.
 */
const ProfileRedirect: React.FC = () => {
  const { user, isAuthenticated, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-osu-pink" />
      </div>
    );
  }

  // Sin sesion no hay a donde redirigir: que ProfilePage muestre su pantalla de
  // "necesitas iniciar sesion", que ya existe y esta bien escrita.
  if (!isAuthenticated || user == null) {
    return <ProfilePage />;
  }

  return <Navigate to={`/users/${user.id}`} replace />;
};

export default ProfileRedirect;
