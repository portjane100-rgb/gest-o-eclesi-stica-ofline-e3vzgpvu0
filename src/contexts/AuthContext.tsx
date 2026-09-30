import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import pb from '@/lib/pocketbase/client'

export type UserPerfil = 'tesoureiro' | 'secretario1' | 'secretario2' | 'admin'

export interface AuthUser {
  id: string
  email: string
  name?: string
  perfil?: UserPerfil
  ativo?: boolean
}

interface AuthContextType {
  isAdmin: boolean
  user: AuthUser | null
  perfil: UserPerfil | null
  podeAcessarFinanceiro: boolean
  isTesoureiro: boolean
  isSecretario: boolean
  login: (
    loginOrEmail: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string; noEmailNotice?: boolean }>
  logout: () => void
  isLoginModalOpen: boolean
  openLoginModal: () => void
  closeLoginModal: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const SHARED_ADMIN_EMAIL = 'portelajane@outlook.com'

// Perfis conhecidos mapeados por atalhos de login
export const KNOWN_LOGINS: Record<string, { email: string; perfil: UserPerfil; label: string }> = {
  tesoureiro: { email: 'tesouraria@adtc.local', perfil: 'tesoureiro', label: 'Tesoureiro' },
  tesouraria: { email: 'tesouraria@adtc.local', perfil: 'tesoureiro', label: 'Tesoureiro' },
  'tesouraria@adtc.local': {
    email: 'tesouraria@adtc.local',
    perfil: 'tesoureiro',
    label: 'Tesoureiro',
  },
  secretario1: { email: 'cvalderlanio@gmail.com', perfil: 'secretario1', label: 'Secretário 1' },
  secretaria1: { email: 'cvalderlanio@gmail.com', perfil: 'secretario1', label: 'Secretário 1' },
  'secretaria1@adtc.local': {
    email: 'cvalderlanio@gmail.com',
    perfil: 'secretario1',
    label: 'Secretário 1',
  },
  'cvalderlanio@gmail.com': {
    email: 'cvalderlanio@gmail.com',
    perfil: 'secretario1',
    label: 'Secretário 1',
  },
  secretario2: { email: 'secretaria2@adtc.local', perfil: 'secretario2', label: 'Secretário 2' },
  secretaria2: { email: 'secretaria2@adtc.local', perfil: 'secretario2', label: 'Secretário 2' },
  'secretaria2@adtc.local': {
    email: 'secretaria2@adtc.local',
    perfil: 'secretario2',
    label: 'Secretário 2',
  },
  admin: { email: SHARED_ADMIN_EMAIL, perfil: 'admin', label: 'Administrador Geral' },
  [SHARED_ADMIN_EMAIL]: {
    email: SHARED_ADMIN_EMAIL,
    perfil: 'admin',
    label: 'Administrador Geral',
  },
}

function parseAuthUser(record: any): AuthUser | null {
  if (!record || record.email === 'assistente@adtc.local') {
    return null
  }

  // Determinar perfil
  let perfil: UserPerfil = (record.perfil as UserPerfil) || 'tesoureiro'
  if (record.email === SHARED_ADMIN_EMAIL && !record.perfil) {
    perfil = 'admin'
  }

  const ativo = record.ativo !== undefined ? Boolean(record.ativo) : true

  return {
    id: record.id,
    email: record.email,
    name: record.name,
    perfil,
    ativo,
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (pb.authStore.isValid && pb.authStore.record) {
      const u = parseAuthUser(pb.authStore.record)
      if (u && u.ativo !== false) return u
    }
    return null
  })

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)

  const syncUserFromStore = useCallback(() => {
    if (pb.authStore.isValid && pb.authStore.record) {
      const u = parseAuthUser(pb.authStore.record)
      if (u && u.ativo !== false) {
        setUser(u)
        return
      }
    }
    setUser(null)
  }, [])

  useEffect(() => {
    const unsubscribe = pb.authStore.onChange((_token, model) => {
      if (model) {
        const u = parseAuthUser(model)
        if (u && u.ativo !== false) {
          setUser(u)
          return
        }
      }
      setUser(null)
    })
    return () => unsubscribe()
  }, [])

  const refreshUser = async () => {
    try {
      if (pb.authStore.isValid) {
        await pb.collection('users').authRefresh()
        syncUserFromStore()
      }
    } catch {
      // Ignora erro de refresh
    }
  }

  // Login exclusivamente individual por usuário ou e-mail e senha própria
  const login = async (
    loginOrEmail: string,
    password: string,
  ): Promise<{ success: boolean; error?: string; noEmailNotice?: boolean }> => {
    const clean = (loginOrEmail || '').trim().toLowerCase()
    if (!clean) return { success: false, error: 'Informe seu usuário ou e-mail.' }
    if (!password) return { success: false, error: 'Informe sua senha.' }

    // Tentativa 1: se for atalho rápido configurado em KNOWN_LOGINS
    let targetEmailOrUser = clean
    if (KNOWN_LOGINS[clean]) {
      targetEmailOrUser = KNOWN_LOGINS[clean].email
    }

    try {
      const authData = await pb.collection('users').authWithPassword(targetEmailOrUser, password)
      const parsed = parseAuthUser(authData.record)

      if (!parsed) {
        pb.authStore.clear()
        return { success: false, error: 'Usuário não autorizado para acesso ao painel.' }
      }

      if (parsed.ativo === false) {
        pb.authStore.clear()
        return {
          success: false,
          error:
            'Esta conta está temporariamente desativada. Procure o Tesoureiro para reativação.',
        }
      }

      setUser(parsed)
      setIsLoginModalOpen(false)
      return { success: true }
    } catch (err: any) {
      // Se tentou atalho ou username e falhou, se a entrada original era diferente (ex: o usuário digitou o e-mail real)
      if (targetEmailOrUser !== clean) {
        try {
          const authData2 = await pb.collection('users').authWithPassword(clean, password)
          const parsed2 = parseAuthUser(authData2.record)
          if (parsed2) {
            if (parsed2.ativo === false) {
              pb.authStore.clear()
              return {
                success: false,
                error:
                  'Esta conta está temporariamente desativada. Procure o Tesoureiro para reativação.',
              }
            }
            setUser(parsed2)
            setIsLoginModalOpen(false)
            return { success: true }
          }
        } catch {
          // segue para a mensagem de erro
        }
      }

      // Se for secretário tentando logar e falhou, verificar se é caso de secretário sem e-mail cadastrado
      const isSecretarioLogin =
        clean === 'secretario1' ||
        clean === 'secretario2' ||
        clean.includes('secretaria') ||
        clean.includes('secretario')

      return {
        success: false,
        noEmailNotice: isSecretarioLogin,
        error:
          err?.status === 400 || err?.status === 404
            ? isSecretarioLogin
              ? 'Credenciais não encontradas. Se você é secretário e ainda não teve seu e-mail cadastrado pelo Tesoureiro, solicite a ele a autorização e a sua senha.'
              : 'Usuário/e-mail ou senha incorretos.'
            : err?.message || 'Falha na autenticação. Verifique os dados informados.',
      }
    }
  }

  const logout = () => {
    pb.authStore.clear()
    setUser(null)
  }

  const openLoginModal = () => setIsLoginModalOpen(true)
  const closeLoginModal = () => setIsLoginModalOpen(false)

  // Permissões
  // Usuário é admin do sistema se estiver autenticado com uma conta ativa
  const isAdmin = Boolean(user && user.ativo !== false)

  // Perfil efetivo
  const perfil: UserPerfil | null = user?.perfil || (user ? 'tesoureiro' : null)

  // Tesoureiro e Admin Geral têm acesso total, inclusive ao financeiro
  // Secretário 1 e Secretário 2 ficam privados APENAS do financeiro
  const podeAcessarFinanceiro = Boolean(isAdmin && (perfil === 'tesoureiro' || perfil === 'admin'))

  // Tesoureiro é o gerente do sistema (controle de logins e financeiro)
  const isTesoureiro = Boolean(isAdmin && (perfil === 'tesoureiro' || perfil === 'admin'))
  const isSecretario = Boolean(isAdmin && (perfil === 'secretario1' || perfil === 'secretario2'))

  return (
    <AuthContext.Provider
      value={{
        isAdmin,
        user,
        perfil,
        podeAcessarFinanceiro,
        isTesoureiro,
        isSecretario,
        login,
        logout,
        isLoginModalOpen,
        openLoginModal,
        closeLoginModal,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}
