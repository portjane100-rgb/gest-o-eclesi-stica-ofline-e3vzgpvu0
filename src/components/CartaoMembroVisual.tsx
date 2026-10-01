import React from 'react'
import type { Membro } from '@/types/adtc'
import { formatarDataBr } from '@/lib/utils'
import { getFileUrl } from '@/lib/dataClient'
import { ADTC_LOGO_URL } from '@/components/AdtcLogo'
import { useChurchConfig } from '@/contexts/ChurchConfigContext'

interface CartaoMembroVisualProps {
  membro: Membro
  funcao?: string
  dataEmissao?: string
  pastorPresidente?: string
  assinaturaPastorUrl?: string | null
  showVerso?: boolean
}

export const CartaoMembroVisual: React.FC<CartaoMembroVisualProps> = ({
  membro,
  funcao = 'Membro em Comunhão',
  dataEmissao = new Date().toLocaleDateString('pt-BR'),
  pastorPresidente,
  assinaturaPastorUrl = null,
}) => {
  const { config } = useChurchConfig()
  const pastorNome = pastorPresidente || config.nomePastor || 'Pastor Presidente'
  // Extrair pai e mãe do campo filiacao se disponível
  let nomePai = ''
  let nomeMae = ''
  if (membro.filiacao) {
    if (membro.filiacao.toLowerCase().includes(' e ')) {
      const parts = membro.filiacao.split(/\s+e\s+/i)
      nomePai = parts[0]?.trim() || ''
      nomeMae = parts.slice(1).join(' e ').trim() || ''
    } else {
      nomeMae = membro.filiacao.trim()
    }
  }

  const registroDisplay = membro.numero_registro || membro.numero_ficha || 'ADTC-001'
  const batismoDisplay = membro.data_batismo
    ? formatarDataBr(membro.data_batismo)
    : membro.data_batismo_texto || '—'
  const nascimentoDisplay = membro.data_nascimento
    ? formatarDataBr(membro.data_nascimento)
    : membro.data_nascimento_texto || '—'

  const fotoUrl = membro.foto ? getFileUrl(membro, membro.foto) : null

  return (
    <div className="cartao-membro-container flex flex-col md:flex-row gap-6 justify-center items-center p-4">
      {/* ===================== FRENTE DO CARTÃO ===================== */}
      <div
        className="cartao-lado cartao-frente relative w-[460px] h-[300px] rounded-2xl overflow-hidden shadow-2xl border-2 border-[#0D2544] select-none text-white flex flex-col justify-between"
        style={{
          background: 'linear-gradient(135deg, #073B72 0%, #0c4d8f 35%, #185a9d 70%, #0d2847 100%)',
          boxShadow:
            '0 15px 35px -5px rgba(7, 43, 82, 0.45), 0 0 0 1px rgba(255,255,255,0.1) inset',
        }}
      >
        {/* Efeito de textura/brilho no fundo */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 80% 20%, rgba(201, 162, 39, 0.4) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(255, 255, 255, 0.25) 0%, transparent 60%)',
          }}
        />

        {/* Faixa Superior com Cabeçalho e Logos */}
        <div className="relative z-10 px-4 pt-3 pb-1">
          <div className="flex items-center justify-between gap-2">
            {/* Brasão Histórico da ADTC */}
            <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-white/95 rounded-full p-0.5 shadow-md border border-[#C9A227]">
              <img
                src="/brasao-historico.jpg"
                alt="Brasão ADTC"
                className="w-full h-full object-contain rounded-full"
                onError={(e) => {
                  // Fallback para a logo oficial se o brasão falhar
                  ;(e.target as HTMLImageElement).src = ADTC_LOGO_URL
                }}
              />
            </div>

            {/* Texto do Cabeçalho Oficial */}
            <div className="flex-1 text-center leading-none px-1">
              <h2 className="text-[12px] font-black uppercase tracking-wider text-white drop-shadow-sm font-sans">
                {config.denominacao?.toUpperCase() || 'IGREJA EVANGÉLICA'}
              </h2>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-amber-300 mt-0.5">
                {(config.subtituloIgreja || config.nomeIgreja || 'TEMPLO CENTRAL').toUpperCase()}
              </h3>
              <p className="text-[8.5px] font-medium text-slate-200 mt-0.5">
                {config.enderecoIgreja || 'Endereço'}
              </p>
              <p className="text-[8.5px] font-semibold text-slate-300 tracking-wide">
                {config.cidadeUf || ''}
              </p>
            </div>
          </div>

          {/* Linha separadora dourada decorativa */}
          <div className="mt-1.5 h-[2px] bg-gradient-to-r from-transparent via-[#C9A227] to-transparent" />
        </div>

        {/* Título "CARTÃO DE MEMBRO" e Campo Registro */}
        <div className="relative z-10 px-4 flex items-center justify-between mt-0.5">
          <span className="text-[18px] font-black uppercase tracking-wider text-white drop-shadow-md font-sans">
            CARTÃO DE MEMBRO
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
              Registro:
            </span>
            <div className="bg-white text-[#073B72] font-mono font-bold text-[11px] px-2.5 py-0.5 rounded-md shadow-inner border border-slate-300 min-w-[65px] text-center">
              {registroDisplay}
            </div>
          </div>
        </div>

        {/* Corpo: Foto (à esquerda) e Campos (à direita) */}
        <div className="relative z-10 px-4 pb-2 flex gap-3.5 items-center">
          {/* Foto 3x4 do Membro */}
          <div className="w-[100px] h-[125px] rounded-lg bg-white p-1 shadow-md border-2 border-[#C9A227] flex-shrink-0 flex items-center justify-center overflow-hidden">
            {fotoUrl ? (
              <img src={fotoUrl} alt={membro.nome} className="w-full h-full object-cover rounded" />
            ) : (
              <div className="w-full h-full bg-slate-100 rounded flex flex-col items-center justify-center text-slate-400">
                <svg className="w-10 h-10 text-slate-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
                <span className="text-[9px] font-sans font-semibold mt-1">FOTO 3x4</span>
              </div>
            )}
          </div>

          {/* Campos Preenchidos com Cápsulas Brancas (estilo oficial) */}
          <div className="flex-1 space-y-1.5 text-[#1E3A5F]">
            {/* Campo Nome */}
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-200 block pl-1 drop-shadow-xs">
                Nome
              </span>
              <div className="bg-white rounded-md px-2.5 py-0.5 text-[11px] font-bold text-[#0D2544] truncate shadow-inner border border-slate-200">
                {membro.nome || '—'}
              </div>
            </div>

            {/* Campo Pai */}
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-200 block pl-1 drop-shadow-xs">
                Pai
              </span>
              <div className="bg-white rounded-md px-2.5 py-0.5 text-[10px] font-medium text-slate-800 truncate shadow-inner border border-slate-200">
                {nomePai || '—'}
              </div>
            </div>

            {/* Campo Mãe */}
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-200 block pl-1 drop-shadow-xs">
                Mãe
              </span>
              <div className="bg-white rounded-md px-2.5 py-0.5 text-[10px] font-medium text-slate-800 truncate shadow-inner border border-slate-200">
                {nomeMae || '—'}
              </div>
            </div>

            {/* Emissão e Função lado a lado */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-200 block pl-1 drop-shadow-xs">
                  Emissão
                </span>
                <div className="bg-white rounded-md px-2 py-0.5 text-[10px] font-semibold text-slate-800 truncate shadow-inner border border-slate-200 text-center">
                  {dataEmissao}
                </div>
              </div>
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-200 block pl-1 drop-shadow-xs">
                  Função
                </span>
                <div className="bg-white rounded-md px-2 py-0.5 text-[10px] font-bold text-[#073B72] truncate shadow-inner border border-slate-200 text-center">
                  {funcao}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé da Frente com texto de observação legal */}
        <div className="relative z-10 bg-[#062142] py-1 px-3 text-center border-t border-white/15">
          <p className="text-[7.5px] font-semibold text-slate-200 tracking-tight">
            Obs: É válida enquanto o portador se mantiver de acordo com os ensinamentos bíblicos e
            as normas desta igreja.:
          </p>
        </div>
      </div>

      {/* ===================== VERSO DO CARTÃO ===================== */}
      <div
        className="cartao-lado cartao-verso relative w-[460px] h-[300px] rounded-2xl overflow-hidden shadow-2xl border-2 border-[#0D2544] select-none text-white flex flex-col justify-between"
        style={{
          background: 'linear-gradient(135deg, #073B72 0%, #0c4d8f 35%, #185a9d 70%, #0d2847 100%)',
          boxShadow:
            '0 15px 35px -5px rgba(7, 43, 82, 0.45), 0 0 0 1px rgba(255,255,255,0.1) inset',
        }}
      >
        {/* Efeito de textura */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(201, 162, 39, 0.4) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.25) 0%, transparent 60%)',
          }}
        />

        {/* Faixa Superior com o Versículo Bíblico (Cl. 2.6) */}
        <div className="relative z-10 px-4 pt-3 pb-1 text-center">
          <p className="text-[10px] font-bold text-amber-300 italic tracking-wide drop-shadow-sm font-serif">
            "Como pois recebestes o Senhor Jesus Cristo, assim andai nEle" Cl. 2.6
          </p>
          <div className="mt-1 h-[2px] bg-gradient-to-r from-transparent via-[#C9A227] to-transparent" />
        </div>

        {/* Grid de Campos Pessoais em Cápsulas Brancas */}
        <div className="relative z-10 px-4 space-y-1.5 flex-1 flex flex-col justify-center">
          {/* Linha 1: Nascimento e Nascionalidade (sic) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-200 block pl-1">
                Nascimento
              </span>
              <div className="bg-white rounded-md px-2.5 py-0.5 text-[10px] font-semibold text-slate-800 shadow-inner border border-slate-200 text-center truncate">
                {nascimentoDisplay}
              </div>
            </div>
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-200 block pl-1">
                Nascionalidade
              </span>
              <div className="bg-white rounded-md px-2.5 py-0.5 text-[10px] font-semibold text-slate-800 shadow-inner border border-slate-200 text-center truncate">
                Brasileira
              </div>
            </div>
          </div>

          {/* Linha 2: Naturalidade e Estado Civil */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-200 block pl-1">
                Naturalidade
              </span>
              <div className="bg-white rounded-md px-2.5 py-0.5 text-[10px] font-semibold text-slate-800 shadow-inner border border-slate-200 text-center truncate">
                {membro.naturalidade || '—'}
              </div>
            </div>
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-200 block pl-1">
                Estado Civil
              </span>
              <div className="bg-white rounded-md px-2.5 py-0.5 text-[10px] font-semibold text-slate-800 shadow-inner border border-slate-200 text-center truncate">
                {membro.estado_civil || '—'}
              </div>
            </div>
          </div>

          {/* Linha 3: Batismo e CPF */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-200 block pl-1">
                Batismo
              </span>
              <div className="bg-white rounded-md px-2.5 py-0.5 text-[10px] font-semibold text-slate-800 shadow-inner border border-slate-200 text-center truncate">
                {batismoDisplay}
              </div>
            </div>
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-200 block pl-1">
                CPF
              </span>
              <div className="bg-white rounded-md px-2.5 py-0.5 text-[10px] font-mono font-semibold text-slate-800 shadow-inner border border-slate-200 text-center truncate">
                {membro.cpf || '—'}
              </div>
            </div>
          </div>

          {/* Texto de Validade Institucional */}
          <div className="pt-1 text-center px-2">
            <p className="text-[8.5px] font-semibold text-slate-200 leading-tight">
              Este cartão só terá validade enquanto o seu portador além de conservar-se fiel aos
              princípios biblicos, permanecer vinculado à entidade emitente.
            </p>
          </div>
        </div>

        {/* Linha de Assinatura do Pastor Presidente */}
        <div className="relative z-10 px-6 pb-2.5 pt-1 text-center">
          <div className="bg-white rounded-md p-1.5 shadow-inner border border-slate-200 max-w-[280px] mx-auto relative">
            {assinaturaPastorUrl && (
              <div className="flex justify-center -mb-2">
                <img
                  src={assinaturaPastorUrl}
                  alt="Assinatura Pastor"
                  className="h-9 max-w-[140px] object-contain pointer-events-none"
                />
              </div>
            )}
            <div
              className={`w-full border-t border-slate-700 ${assinaturaPastorUrl ? 'mt-0' : 'mt-5'} pt-0.5 text-center`}
            >
              <span className="text-[10px] font-bold italic font-serif text-[#0D2544] block leading-none">
                Pastor presidente
              </span>
              <span className="text-[8.5px] font-sans text-slate-600 block mt-0.5">
                {pastorNome}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CartaoMembroVisual
