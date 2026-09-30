import React, { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import type { Configuracao } from '@/types/adtc'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { processSignatureImage } from '@/lib/signatureProcessor'
import {
  KeyRound,
  QrCode,
  Lock,
  Check,
  Loader2,
  Eye,
  EyeOff,
  Upload,
  Trash2,
  Image as ImageIcon,
  PenTool,
  Sparkles,
  Users,
  Coins,
  FileText,
  UserCheck,
  UserX,
  Edit2,
  Save,
  PlusCircle,
  AlertOctagon,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { ModoRevendaSection } from '@/components/ModoRevendaSection'
import { KitImplantacaoSection } from '@/components/KitImplantacaoSection'
import { BackupRestoreSection } from '@/components/BackupRestoreSection'
import { ModelosDocumentosSection } from '@/components/ModelosDocumentosSection'
import { hashPassword, localDb } from '@/lib/localDb'

interface PerfilUserRecord {
  id: string
  email: string
  name: string
  perfil: 'tesoureiro' | 'secretario1' | 'secretario2' | 'admin'
  ativo: boolean
}

export const AdminConfig: React.FC = () => {
  const { user: currentAuthUser, isTesoureiro } = useAuth()
  const { toast } = useToast()

  const [chavePix, setChavePix] = useState('')
  const [pixRecordId, setPixRecordId] = useState<string | null>(null)
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null)
  const [qrRecordId, setQrRecordId] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isSavingPix, setIsSavingPix] = useState(false)
  const [isUploadingQr, setIsUploadingQr] = useState(false)

  // Assinaturas e Liderança dos Documentos Oficiais
  const [nomePastor, setNomePastor] = useState('José Francisco Portela Fontenele')
  const [cargoPastor, setCargoPastor] = useState('Pastor')
  const [nome1Secretario, setNome1Secretario] = useState('Valderlanio Carneiro Araújo')
  const [cargo1Secretario, setCargo1Secretario] = useState('1ºSecretário')
  const [nome2Secretario, setNome2Secretario] = useState('Antonio de Vasconcelos')
  const [cargo2Secretario, setCargo2Secretario] = useState('2ºSecretário')
  const [isSavingLideranca, setIsSavingLideranca] = useState(false)

  // Imagens das Assinaturas Manuscritas
  const [sigPastorUrl, setSigPastorUrl] = useState<string | null>(null)
  const [sigPastorRecordId, setSigPastorRecordId] = useState<string | null>(null)
  const [sig1SecUrl, setSig1SecUrl] = useState<string | null>(null)
  const [sig1SecRecordId, setSig1SecRecordId] = useState<string | null>(null)
  const [sig2SecUrl, setSig2SecUrl] = useState<string | null>(null)
  const [sig2SecRecordId, setSig2SecRecordId] = useState<string | null>(null)
  const [uploadingSigKey, setUploadingSigKey] = useState<string | null>(null)

  // Pré-visualização de assinatura processada antes de confirmar gravação
  const [pendingSig, setPendingSig] = useState<{
    chave: 'assinatura_pastor' | 'assinatura_secretario1' | 'assinatura_secretario2'
    file: File
    previewUrl: string
    title: string
    width: number
    height: number
    processed: boolean
  } | null>(null)
  const [isProcessingSig, setIsProcessingSig] = useState(false)

  // Gestão dos Logins (Tesoureiro como gerente do sistema)
  const [perfisUsers, setPerfisUsers] = useState<PerfilUserRecord[]>([])
  const [isLoadingPerfis, setIsLoadingPerfis] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPerfil, setEditPerfil] = useState<
    'tesoureiro' | 'secretario1' | 'secretario2' | 'admin'
  >('tesoureiro')
  const [editPassword, setEditPassword] = useState('')
  const [editPasswordConfirm, setEditPasswordConfirm] = useState('')
  const [editAtivo, setEditAtivo] = useState(true)
  const [showEditPassword, setShowEditPassword] = useState(false)
  const [isSavingUser, setIsSavingUser] = useState(false)

  // Modal para cadastrar novo login de secretário (Tesoureiro)
  // Modal de Zerar Dados do Sistema (Ação Perigosa / Modo Revenda)
  const [isZerarModalOpen, setIsZerarModalOpen] = useState(false)
  const [zerarConfirmacaoTexto, setZerarConfirmacaoTexto] = useState('')
  const [isZerandoDados, setIsZerandoDados] = useState(false)
  const [resultadoZerar, setResultadoZerar] = useState<{
    counts: Record<string, number>
    totalDeleted: number
  } | null>(null)

  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPerfil, setNewUserPerfil] = useState<'secretario1' | 'secretario2' | 'tesoureiro'>(
    'secretario1',
  )
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserPasswordConfirm, setNewUserPasswordConfirm] = useState('')
  const [isCreatingUser, setIsCreatingUser] = useState(false)

  // Troca de senha da PRÓPRIA conta do usuário atualmente logado
  const [ownOldPassword, setOwnOldPassword] = useState('')
  const [ownNewPassword, setOwnNewPassword] = useState('')
  const [ownConfirmPassword, setOwnConfirmPassword] = useState('')
  const [showOwnPassword, setShowOwnPassword] = useState(false)
  const [isChangingOwnPass, setIsChangingOwnPass] = useState(false)

  const handleExecutarZerarDados = async () => {
    if (zerarConfirmacaoTexto.trim().toUpperCase() !== 'ZERAR') {
      toast({
        variant: 'destructive',
        title: 'Confirmação incorreta',
        description: 'Digite exatamente a palavra ZERAR em maiúsculas para confirmar.',
      })
      return
    }

    setIsZerandoDados(true)
    try {
      const collectionsToClear = [
        'membros',
        'congregados',
        'obreiros',
        'dizimistas',
        'patrimonio',
        'escala',
        'escala_semana',
        'calendario',
        'agenda_semanal',
        'albuns_fotos',
        'fotos',
        'cartas_recebidas',
        'solicitacoes_cadastro',
        'planilhas_mensais',
      ]

      const counts: Record<string, number> = {}
      let totalDeleted = 0

      for (const col of collectionsToClear) {
        const c = await localDb.count(col)
        counts[col] = c
        totalDeleted += c
        await localDb.clearCollection(col)
      }

      setResultadoZerar({
        counts,
        totalDeleted,
      })

      toast({
        title: 'Dados operacionais zerados com sucesso!',
        description: `${totalDeleted} registros operacionais foram apagados do computador. Logins, congregações e configurações foram preservados.`,
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao zerar dados',
        description: err?.message || 'Falha ao executar operação.',
      })
    } finally {
      setIsZerandoDados(false)
    }
  }

  const fetchPerfisUsers = async () => {
    setIsLoadingPerfis(true)
    try {
      const records = await pb.collection('users').getFullList<any>({
        sort: 'created',
      })
      const filtered: PerfilUserRecord[] = records
        .filter((r) => r.email !== 'assistente@adtc.local' && r.name !== 'Visitante Assistente')
        .map((r) => ({
          id: r.id,
          email: r.email || '',
          name: r.name || '',
          perfil:
            (r.perfil as any) ||
            (r.email === 'portelajane@outlook.com'
              ? 'admin'
              : r.email === 'tesouraria@adtc.local'
                ? 'tesoureiro'
                : r.email === 'cvalderlanio@gmail.com' || r.email === 'secretaria1@adtc.local'
                  ? 'secretario1'
                  : 'secretario2'),
          ativo: r.ativo !== undefined ? Boolean(r.ativo) : true,
        }))
      setPerfisUsers(filtered)
    } catch (err) {
      console.error('Erro ao carregar usuários:', err)
    } finally {
      setIsLoadingPerfis(false)
    }
  }

  useEffect(() => {
    fetchPerfisUsers()
  }, [])

  useEffect(() => {
    const fetchPix = async () => {
      try {
        const records = await pb.collection('configuracoes').getFullList<Configuracao>()
        records.forEach((conf) => {
          if (conf.chave === 'pix_chave_copia_e_cola') {
            setPixRecordId(conf.id)
            setChavePix(conf.valor || '')
          }
          if (conf.chave === 'pix_qr_code_imagem') {
            setQrRecordId(conf.id)
            if (conf.arquivo) {
              setQrCodeImage(pb.files.getURL(conf, conf.arquivo))
            }
          }
          if (conf.chave === 'lideranca_nome_pastor' && conf.valor) setNomePastor(conf.valor)
          if (conf.chave === 'lideranca_cargo_pastor' && conf.valor) setCargoPastor(conf.valor)
          if (conf.chave === 'lideranca_nome_1_secretario' && conf.valor)
            setNome1Secretario(conf.valor)
          if (conf.chave === 'lideranca_cargo_1_secretario' && conf.valor)
            setCargo1Secretario(conf.valor)
          if (conf.chave === 'lideranca_nome_2_secretario' && conf.valor)
            setNome2Secretario(conf.valor)
          if (conf.chave === 'lideranca_cargo_2_secretario' && conf.valor)
            setCargo2Secretario(conf.valor)

          // Assinaturas em arquivo ou base64
          if (conf.chave === 'assinatura_pastor') {
            setSigPastorRecordId(conf.id)
            if (conf.arquivo) {
              setSigPastorUrl(pb.files.getURL(conf, conf.arquivo))
            } else if (conf.valor && conf.valor.startsWith('data:image')) {
              setSigPastorUrl(conf.valor)
            }
          }
          if (conf.chave === 'assinatura_secretario1') {
            setSig1SecRecordId(conf.id)
            if (conf.arquivo) {
              setSig1SecUrl(pb.files.getURL(conf, conf.arquivo))
            } else if (conf.valor && conf.valor.startsWith('data:image')) {
              setSig1SecUrl(conf.valor)
            }
          }
          if (conf.chave === 'assinatura_secretario2') {
            setSig2SecRecordId(conf.id)
            if (conf.arquivo) {
              setSig2SecUrl(pb.files.getURL(conf, conf.arquivo))
            } else if (conf.valor && conf.valor.startsWith('data:image')) {
              setSig2SecUrl(conf.valor)
            }
          }
        })
      } catch {
        /* intentionally ignored */
      }
    }
    fetchPix()
  }, [])

  // Seleciona e pré-processa a imagem da assinatura via Canvas API
  const handleSelectAssinatura = async (
    chave: 'assinatura_pastor' | 'assinatura_secretario1' | 'assinatura_secretario2',
    file: File,
  ) => {
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Arquivo muito grande',
        description: 'A imagem deve ter no máximo 5MB.',
      })
      return
    }

    setIsProcessingSig(true)
    const titles: Record<string, string> = {
      assinatura_pastor: 'Assinatura do Pastor Presidente',
      assinatura_secretario1: 'Assinatura do 1º Secretário',
      assinatura_secretario2: 'Assinatura do 2º Secretário',
    }

    try {
      const result = await processSignatureImage(file)
      setPendingSig({
        chave,
        file: result.file,
        previewUrl: result.previewUrl,
        title: titles[chave] || 'Assinatura',
        width: result.width,
        height: result.height,
        processed: result.processed,
      })
    } catch (err: any) {
      console.error('Erro ao processar assinatura:', err)
      setPendingSig({
        chave,
        file,
        previewUrl: URL.createObjectURL(file),
        title: titles[chave] || 'Assinatura',
        width: 0,
        height: 0,
        processed: false,
      })
    } finally {
      setIsProcessingSig(false)
    }
  }

  // Grava definitivamente a assinatura confirmada no banco
  const handleConfirmarAssinatura = async () => {
    if (!pendingSig) return
    const { chave, file } = pendingSig
    setUploadingSigKey(chave)
    try {
      const formData = new FormData()
      formData.append('arquivo', file)
      formData.append(
        'valor',
        `Assinatura manuscrita tratada salva em ${new Date().toLocaleDateString('pt-BR')}`,
      )

      let recId =
        chave === 'assinatura_pastor'
          ? sigPastorRecordId
          : chave === 'assinatura_secretario1'
            ? sig1SecRecordId
            : sig2SecRecordId

      if (!recId) {
        try {
          const existing = await pb
            .collection('configuracoes')
            .getFirstListItem<Configuracao>(`chave='${chave}'`)
          recId = existing.id
        } catch {
          /* intentionally ignored */
        }
      }

      let updatedRec: Configuracao
      if (recId) {
        updatedRec = await pb.collection('configuracoes').update<Configuracao>(recId, formData)
      } else {
        formData.append('chave', chave)
        updatedRec = await pb.collection('configuracoes').create<Configuracao>(formData)
      }

      const fileUrl = updatedRec.arquivo ? pb.files.getURL(updatedRec, updatedRec.arquivo) : null

      if (chave === 'assinatura_pastor') {
        setSigPastorRecordId(updatedRec.id)
        setSigPastorUrl(fileUrl)
      } else if (chave === 'assinatura_secretario1') {
        setSig1SecRecordId(updatedRec.id)
        setSig1SecUrl(fileUrl)
      } else {
        setSig2SecRecordId(updatedRec.id)
        setSig2SecUrl(fileUrl)
      }

      toast({
        title: 'Assinatura salva com sucesso!',
        description:
          'A imagem foi recortada, com fundo transparente e contraste otimizado para documentos e carteirinhas.',
      })
      setPendingSig(null)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar assinatura',
        description: err?.message || 'Tente novamente.',
      })
    } finally {
      setUploadingSigKey(null)
    }
  }

  const handleRemoverAssinatura = async (
    chave: 'assinatura_pastor' | 'assinatura_secretario1' | 'assinatura_secretario2',
  ) => {
    const recId =
      chave === 'assinatura_pastor'
        ? sigPastorRecordId
        : chave === 'assinatura_secretario1'
          ? sig1SecRecordId
          : sig2SecRecordId

    if (!recId) return
    if (
      !confirm(
        'Deseja realmente remover esta assinatura? Os documentos voltarão a ter espaço para assinatura manual.',
      )
    )
      return

    setUploadingSigKey(chave)
    try {
      await pb.collection('configuracoes').update(recId, {
        arquivo: null,
        valor: '',
      })
      if (chave === 'assinatura_pastor') setSigPastorUrl(null)
      if (chave === 'assinatura_secretario1') setSig1SecUrl(null)
      if (chave === 'assinatura_secretario2') setSig2SecUrl(null)

      toast({
        title: 'Assinatura removida',
        description: 'Os documentos agora terão linha para assinatura manual.',
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover',
        description: err?.message,
      })
    } finally {
      setUploadingSigKey(null)
    }
  }

  const saveConfigChave = async (chave: string, valor: string) => {
    try {
      const existing = await pb
        .collection('configuracoes')
        .getFirstListItem<Configuracao>(`chave='${chave}'`)
      await pb.collection('configuracoes').update(existing.id, { valor })
    } catch {
      await pb.collection('configuracoes').create({ chave, valor })
    }
  }

  const handleSaveLideranca = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingLideranca(true)
    try {
      await Promise.all([
        saveConfigChave('lideranca_nome_pastor', nomePastor.trim()),
        saveConfigChave('lideranca_cargo_pastor', cargoPastor.trim()),
        saveConfigChave('lideranca_nome_1_secretario', nome1Secretario.trim()),
        saveConfigChave('lideranca_cargo_1_secretario', cargo1Secretario.trim()),
        saveConfigChave('lideranca_nome_2_secretario', nome2Secretario.trim()),
        saveConfigChave('lideranca_cargo_2_secretario', cargo2Secretario.trim()),
      ])
      toast({
        title: 'Assinaturas Atualizadas!',
        description:
          'Os novos nomes e cargos de Pastor e Secretários já estão sendo aplicados nos documentos oficiais.',
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar liderança',
        description: err?.message || 'Tente novamente.',
      })
    } finally {
      setIsSavingLideranca(false)
    }
  }

  const handleSavePix = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingPix(true)
    try {
      if (pixRecordId) {
        await pb.collection('configuracoes').update(pixRecordId, {
          valor: chavePix.trim(),
        })
      } else {
        const created = await pb.collection('configuracoes').create({
          chave: 'pix_chave_copia_e_cola',
          valor: chavePix.trim(),
        })
        setPixRecordId(created.id)
      }
      toast({
        title: 'Chave PIX atualizada!',
        description: 'A nova chave já está visível na página pública de doações.',
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar chave PIX',
        description: err?.message,
      })
    } finally {
      setIsSavingPix(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: 'Arquivo muito grande',
          description: 'A imagem deve ter no máximo 5MB.',
        })
        return
      }
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleUploadQrCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) return
    setIsUploadingQr(true)
    try {
      const formData = new FormData()
      formData.append('arquivo', selectedFile)

      if (qrRecordId) {
        const updated = await pb
          .collection('configuracoes')
          .update<Configuracao>(qrRecordId, formData)
        if (updated.arquivo) {
          setQrCodeImage(pb.files.getURL(updated, updated.arquivo))
        }
      } else {
        formData.append('chave', 'pix_qr_code_imagem')
        formData.append('valor', 'Imagem personalizada do QR Code')
        const created = await pb.collection('configuracoes').create<Configuracao>(formData)
        setQrRecordId(created.id)
        if (created.arquivo) {
          setQrCodeImage(pb.files.getURL(created, created.arquivo))
        }
      }

      setSelectedFile(null)
      setPreviewUrl(null)
      toast({
        title: 'Imagem do QR Code atualizada!',
        description: 'A nova imagem do QR Code já está disponível na página pública de doações.',
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar imagem do QR Code',
        description: err?.message || 'Tente novamente.',
      })
    } finally {
      setIsUploadingQr(false)
    }
  }

  const handleRemoveQrCode = async () => {
    if (!qrRecordId) return
    if (
      !confirm(
        'Deseja realmente remover a imagem personalizada do QR Code? O sistema voltará a gerar o código dinâmico a partir da chave PIX.',
      )
    )
      return

    setIsUploadingQr(true)
    try {
      await pb.collection('configuracoes').update(qrRecordId, {
        arquivo: null,
      })
      setQrCodeImage(null)
      setSelectedFile(null)
      setPreviewUrl(null)
      toast({
        title: 'Imagem removida com sucesso!',
        description: 'O QR Code voltará a ser gerado automaticamente pela chave.',
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover imagem',
        description: err?.message,
      })
    } finally {
      setIsUploadingQr(false)
    }
  }

  // Iniciar edição de um login individual
  const handleStartEditUser = (u: PerfilUserRecord) => {
    setEditingUserId(u.id)
    setEditName(u.name)
    setEditEmail(u.email)
    setEditPerfil(u.perfil)
    setEditPassword('')
    setEditPasswordConfirm('')
    setEditAtivo(u.ativo)
    setShowEditPassword(false)
  }

  const handleCancelEditUser = () => {
    setEditingUserId(null)
    setEditName('')
    setEditEmail('')
    setEditPerfil('tesoureiro')
    setEditPassword('')
    setEditPasswordConfirm('')
  }

  // Salvar alterações de um login (Nome, E-mail, Perfil, Senha e Ativo)
  const handleSaveUser = async (u: PerfilUserRecord) => {
    if (editPassword && editPassword.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Senha muito curta',
        description: 'A nova senha deve possuir pelo menos 6 caracteres.',
      })
      return
    }

    if (editPassword && editPassword !== editPasswordConfirm) {
      toast({
        variant: 'destructive',
        title: 'Confirmação incorreta',
        description: 'A confirmação de senha não confere com a nova senha digitada.',
      })
      return
    }

    if (!editEmail.trim()) {
      toast({
        variant: 'destructive',
        title: 'E-mail obrigatório',
        description: 'Informe um e-mail válido para este login.',
      })
      return
    }

    // Regra de segurança: impedir autodesativação do gerente (Tesoureiro)
    if (currentAuthUser?.id === u.id && !editAtivo) {
      toast({
        variant: 'destructive',
        title: 'Operação não permitida',
        description:
          'Você não pode desativar seu próprio login de gerente. O sistema precisa ter sempre um Tesoureiro ativo.',
      })
      return
    }

    // Regra de segurança: se estiver mudando perfil do Tesoureiro ou desativando, checar se resta outro Tesoureiro ativo
    const isTargetTesoureiro = u.perfil === 'tesoureiro' || u.perfil === 'admin'
    const changingToNonTesoureiro = editPerfil !== 'tesoureiro' && editPerfil !== 'admin'
    const isDeactivating = !editAtivo
    if (isTargetTesoureiro && (changingToNonTesoureiro || isDeactivating)) {
      const otherActiveTesoureiros = perfisUsers.filter(
        (other) =>
          other.id !== u.id &&
          other.ativo &&
          (other.perfil === 'tesoureiro' || other.perfil === 'admin'),
      ).length
      if (otherActiveTesoureiros === 0) {
        toast({
          variant: 'destructive',
          title: 'Sucessão necessária',
          description:
            'Deve haver sempre ao menos um usuário com perfil Tesoureiro ativo. Para transferir a função de gerente (sucessão), configure antes o novo Tesoureiro como ativo.',
        })
        return
      }
    }

    setIsSavingUser(true)
    try {
      const updateData: Record<string, any> = {
        email: editEmail.trim().toLowerCase(),
        name: editName.trim(),
        perfil: editPerfil,
        ativo: editAtivo,
      }
      if (editPassword.trim()) {
        updateData.passwordHash = await hashPassword(editPassword.trim())
      }

      await localDb.update('users', u.id, updateData)

      toast({
        title: 'Login salvo com sucesso!',
        description: `As alterações para ${editName || editEmail} foram gravadas localmente. A nova senha já está ativa.`,
      })

      setEditingUserId(null)
      await fetchPerfisUsers()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar usuário',
        description: err?.message || 'Tente novamente.',
      })
    } finally {
      setIsSavingUser(false)
    }
  }

  // Ativar / Desativar login
  const handleToggleUserAtivo = async (u: PerfilUserRecord) => {
    if (!isTesoureiro) {
      toast({
        variant: 'destructive',
        title: 'Permissão restrita',
        description: 'Apenas o Tesoureiro (gerente do sistema) pode ativar ou desativar logins.',
      })
      return
    }

    // Regra: impedir autodesativação do gerente
    if (currentAuthUser?.id === u.id && u.ativo) {
      toast({
        variant: 'destructive',
        title: 'Ação não permitida',
        description: 'Você não pode desativar seu próprio login de gerente.',
      })
      return
    }

    // Se estiver desativando um Tesoureiro, garantir que reste outro ativo
    if (u.ativo && (u.perfil === 'tesoureiro' || u.perfil === 'admin')) {
      const otherActive = perfisUsers.filter(
        (o) => o.id !== u.id && o.ativo && (o.perfil === 'tesoureiro' || o.perfil === 'admin'),
      ).length
      if (otherActive === 0) {
        toast({
          variant: 'destructive',
          title: 'Não é possível desativar',
          description: 'O sistema deve manter sempre ao menos um gerente (Tesoureiro) ativo.',
        })
        return
      }
    }

    const novoStatus = !u.ativo
    try {
      await localDb.update('users', u.id, { ativo: novoStatus })

      toast({
        title: novoStatus ? 'Login ativado' : 'Login desativado',
        description: novoStatus
          ? 'O usuário agora pode efetuar login no painel local.'
          : 'O acesso deste usuário foi temporariamente bloqueado sem apagar nenhum dado.',
      })

      fetchPerfisUsers()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao alterar status',
        description: err?.message,
      })
    }
  }

  // Cadastrar novo login de secretário (Tesoureiro)
  const handleCreateNewUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUserEmail.trim()) {
      toast({
        variant: 'destructive',
        title: 'E-mail obrigatório',
        description: 'Informe o e-mail do secretário.',
      })
      return
    }

    if (!newUserPassword || newUserPassword.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Senha muito curta',
        description: 'A senha inicial deve ter no mínimo 6 caracteres.',
      })
      return
    }

    if (newUserPassword !== newUserPasswordConfirm) {
      toast({
        variant: 'destructive',
        title: 'Confirmação incorreta',
        description: 'A confirmação de senha não confere.',
      })
      return
    }

    setIsCreatingUser(true)
    try {
      const passHash = await hashPassword(newUserPassword.trim())
      await localDb.create('users', {
        id: localDb.generateId(),
        email: newUserEmail.trim().toLowerCase(),
        name:
          newUserName.trim() ||
          (newUserPerfil === 'secretario1' ? '1º Secretário' : '2º Secretário'),
        perfil: newUserPerfil,
        passwordHash: passHash,
        ativo: true,
      })

      toast({
        title: 'Login criado com sucesso!',
        description: `O e-mail ${newUserEmail} agora tem acesso local autorizado. Forneça a senha criada ao secretário.`,
      })

      setIsNewUserModalOpen(false)
      setNewUserName('')
      setNewUserEmail('')
      setNewUserPassword('')
      setNewUserPasswordConfirm('')
      fetchPerfisUsers()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar login',
        description: err?.message || 'Tente novamente.',
      })
    } finally {
      setIsCreatingUser(false)
    }
  }

  // Troca de senha da PRÓPRIA conta conectada
  const handleChangeOwnPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ownNewPassword || ownNewPassword.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Senha muito curta',
        description: 'A nova senha deve possuir pelo menos 6 caracteres.',
      })
      return
    }

    if (ownNewPassword !== ownConfirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Senhas divergentes',
        description: 'A confirmação de senha não confere com a nova senha digitada.',
      })
      return
    }

    setIsChangingOwnPass(true)
    try {
      if (!currentAuthUser?.id) throw new Error('Usuário não identificado na sessão.')

      const newHash = await hashPassword(ownNewPassword.trim())
      await localDb.update('users', currentAuthUser.id, {
        passwordHash: newHash,
      })

      toast({
        title: 'Sua senha foi alterada com sucesso!',
        description: 'A nova senha já está valendo para os seus próximos acessos.',
      })
      setOwnOldPassword('')
      setOwnNewPassword('')
      setOwnConfirmPassword('')
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao alterar senha',
        description: err?.message || 'Verifique se os dados estão corretos e tente novamente.',
      })
    } finally {
      setIsChangingOwnPass(false)
    }
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h2 className="font-serif text-2xl font-bold text-[#1E3A5F]">Configurações do Sistema</h2>
        <p className="text-xs sm:text-sm text-[#5A5A5A]">
          Modo Revenda, Kit de Implantação, gerenciamento de logins individuais por perfil, troca de
          senha e dados institucionais.
        </p>
      </div>

      {/* BACKUP & RESTAURAÇÃO LOCAL (OFFLINE / PENDRIVE / PASTA) */}
      <BackupRestoreSection />

      {/* MODELOS DE TEXTO DOS DOCUMENTOS PDF */}
      <ModelosDocumentosSection />

      {/* KIT DE IMPLANTAÇÃO (EXCLUSIVO DO TESOUREIRO PARA ENTREGA A NOVOS CLIENTES) */}
      {isTesoureiro && <KitImplantacaoSection />}

      {/* BLOCO DE AÇÃO PERIGOSA: ZERAR DADOS DO SISTEMA (MODO REVENDA) */}
      {isTesoureiro && (
        <Card className="border-rose-200 bg-rose-50/40 shadow-xs rounded-2xl overflow-hidden">
          <div className="h-1.5 bg-rose-600" />
          <CardHeader className="p-5 sm:p-6 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 border border-rose-300 text-rose-800 text-[11px] font-bold uppercase tracking-wider">
                  <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                  Zona de Risco • Revenda & Limpeza
                </div>
                <CardTitle className="font-serif text-xl font-bold text-rose-950 flex items-center gap-2">
                  Zerar Dados Operacionais do Sistema
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-rose-900/80">
                  Apaga todos os registros operacionais (membros, congregados, obreiros, dízimos,
                  escalas, eventos, patrimônio, fotos e documentos gerados).
                  <strong> Mantém intactos:</strong> congregações, configurações da igreja e contas
                  de usuários (logins).
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  setZerarConfirmacaoTexto('')
                  setResultadoZerar(null)
                  setIsZerarModalOpen(true)
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs sm:text-sm shadow-xs self-start sm:self-auto gap-1.5 shrink-0"
              >
                <Trash2 className="w-4 h-4" />
                Zerar dados do sistema
              </Button>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* MODO REVENDA (IDENTIDADE, CORES, TEXTOS, RÓTULOS, LOGO) */}
      <ModoRevendaSection />

      {/* SEÇÃO PRINCIPAL: CONTROLE TOTAL DOS LOGINS (EXCLUSIVO DO TESOUREIRO / GERENTE DO SISTEMA) */}
      {isTesoureiro ? (
        <Card className="border-[#E6E2D8] bg-white shadow-xs rounded-2xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-amber-500 via-[#1E3A5F] to-emerald-600" />
          <CardHeader className="p-5 sm:p-6 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="font-serif text-xl font-bold text-[#1E3A5F] flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#C9A227]" />
                  Gerenciamento dos Logins Individuais
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-[#5A5A5A] mt-1">
                  Como <strong>Tesoureiro (gerente do sistema)</strong>, você tem controle total
                  para autorizar e-mails dos secretários, definir e fornecer senhas, alternar perfis
                  de sucessão e gerenciar os acessos.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsNewUserModalOpen(true)}
                  className="bg-[#1E3A5F] hover:bg-[#16304F] text-white text-xs font-semibold gap-1.5"
                >
                  <PlusCircle className="w-4 h-4 text-[#C9A227]" />
                  Novo Login de Secretário
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={fetchPerfisUsers}
                  disabled={isLoadingPerfis}
                  className="text-xs border-[#E6E2D8] text-slate-700"
                >
                  {isLoadingPerfis ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                  Atualizar lista
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-5 sm:p-6 pt-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Cards dos 3 perfis mapeados vinculados estritamente por perfil */}
              {[
                {
                  perfilKey: 'tesoureiro' as const,
                  titulo: 'Tesoureiro (Gerente)',
                  loginSug: 'tesoureiro',
                  emailPadrao: 'tesouraria@adtc.local',
                  descricao:
                    'Gerente geral: Acesso total a logins, dízimos, ofertas, relatórios e SEDE.',
                  badgeCor: 'bg-amber-100 text-amber-900 border-amber-300',
                  icone: Coins,
                },
                {
                  perfilKey: 'secretario1' as const,
                  titulo: '1º Secretário',
                  loginSug: 'secretario1',
                  emailPadrao: 'secretaria1@adtc.local',
                  descricao:
                    'Membros, congregados, obreiros, atas, documentos e escalas. Sem módulo financeiro.',
                  badgeCor: 'bg-blue-100 text-blue-900 border-blue-300',
                  icone: FileText,
                },
                {
                  perfilKey: 'secretario2' as const,
                  titulo: '2º Secretário',
                  loginSug: 'secretario2',
                  emailPadrao: 'secretaria2@adtc.local',
                  descricao:
                    'Membros, congregações, documentos oficiais, fotos e patrimônio. Sem módulo financeiro.',
                  badgeCor: 'bg-indigo-100 text-indigo-900 border-indigo-300',
                  icone: FileText,
                },
              ].map((p) => {
                // Vinculação estrita por PERFIL (nunca por e-mail vazio ou fallback genérico)
                const userRec =
                  perfisUsers.find((u) => u.perfil === p.perfilKey) ||
                  (p.perfilKey === 'tesoureiro'
                    ? perfisUsers.find((u) => u.perfil === 'admin')
                    : null) ||
                  null

                const isEditing = Boolean(userRec && editingUserId === userRec.id)
                const Icon = p.icone
                const isSelf = currentAuthUser?.id === userRec?.id

                return (
                  <div
                    key={p.perfilKey}
                    className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                      userRec?.ativo === false
                        ? 'bg-slate-50 border-slate-200 opacity-80'
                        : 'bg-[#F7F5F0] border-[#E6E2D8] shadow-2xs'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-white border border-[#E6E2D8] flex items-center justify-center text-[#1E3A5F] shadow-2xs">
                            <Icon className="w-4 h-4 text-[#C9A227]" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-[#1E3A5F] leading-tight">
                              {p.titulo}
                            </h4>
                            <span className="text-[10px] font-mono text-slate-500">
                              login: @{p.loginSug}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            userRec?.ativo === false
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : p.badgeCor
                          }`}
                        >
                          {userRec?.ativo === false ? 'Desativado' : 'Ativo'}
                        </span>
                      </div>

                      <p className="text-[11px] text-[#5A5A5A] leading-relaxed">{p.descricao}</p>

                      {/* Exibição normal ou modo de edição */}
                      {isEditing && userRec ? (
                        <div className="space-y-2 pt-2 border-t border-slate-200">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                              Perfil de Acesso (Sucessão)
                            </label>
                            <select
                              value={editPerfil}
                              onChange={(e) => setEditPerfil(e.target.value as any)}
                              className="w-full h-8 text-xs bg-white border border-[#E6E2D8] rounded-md px-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#C9A227]"
                            >
                              <option value="tesoureiro">
                                Tesoureiro (Gerente - Acesso total)
                              </option>
                              <option value="secretario1">
                                1º Secretário (Tudo exceto financeiro)
                              </option>
                              <option value="secretario2">
                                2º Secretário (Tudo exceto financeiro)
                              </option>
                            </select>
                            <p className="text-[9px] text-amber-700">
                              Use para sucessão pastoral ou administrativa (deve haver sempre ao
                              menos 1 Tesoureiro ativo).
                            </p>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                              Nome de Exibição
                            </label>
                            <Input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              placeholder="Ex: Nome da pessoa"
                              className="h-8 text-xs bg-white border-[#E6E2D8]"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                              E-mail Real Cadastrado para Login *
                            </label>
                            <Input
                              type="email"
                              value={editEmail}
                              onChange={(e) => setEditEmail(e.target.value)}
                              placeholder="exemplo@gmail.com"
                              className="h-8 text-xs bg-white border-[#E6E2D8]"
                              required
                            />
                            <p className="text-[9px] text-slate-500">
                              O usuário poderá entrar com este e-mail real ou com @{p.loginSug}.
                            </p>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                                Redefinir Senha
                              </label>
                              <button
                                type="button"
                                onClick={() => setShowEditPassword(!showEditPassword)}
                                className="text-[9px] text-[#C9A227] hover:underline"
                              >
                                {showEditPassword ? 'Ocultar' : 'Ver'}
                              </button>
                            </div>
                            <Input
                              type={showEditPassword ? 'text' : 'password'}
                              value={editPassword}
                              onChange={(e) => setEditPassword(e.target.value)}
                              placeholder="Digite a nova senha (mín 6)..."
                              className="h-8 text-xs bg-white border-[#E6E2D8]"
                            />
                          </div>

                          {editPassword && (
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                                Confirmar Nova Senha *
                              </label>
                              <Input
                                type={showEditPassword ? 'text' : 'password'}
                                value={editPasswordConfirm}
                                onChange={(e) => setEditPasswordConfirm(e.target.value)}
                                placeholder="Repita a senha digitada..."
                                className="h-8 text-xs bg-white border-[#E6E2D8]"
                              />
                            </div>
                          )}

                          <div className="flex items-center gap-2 pt-1">
                            <input
                              type="checkbox"
                              id={`ativo-${p.perfilKey}`}
                              checked={editAtivo}
                              disabled={isSelf}
                              onChange={(e) => setEditAtivo(e.target.checked)}
                              className="rounded border-slate-300 text-[#1E3A5F] focus:ring-[#C9A227] disabled:opacity-50"
                            />
                            <label
                              htmlFor={`ativo-${p.perfilKey}`}
                              className={`text-xs font-medium cursor-pointer ${
                                isSelf ? 'text-slate-400' : 'text-slate-700'
                              }`}
                            >
                              Conta ativa para login {isSelf && '(seu próprio login)'}
                            </label>
                          </div>

                          <div className="flex gap-1.5 pt-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={handleCancelEditUser}
                              disabled={isSavingUser}
                              className="h-7 text-[11px] flex-1 border-slate-300"
                            >
                              Cancelar
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleSaveUser(userRec)}
                              disabled={isSavingUser}
                              className="h-7 text-[11px] flex-1 bg-[#1E3A5F] text-white hover:bg-[#16304F]"
                            >
                              {isSavingUser ? (
                                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                              ) : (
                                <Save className="w-3 h-3 mr-1 text-[#C9A227]" />
                              )}
                              Salvar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2.5 bg-white rounded-lg border border-[#E6E2D8] text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-bold text-slate-400">
                              Nome cadastrado:
                            </span>
                            <span className="font-semibold text-slate-800 truncate max-w-[140px]">
                              {userRec?.name || 'Não informado'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-bold text-slate-400">
                              E-mail de acesso:
                            </span>
                            <span
                              className="font-mono text-[11px] text-slate-600 truncate max-w-[140px]"
                              title={userRec?.email || p.emailPadrao}
                            >
                              {userRec?.email || p.emailPadrao}
                            </span>
                          </div>
                          {userRec?.perfil && (
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] uppercase font-bold text-slate-400">
                                Perfil ativo:
                              </span>
                              <span className="text-[11px] text-slate-700 font-medium">
                                {userRec.perfil === 'tesoureiro' || userRec.perfil === 'admin'
                                  ? 'Tesoureiro (Gerente)'
                                  : userRec.perfil === 'secretario1'
                                    ? '1º Secretário'
                                    : '2º Secretário'}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Ações inferiores */}
                    {!isEditing && (
                      <div className="pt-3 border-t border-slate-200 mt-3 flex items-center justify-between gap-2">
                        {userRec ? (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStartEditUser(userRec)}
                              className="h-7 text-xs text-[#1E3A5F] hover:bg-white hover:text-[#C9A227] px-2 flex-1"
                              title="Editar nome, perfil de sucessão, e-mail e redefinir senha deste login"
                            >
                              <Edit2 className="w-3.5 h-3.5 mr-1" />
                              Editar / Senha
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={isSelf}
                              onClick={() => handleToggleUserAtivo(userRec)}
                              className={`h-7 text-xs px-2 ${
                                isSelf
                                  ? 'text-slate-300 cursor-not-allowed'
                                  : userRec.ativo === false
                                    ? 'text-emerald-700 hover:bg-emerald-50'
                                    : 'text-amber-800 hover:bg-amber-50'
                              }`}
                              title={
                                isSelf
                                  ? 'Você não pode desativar seu próprio login'
                                  : userRec.ativo === false
                                    ? 'Reativar login'
                                    : 'Desativar temporariamente'
                              }
                            >
                              {userRec.ativo === false ? (
                                <>
                                  <UserCheck className="w-3.5 h-3.5 mr-1" />
                                  Ativar
                                </>
                              ) : (
                                <>
                                  <UserX className="w-3.5 h-3.5 mr-1" />
                                  Desativar
                                </>
                              )}
                            </Button>
                          </>
                        ) : (
                          <div className="w-full text-center py-1">
                            <span className="text-[11px] text-slate-400">
                              Login não inicializado
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="p-3 bg-amber-50/80 border border-amber-200/90 rounded-xl text-amber-950 text-xs leading-relaxed flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-[#C9A227] flex-shrink-0 mt-0.5" />
              <div>
                <strong>Instrução ao Tesoureiro:</strong> Os secretários não têm acesso ao
                gerenciamento de logins. No primeiro acesso de um secretário, você (Tesoureiro)
                cadastra ou atualiza o e-mail pessoal dele no botão &quot;Editar / Senha&quot;,
                define uma senha inicial e a fornece diretamente ao secretário. Em caso de sucessão
                pastoral ou de liderança, use o seletor &quot;Perfil de Acesso&quot; para definir o
                novo Tesoureiro (o sistema exige sempre ao menos um Tesoureiro ativo).
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-[#E6E2D8] bg-[#F7F5F0] shadow-xs rounded-2xl">
          <CardHeader className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="font-serif text-lg font-bold text-[#1E3A5F]">
                  Gerenciamento de Logins do Sistema
                </CardTitle>
                <CardDescription className="text-xs text-[#5A5A5A] mt-0.5">
                  A área de gerenciamento, autorização e troca de senhas dos demais logins é de
                  acesso exclusivo do <strong>Tesoureiro (gerente do sistema)</strong>. Você pode
                  alterar sua própria senha no cartão abaixo.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card: Troca de Senha da Própria Conta Logada */}
        <Card className="border-[#E6E2D8] bg-white shadow-xs rounded-2xl">
          <CardHeader>
            <CardTitle className="font-serif text-lg font-bold text-[#1E3A5F] flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#C9A227]" />
              Minha Senha de Acesso
            </CardTitle>
            <CardDescription className="text-xs text-[#5A5A5A]">
              Altere a senha da sua própria conta atualmente conectada (
              <strong className="text-[#1E3A5F]">{currentAuthUser?.email}</strong>).
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleChangeOwnPassword} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">
                  Senha Atual (opcional se já autenticado)
                </label>
                <Input
                  type={showOwnPassword ? 'text' : 'password'}
                  value={ownOldPassword}
                  onChange={(e) => setOwnOldPassword(e.target.value)}
                  placeholder="Sua senha em uso..."
                  className="text-xs sm:text-sm border-[#E6E2D8]"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#1A1A1A]">Nova Senha</label>
                  <button
                    type="button"
                    onClick={() => setShowOwnPassword(!showOwnPassword)}
                    className="text-[11px] text-[#C9A227] hover:underline flex items-center gap-1 font-medium"
                  >
                    {showOwnPassword ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" /> Ocultar
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" /> Visualizar
                      </>
                    )}
                  </button>
                </div>
                <Input
                  type={showOwnPassword ? 'text' : 'password'}
                  value={ownNewPassword}
                  onChange={(e) => setOwnNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres..."
                  className="text-xs sm:text-sm border-[#E6E2D8]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">Confirmar Nova Senha</label>
                <Input
                  type={showOwnPassword ? 'text' : 'password'}
                  value={ownConfirmPassword}
                  onChange={(e) => setOwnConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha..."
                  className="text-xs sm:text-sm border-[#E6E2D8]"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isChangingOwnPass || !ownNewPassword || !ownConfirmPassword}
                className="w-full bg-[#1E3A5F] hover:bg-[#16304F] text-white text-xs font-semibold"
              >
                {isChangingOwnPass ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                    Salvando Nova Senha...
                  </>
                ) : (
                  'Salvar Minha Nova Senha'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Card: Chave PIX Pública */}
        <Card className="border-[#E6E2D8] bg-white shadow-xs rounded-2xl">
          <CardHeader>
            <CardTitle className="font-serif text-lg font-bold text-[#1E3A5F] flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-[#C9A227]" />
              Chave PIX de Doações
            </CardTitle>
            <CardDescription className="text-xs text-[#5A5A5A]">
              Edite a chave PIX (CNPJ, CPF, e-mail, telefone ou aleatória) exibida no site público e
              no banner de doações.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSavePix} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">
                  Chave PIX Copia e Cola
                </label>
                <Input
                  value={chavePix}
                  onChange={(e) => setChavePix(e.target.value)}
                  placeholder="Ex: 14.037.658/0001-82"
                  className="text-xs sm:text-sm border-[#E6E2D8] font-mono"
                />
              </div>

              <Button
                type="submit"
                disabled={isSavingPix || !chavePix.trim()}
                className="w-full bg-[#1E3A5F] hover:bg-[#16304F] text-white text-xs font-semibold"
              >
                {isSavingPix ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Chave PIX'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Card: Imagem do QR Code Substituível */}
        <Card className="border-[#E6E2D8] bg-white shadow-xs rounded-2xl md:col-span-2">
          <CardHeader>
            <CardTitle className="font-serif text-lg font-bold text-[#1E3A5F] flex items-center gap-2">
              <QrCode className="w-5 h-5 text-[#C9A227]" />
              Imagem do QR Code Oficial de Doações
            </CardTitle>
            <CardDescription className="text-xs text-[#5A5A5A]">
              Substitua o QR Code gerado por uma imagem oficial exportada do seu aplicativo
              bancário.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-4 p-3 bg-[#F7F5F0] rounded-xl border border-[#E6E2D8]">
              <div className="w-28 h-28 aspect-square rounded-lg bg-white border border-[#E6E2D8] flex items-center justify-center overflow-hidden flex-shrink-0 shadow-xs">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Pré-visualização do QR Code"
                    className="w-full h-full object-contain"
                  />
                ) : qrCodeImage ? (
                  <img
                    src={qrCodeImage}
                    alt="QR Code oficial cadastrado"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center p-2 text-slate-400">
                    <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-50" />
                    <span className="text-[10px] block leading-tight">QR dinâmico em uso</span>
                  </div>
                )}
              </div>

              <div className="text-xs text-[#5A5A5A] space-y-1.5 flex-1">
                <p className="font-semibold text-[#1E3A5F]">
                  {qrCodeImage ? 'Imagem personalizada ativa' : 'Nenhuma imagem enviada ainda'}
                </p>
                <p className="text-[11px] leading-relaxed">
                  {qrCodeImage
                    ? 'A página pública está exibindo a sua imagem oficial enviada.'
                    : 'A página pública está usando o QR Code dinâmico gerado a partir da chave PIX.'}
                </p>
                {qrCodeImage && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveQrCode}
                    disabled={isUploadingQr}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-7 px-2 text-xs"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Remover imagem e usar dinâmico
                  </Button>
                )}
              </div>
            </div>

            <form onSubmit={handleUploadQrCode} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">
                  Escolher imagem do QR Code (JPG, PNG ou SVG)
                </label>
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleFileChange}
                  className="text-xs border-[#E6E2D8] file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#1E3A5F] file:text-white"
                />
              </div>

              <Button
                type="submit"
                disabled={isUploadingQr || !selectedFile}
                className="w-full sm:w-auto bg-[#1E3A5F] hover:bg-[#16304F] text-white text-xs font-semibold px-6"
              >
                {isUploadingQr ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                    Enviando QR Code...
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    Substituir QR Code
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Card: Assinaturas e Liderança Eclesiástica para Documentos */}
        <Card className="border-[#E6E2D8] bg-white shadow-xs rounded-2xl md:col-span-2">
          <CardHeader>
            <CardTitle className="font-serif text-lg font-bold text-[#1E3A5F] flex items-center gap-2">
              <PenTool className="w-5 h-5 text-[#C9A227]" />
              Assinaturas dos Documentos Oficiais (Pastor e Secretários)
            </CardTitle>
            <CardDescription className="text-xs text-[#5A5A5A]">
              Personalize os nomes e cargos que assinam as Cartas de Recomendação, Cartas de
              Mudança, Cartão de Membro e Certificados da igreja.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSaveLideranca} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 bg-[#F7F5F0] rounded-xl border border-[#E6E2D8]">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#1E3A5F]">
                    Nome do Pastor Presidente *
                  </label>
                  <Input
                    value={nomePastor}
                    onChange={(e) => setNomePastor(e.target.value)}
                    placeholder="Ex: José Francisco Portela Fontenele"
                    className="text-xs sm:text-sm bg-white border-[#E6E2D8]"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#1E3A5F]">
                    Cargo / Título do Pastor
                  </label>
                  <Input
                    value={cargoPastor}
                    onChange={(e) => setCargoPastor(e.target.value)}
                    placeholder="Ex: Pastor"
                    className="text-xs sm:text-sm bg-white border-[#E6E2D8]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 bg-[#F7F5F0] rounded-xl border border-[#E6E2D8]">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#1E3A5F]">
                    Nome do 1º Secretário *
                  </label>
                  <Input
                    value={nome1Secretario}
                    onChange={(e) => setNome1Secretario(e.target.value)}
                    placeholder="Ex: Valderlanio Carneiro Araújo"
                    className="text-xs sm:text-sm bg-white border-[#E6E2D8]"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#1E3A5F]">Cargo do 1º Secretário</label>
                  <Input
                    value={cargo1Secretario}
                    onChange={(e) => setCargo1Secretario(e.target.value)}
                    placeholder="Ex: 1ºSecretário"
                    className="text-xs sm:text-sm bg-white border-[#E6E2D8]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 bg-[#F7F5F0] rounded-xl border border-[#E6E2D8]">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#1E3A5F]">
                    Nome do 2º Secretário *
                  </label>
                  <Input
                    value={nome2Secretario}
                    onChange={(e) => setNome2Secretario(e.target.value)}
                    placeholder="Ex: Antonio de Vasconcelos"
                    className="text-xs sm:text-sm bg-white border-[#E6E2D8]"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#1E3A5F]">Cargo do 2º Secretário</label>
                  <Input
                    value={cargo2Secretario}
                    onChange={(e) => setCargo2Secretario(e.target.value)}
                    placeholder="Ex: 2ºSecretário"
                    className="text-xs sm:text-sm bg-white border-[#E6E2D8]"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={isSavingLideranca}
                  className="bg-[#1E3A5F] hover:bg-[#16304F] text-white text-xs font-bold px-6 shadow-sm flex items-center gap-2"
                >
                  {isSavingLideranca ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Salvando Nomes...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 text-[#C9A227]" />
                      Salvar Nomes de Pastor e Secretários
                    </>
                  )}
                </Button>
              </div>
            </form>

            {/* SEÇÃO: UPLOAD DE ASSINATURAS MANUSCRITAS */}
            <div className="mt-8 pt-6 border-t border-[#E6E2D8] space-y-4">
              <div>
                <h3 className="font-serif text-base font-bold text-[#1E3A5F] flex items-center gap-2">
                  <PenTool className="w-4 h-4 text-[#C9A227]" />
                  Upload das Assinaturas Manuscritas (Rubrica / Imagem)
                </h3>
                <p className="text-xs text-[#5A5A5A] mt-0.5">
                  Envie foto nítida da assinatura manuscrita em papel branco. O sistema aplica com
                  fundo transparente em Cartas, Certificados e Carteirinhas.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Assinatura do Pastor */}
                <div className="p-4 bg-[#F7F5F0] rounded-xl border border-[#E6E2D8] flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-[#1E3A5F]">Assinatura do Pastor</span>
                      <span className="text-[10px] bg-[#1E3A5F]/10 text-[#1E3A5F] px-2 py-0.5 rounded font-semibold">
                        Pastor Presidente
                      </span>
                    </div>

                    <div className="w-full h-24 bg-white rounded-lg border border-[#E6E2D8] flex items-center justify-center overflow-hidden p-2 relative shadow-inner">
                      {sigPastorUrl ? (
                        <img
                          src={sigPastorUrl}
                          alt="Assinatura do Pastor"
                          className="max-h-full max-w-full object-contain filter contrast-125"
                        />
                      ) : (
                        <div className="text-center text-slate-400">
                          <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-40" />
                          <span className="text-[11px] block">Sem assinatura gravada</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <label className="block w-full">
                      <span className="sr-only">Escolher foto da assinatura</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        disabled={uploadingSigKey === 'assinatura_pastor' || isProcessingSig}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleSelectAssinatura('assinatura_pastor', file)
                          e.target.value = ''
                        }}
                        className="block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#1E3A5F] file:text-white hover:file:bg-[#16304F] cursor-pointer"
                      />
                    </label>

                    {sigPastorUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoverAssinatura('assinatura_pastor')}
                        disabled={uploadingSigKey === 'assinatura_pastor'}
                        className="w-full text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-7 text-xs font-medium"
                      >
                        <Trash2 className="w-3 h-3 mr-1" /> Remover assinatura
                      </Button>
                    )}
                  </div>
                </div>

                {/* 2. Assinatura do 1º Secretário */}
                <div className="p-4 bg-[#F7F5F0] rounded-xl border border-[#E6E2D8] flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-[#1E3A5F]">
                        Assinatura 1º Secretário
                      </span>
                      <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-semibold">
                        1º Secretário
                      </span>
                    </div>

                    <div className="w-full h-24 bg-white rounded-lg border border-[#E6E2D8] flex items-center justify-center overflow-hidden p-2 relative shadow-inner">
                      {sig1SecUrl ? (
                        <img
                          src={sig1SecUrl}
                          alt="Assinatura do 1º Secretário"
                          className="max-h-full max-w-full object-contain filter contrast-125"
                        />
                      ) : (
                        <div className="text-center text-slate-400">
                          <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-40" />
                          <span className="text-[11px] block">Sem assinatura gravada</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <label className="block w-full">
                      <span className="sr-only">Escolher foto da assinatura</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        disabled={uploadingSigKey === 'assinatura_secretario1' || isProcessingSig}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleSelectAssinatura('assinatura_secretario1', file)
                          e.target.value = ''
                        }}
                        className="block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#1E3A5F] file:text-white hover:file:bg-[#16304F] cursor-pointer"
                      />
                    </label>

                    {sig1SecUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoverAssinatura('assinatura_secretario1')}
                        disabled={uploadingSigKey === 'assinatura_secretario1'}
                        className="w-full text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-7 text-xs font-medium"
                      >
                        <Trash2 className="w-3 h-3 mr-1" /> Remover assinatura
                      </Button>
                    )}
                  </div>
                </div>

                {/* 3. Assinatura do 2º Secretário */}
                <div className="p-4 bg-[#F7F5F0] rounded-xl border border-[#E6E2D8] flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-[#1E3A5F]">
                        Assinatura 2º Secretário
                      </span>
                      <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-semibold">
                        2º Secretário
                      </span>
                    </div>

                    <div className="w-full h-24 bg-white rounded-lg border border-[#E6E2D8] flex items-center justify-center overflow-hidden p-2 relative shadow-inner">
                      {sig2SecUrl ? (
                        <img
                          src={sig2SecUrl}
                          alt="Assinatura do 2º Secretário"
                          className="max-h-full max-w-full object-contain filter contrast-125"
                        />
                      ) : (
                        <div className="text-center text-slate-400">
                          <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-40" />
                          <span className="text-[11px] block">Sem assinatura gravada</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <label className="block w-full">
                      <span className="sr-only">Escolher foto da assinatura</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        disabled={uploadingSigKey === 'assinatura_secretario2' || isProcessingSig}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleSelectAssinatura('assinatura_secretario2', file)
                          e.target.value = ''
                        }}
                        className="block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#1E3A5F] file:text-white hover:file:bg-[#16304F] cursor-pointer"
                      />
                    </label>

                    {sig2SecUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoverAssinatura('assinatura_secretario2')}
                        disabled={uploadingSigKey === 'assinatura_secretario2'}
                        className="w-full text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-7 text-xs font-medium"
                      >
                        <Trash2 className="w-3 h-3 mr-1" /> Remover assinatura
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MODAL: CADASTRAR NOVO LOGIN DE SECRETÁRIO (TESOUREIRO) */}
      <Dialog open={isNewUserModalOpen} onOpenChange={setIsNewUserModalOpen}>
        <DialogContent className="max-w-md bg-white border border-[#E6E2D8] shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg text-[#1E3A5F] flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-[#C9A227]" />
              Cadastrar Novo Login de Secretário
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5A5A5A]">
              Preencha o e-mail informado pelo secretário e defina a senha inicial de acesso.
              Forneça essa senha para que ele possa entrar no sistema.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateNewUser} className="space-y-3.5 py-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Perfil do Usuário</label>
              <select
                value={newUserPerfil}
                onChange={(e) => setNewUserPerfil(e.target.value as any)}
                className="w-full h-9 rounded-md border border-[#E6E2D8] px-3 text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#C9A227]"
              >
                <option value="secretario1">
                  1º Secretário (Acesso completo exceto financeiro)
                </option>
                <option value="secretario2">
                  2º Secretário (Acesso completo exceto financeiro)
                </option>
                <option value="tesoureiro">Tesoureiro Adicional (Acesso total)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Nome de Exibição</label>
              <Input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Ex: Irmão Valderlanio Araújo"
                className="text-xs border-[#E6E2D8]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">E-mail do Secretário *</label>
              <Input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="secretario@email.com"
                className="text-xs border-[#E6E2D8]"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Senha Inicial (mínimo 6 caracteres) *
              </label>
              <Input
                type="password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                placeholder="Digite a senha a fornecer..."
                className="text-xs border-[#E6E2D8]"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Confirmar Senha Inicial *
              </label>
              <Input
                type="password"
                value={newUserPasswordConfirm}
                onChange={(e) => setNewUserPasswordConfirm(e.target.value)}
                placeholder="Repita a senha inicial..."
                className="text-xs border-[#E6E2D8]"
                required
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-[#E6E2D8]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsNewUserModalOpen(false)}
                disabled={isCreatingUser}
                className="text-xs flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isCreatingUser || !newUserEmail || !newUserPassword}
                className="bg-[#1E3A5F] hover:bg-[#16304F] text-white text-xs flex-1 font-semibold"
              >
                {isCreatingUser ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Cadastrando...
                  </>
                ) : (
                  'Cadastrar e Autorizar'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL DE PRÉ-VISUALIZAÇÃO DA ASSINATURA PROCESSADA */}
      <Dialog open={!!pendingSig} onOpenChange={(open) => !open && setPendingSig(null)}>
        <DialogContent className="max-w-md bg-white border border-[#E6E2D8] shadow-2xl rounded-2xl">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-amber-50 text-[#C9A227] flex items-center justify-center mx-auto mb-2 border border-amber-200">
              <Sparkles className="w-5 h-5" />
            </div>
            <DialogTitle className="text-center font-serif text-lg text-[#1E3A5F]">
              Pré-visualização da Assinatura
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-[#5A5A5A]">
              {pendingSig?.title}. O traço foi detectado, recortado com respiro de ~12px e o fundo
              transformado em transparente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="p-4 bg-[repeating-conic-gradient(#e2e8f0_0_25%,transparent_0_50%)] bg-[length:16px_16px] rounded-xl border border-[#CBD5E1] flex items-center justify-center min-h-[140px] shadow-inner">
              {pendingSig?.previewUrl && (
                <img
                  src={pendingSig.previewUrl}
                  alt="Pré-visualização tratada"
                  className="max-h-28 max-w-full object-contain filter drop-shadow-sm"
                />
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 bg-[#F7F5F0] p-2.5 rounded-lg border border-[#E6E2D8]">
              <span>Formato: PNG transparente</span>
              {pendingSig?.width ? (
                <span>
                  Dimensões: {pendingSig.width} × {pendingSig.height}px
                </span>
              ) : null}
              <span className="text-emerald-700 font-semibold">Otimizada para documentos</span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-[#E6E2D8]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingSig(null)}
              disabled={!!uploadingSigKey}
              className="text-xs flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmarAssinatura}
              disabled={!!uploadingSigKey}
              className="bg-[#1E3A5F] hover:bg-[#16304F] text-white text-xs flex-1 font-semibold"
            >
              {uploadingSigKey ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Gravando...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 mr-1.5 text-[#C9A227]" />
                  Confirmar e Gravar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* MODAL DE CONFIRMAÇÃO DUPLA: ZERAR DADOS DO SISTEMA */}
      <Dialog
        open={isZerarModalOpen}
        onOpenChange={(open) => {
          if (!isZerandoDados) {
            setIsZerarModalOpen(open)
            if (!open) {
              setZerarConfirmacaoTexto('')
              setResultadoZerar(null)
            }
          }
        }}
      >
        <DialogContent className="max-w-xl bg-white border border-[#E6E2D8] shadow-2xl rounded-2xl">
          <DialogHeader>
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-2 border border-rose-200">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <DialogTitle className="text-center font-serif text-xl font-bold text-rose-950">
              Atenção: Zerar Dados Operacionais
            </DialogTitle>
            <DialogDescription className="text-center text-xs sm:text-sm text-slate-600">
              Esta ação irreversível apaga todo o histórico e cadastros operacionais da instância
              para prepará-la para um novo cliente ou recomeço.
            </DialogDescription>
          </DialogHeader>

          {!resultadoZerar ? (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 space-y-1.5">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-rose-700 block">
                    ❌ O que será APAGADO:
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-900 leading-relaxed">
                    <li>Membros e Congregados</li>
                    <li>Obreiros e Escalas de Trabalho</li>
                    <li>Dizimistas e Planilhas Mensais</li>
                    <li>Bens de Patrimônio</li>
                    <li>Calendário e Agenda Semanal</li>
                    <li>Salmos, Álbuns e Fotos</li>
                    <li>Cartas Oficiais e Solicitações</li>
                  </ul>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-1.5">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-700 block">
                    ✅ O que será MANTIDO:
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-emerald-900 leading-relaxed">
                    <li>Contas de Usuários (logins e senhas)</li>
                    <li>Congregações / Unidades cadastradas</li>
                    <li>
                      Configurações institucionais da igreja (nome, endereço, cores, logos,
                      liderança)
                    </li>
                  </ul>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <label className="text-xs font-bold text-slate-800 block">
                  Confirmação obrigatória: Digite a palavra{' '}
                  <span className="font-mono text-rose-700 bg-rose-100 px-1 py-0.5 rounded">
                    ZERAR
                  </span>{' '}
                  para habilitar a exclusão:
                </label>
                <Input
                  type="text"
                  value={zerarConfirmacaoTexto}
                  disabled={isZerandoDados}
                  onChange={(e) => setZerarConfirmacaoTexto(e.target.value)}
                  placeholder="Digite ZERAR em maiúsculas..."
                  className="font-mono text-sm uppercase bg-white border-slate-300 focus:border-rose-500 focus:ring-rose-500"
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsZerarModalOpen(false)}
                  disabled={isZerandoDados}
                  className="text-xs flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleExecutarZerarDados}
                  disabled={
                    isZerandoDados || zerarConfirmacaoTexto.trim().toUpperCase() !== 'ZERAR'
                  }
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs flex-1 font-bold shadow-xs"
                >
                  {isZerandoDados ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Apagando registros...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Confirmar e Zerar Agora
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <Check className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-emerald-900 text-sm">Dados zerados com êxito!</h4>
                <p className="text-xs text-emerald-800">
                  Foram apagados <strong>{resultadoZerar.totalDeleted}</strong> registros
                  operacionais. As congregações, configurações e logins de usuários permanecem
                  intactos.
                </p>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Contagem de registros removidos por coleção:
                </span>
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2.5 bg-slate-50 space-y-1 text-xs font-mono">
                  {Object.entries(resultadoZerar.counts).map(([col, qty]) => (
                    <div
                      key={col}
                      className="flex items-center justify-between py-0.5 border-b border-slate-100 last:border-0"
                    >
                      <span className="text-slate-700">{col}</span>
                      <span className="font-semibold text-rose-700">{qty} apagado(s)</span>
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter className="pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  onClick={() => {
                    setIsZerarModalOpen(false)
                    setResultadoZerar(null)
                    setZerarConfirmacaoTexto('')
                  }}
                  className="w-full bg-[#1E3A5F] hover:bg-[#16304F] text-white text-xs font-semibold"
                >
                  Concluir e Fechar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AdminConfig
