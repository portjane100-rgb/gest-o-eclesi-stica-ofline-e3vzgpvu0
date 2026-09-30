import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export const ProtectedAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin, openLoginModal } = useAuth()
  const location = useLocation()

  if (!isAdmin) {
    // Abre o modal de login ao ser redirecionado para a home
    setTimeout(() => {
      openLoginModal()
    }, 100)
    return <Navigate to="/" state={{ from: location }} replace />
  }

  return <>{children}</>
}
