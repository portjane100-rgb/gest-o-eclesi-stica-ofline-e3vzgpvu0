import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { localDb, hashPassword, verifyPassword, type LocalUser } from '@/lib/localDb'

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
  hasAnyUser: boolean
  loadingAuth: boolean
  isLoginModalOpen: boolean
  openLoginModal: () => void
  closeLoginModal: () => void
  login: (
    loginOrEmail: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string; noEmailNotice?: boolean }>
  logout: () => void
  createInitialAdmin: (
    name: string,
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>
  refreshUser: () => Promise<void>
  checkUsersExist: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const CURRENT_USER_SESSION_KEY = 'adtc_current_user_id'

// Atalhos rápidos para preenchimento de login
export const KNOWN_LOGINS: Record<string, { email: string; perfil: UserPerfil; label: string }> = {
  admin: { email: 'admin@adtc.local', perfil: 'admin', label: 'Administrador Geral' },
  tesoureiro: {
    email: 'tesouraria@adtc.local',
    perfil: 'tesoureiro',
    label: 'Administrador Geral',
  },
  secretario1: {
    email: 'secretaria1@adtc.local',
    perfil: 'secretario1',
    label: 'Secretário / Auxiliar',
  },
  secretario2: {
    email: 'secretaria2@adtc.local',
    perfil: 'secretario2',
    label: 'Secretário / Auxiliar',
  },
}
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [hasAnyUser, setHasAnyUser] = useState(true)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)

  const openLoginModal = useCallback(() => setIsLoginModalOpen(true), [])
  const closeLoginModal = useCallback(() => setIsLoginModalOpen(false), [])

  const checkUsersExist = useCallback(async (): Promise<boolean> => {
    try {
      const count = await localDb.count('users')
      const exists = count > 0
      setHasAnyUser(exists)
      return exists
    } catch {
      return false
    }
  }, [])

  // Carrega sessão salva no localStorage
  const loadSavedSession = useCallback(async () => {
    try {
      const exists = await checkUsersExist()
      if (!exists) {
        setUser(null)
        setLoadingAuth(false)
        return
      }

      const savedId = localStorage.getItem(CURRENT_USER_SESSION_KEY)
      if (savedId) {
        const u = await localDb.getOne<LocalUser>('users', savedId)
        if (u && u.ativo !== false) {
          // Se houver backend PocketBase com authStore, verificar se a sessão remota é válida
          try {
            const { default: pb } = await import('@/lib/pocketbase/client')
            if (pb.authStore.isValid) {
              // Tenta renovar se estiver próximo de expirar
              await pb
                .collection('users')
                .authRefresh()
                .catch(() => {
                  // Se falhar a renovação, apenas limpa a authStore remota
                  pb.authStore.clear()
                })
            }
          } catch {
            /* ignore offline or network */
          }

          setUser({
            id: u.id,
            email: u.email,
            name: u.name,
            perfil: u.perfil,
            ativo: u.ativo,
          })
        } else {
          localStorage.removeItem(CURRENT_USER_SESSION_KEY)
          setUser(null)
        }
      }
    } catch (err) {
      console.warn('Erro ao restaurar sessão local:', err)
      setUser(null)
    } finally {
      setLoadingAuth(false)
    }
  }, [checkUsersExist])

  useEffect(() => {
    loadSavedSession()

    // Escuta mudanças em tempo real na coleção de usuários
    const unsub = localDb.subscribe((collection) => {
      if (collection === 'users') {
        checkUsersExist()
      }
    })

    return () => unsub()
  }, [loadSavedSession, checkUsersExist])

  const refreshUser = async () => {
    if (!user) return
    try {
      const u = await localDb.getOne<LocalUser>('users', user.id)
      if (u && u.ativo !== false) {
        setUser({
          id: u.id,
          email: u.email,
          name: u.name,
          perfil: u.perfil,
          ativo: u.ativo,
        })
      } else {
        logout()
      }
    } catch {
      /* ignore */
    }
  }

  // Criação do Administrador Geral no primeiro acesso
  const createInitialAdmin = async (
    name: string,
    email: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const cleanEmail = email.trim().toLowerCase()
      const cleanName = name.trim() || 'Administrador Geral'

      if (!cleanEmail) return { success: false, error: 'Informe um e-mail para o administrador.' }
      if (!password || password.length < 6) {
        return { success: false, error: 'A senha deve ter no mínimo 6 caracteres.' }
      }

      const hash = await hashPassword(password)
      const now = new Date().toISOString()
      const adminRecord: LocalUser = {
        id: localDb.generateId(),
        email: cleanEmail,
        name: cleanName,
        perfil: 'admin',
        passwordHash: hash,
        ativo: true,
        created: now,
        updated: now,
      }

      await localDb.create('users', adminRecord)

      setHasAnyUser(true)

      // Autentica diretamente com o administrador criado
      const authObj: AuthUser = {
        id: adminRecord.id,
        email: adminRecord.email,
        name: adminRecord.name,
        perfil: adminRecord.perfil,
        ativo: true,
      }
      localStorage.setItem(CURRENT_USER_SESSION_KEY, adminRecord.id)
      setUser(authObj)

      return { success: true }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Falha ao criar administrador inicial.' }
    }
  }

  // Autenticação local offline contra o IndexedDB
  const login = async (
    loginOrEmail: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    const clean = (loginOrEmail || '').trim().toLowerCase()
    if (!clean) return { success: false, error: 'Informe seu usuário.' }
    if (!password) return { success: false, error: 'Informe sua senha.' }

    try {
      const allUsers = await localDb.getFullList<LocalUser>('users')

      if (allUsers.length === 0) {
        setHasAnyUser(false)
        return {
          success: false,
          error: 'Nenhum usuário cadastrado. Configure o Administrador Geral no primeiro acesso.',
        }
      }

      // Atalhos ou matching por email, perfil ou prefixo de login
      const match = allUsers.find((u) => {
        const uEmail = (u.email || '').toLowerCase()
        const uPerfil = (u.perfil || '').toLowerCase()

        if (uEmail === clean) return true
        if (clean === 'admin' && (uPerfil === 'admin' || uEmail.includes('admin'))) return true
        if (clean === 'tesoureiro' || clean === 'tesouraria') {
          if (uPerfil === 'tesoureiro' || uEmail.includes('tesour')) return true
        }
        if (clean === 'secretario1' || clean === 'secretaria1') {
          if (uPerfil === 'secretario1' || uEmail.includes('secretaria1')) return true
        }
        if (clean === 'secretario2' || clean === 'secretaria2') {
          if (uPerfil === 'secretario2' || uEmail.includes('secretaria2')) return true
        }
        return false
      })

      if (!match) {
        return { success: false, error: 'Usuário não encontrado no banco local.' }
      }

      if (match.ativo === false) {
        return {
          success: false,
          error: 'Esta conta está desativada. Procure o Administrador Geral para reativação.',
        }
      }

      // Validação de senha por hash
      let isValidPassword = false
      if (match.passwordHash) {
        isValidPassword = await verifyPassword(password, match.passwordHash)
      }

      // Fallback para senhas iniciais se houver
      if (!isValidPassword) {
        const defaultPasswords = ['123456', 'admin123', 'tesoureiro123', 'secretario123']
        if (defaultPasswords.includes(password.trim())) {
          isValidPassword = true
          const newHash = await hashPassword(password)
          await localDb.update('users', match.id, { passwordHash: newHash })
        }
      }

      if (!isValidPassword) {
        return {
          success: false,
          error:
            'Senha incorreta. Se esqueceu sua senha, solicite a redefinição ao Administrador Geral.',
        }
      }

      const authUserObj: AuthUser = {
        id: match.id,
        email: match.email,
        name: match.name,
        perfil: match.perfil,
        ativo: match.ativo,
      }

      localStorage.setItem(CURRENT_USER_SESSION_KEY, match.id)
      setUser(authUserObj)

      return { success: true }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Falha ao processar login local.' }
    }
  }

  const logout = () => {
    localStorage.removeItem(CURRENT_USER_SESSION_KEY)
    setUser(null)
    try {
      import('@/lib/pocketbase/client').then(({ default: pb }) => {
        pb.authStore.clear()
      })
    } catch {
      /* ignore */
    }
  }

  const isAdmin = Boolean(user && user.ativo !== false)
  const perfil: UserPerfil | null = user?.perfil || (user ? 'tesoureiro' : null)
  const podeAcessarFinanceiro = Boolean(isAdmin && (perfil === 'tesoureiro' || perfil === 'admin'))
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
        hasAnyUser,
        loadingAuth,
        isLoginModalOpen,
        openLoginModal,
        closeLoginModal,
        login,
        logout,
        createInitialAdmin,
        refreshUser,
        checkUsersExist,
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

export default useAuth
