import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Envuelve una ruta que solo pueden ver los admins.
 *
 * /admin se chequeaba solo dentro de AdminPanel, pero /admin/beatmaps y
 * /admin/beatmaps/:id colgaban sueltas del router sin ningun control: cualquiera
 * deslogueado podia abrirlas y ver la pantalla entera. La api despues contesta
 * 403, asi que no se podia hacer nada, pero no hay razon para mostrar el panel
 * de moderacion a quien no es moderador.
 *
 * Espera a que termine el arranque antes de decidir: si no, en una carga fria
 * echa al admin de verdad, que es el bug por el que entrar al panel por un link
 * pegado nunca funcionaba.
 */
const RequireAdmin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isBootstrapping } = useAuth();
  const location = useLocation();

  if (isBootstrapping) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-osu-pink" />
      </div>
    );
  }

  // Sin sesion se manda al login y de ahi se vuelve aca solo. Mostrarle "no
  // tenes permiso" a alguien que simplemente no inicio sesion es una pantalla
  // sin salida: ni le dice que le falta, ni le da como arreglarlo.
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  }

  if (!user?.is_admin) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold">Admin</h2>
        <p className="mt-3">You do not have permission to view this page.</p>
      </div>
    );
  }

  return <>{children}</>;
};

export default RequireAdmin;
