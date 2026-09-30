import React from 'react'
import { formatarDataBr } from '@/lib/utils'
import { ADTC_LOGO_URL, ADTC_TOCHA_WATERMARK_DATA_URI } from '@/components/AdtcLogo'
import { useChurchConfig } from '@/contexts/ChurchConfigContext'

interface CertificadoApresentacaoProps {
  nomeCrianca: string
  dataNascimento: string
  nomePai: string
  nomeMae: string
  dataApresentacao: string
  pastorOficiante: string
}

export const CertificadoApresentacaoVisual: React.FC<CertificadoApresentacaoProps> = ({
  nomeCrianca,
  dataNascimento,
  nomePai,
  nomeMae,
  dataApresentacao,
  pastorOficiante,
}) => {
  const { config } = useChurchConfig()
  return (
    <div className="certificado-apresentacao-container relative w-full max-w-[720px] mx-auto rounded-xl p-6 sm:p-10 text-[#0F325E] shadow-2xl border-4 border-[#C9A227] overflow-hidden bg-[#FAF8F5]">
      {/* Moldura ornamental interna */}
      <div className="absolute inset-2.5 border-2 border-[#C9A227] rounded-lg pointer-events-none" />
      <div className="absolute inset-3.5 border border-[#0F325E]/30 rounded-md pointer-events-none" />

      {/* Marca d'água sutil ao centro (Tocha/Chama dourada sem fundo quadrado) */}
      <img
        src={ADTC_TOCHA_WATERMARK_DATA_URI}
        alt=""
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 opacity-5 pointer-events-none object-contain"
      />

      {/* Cabeçalho Oficial Timbrado com Faixa Azul-Marinho */}
      <div className="relative z-10 rounded-lg bg-gradient-to-r from-[#072348] via-[#0F325E] to-[#163B6E] p-3.5 border-b-2 border-[#C9A227] shadow-sm flex items-center justify-center gap-3.5 text-white mb-4">
        <div className="w-14 h-14 rounded-full bg-[#072348] p-0.5 border-2 border-[#C9A227] shadow-md flex-shrink-0">
          <img
            src={ADTC_LOGO_URL}
            alt="Logo ADTC"
            className="w-full h-full object-cover rounded-full"
            onError={(e) => {
              ;(e.target as HTMLImageElement).src = '/logo-oficial.png'
            }}
          />
        </div>
        <div className="text-left">
          <h1 className="font-serif text-base sm:text-lg font-bold uppercase tracking-wide text-white leading-tight">
            {config.denominacao || 'Igreja Evangélica'}
          </h1>
          <h2 className="text-xs uppercase tracking-widest text-[#F3CA52] font-bold">
            {config.subtituloIgreja || config.nomeIgreja || 'Comunidade'}
          </h2>
          <p className="text-[10px] text-slate-200 font-sans mt-0.5">
            {config.enderecoIgreja || 'Endereço da Igreja'}
          </p>
        </div>
      </div>

      {/* Título do Certificado com filetes dourados */}
      <div className="relative z-10 text-center my-4 space-y-1.5">
        <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-[#8C6D15] block">
          Registro Eclesiástico Solene
        </span>
        <div className="flex items-center justify-center gap-3">
          <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent via-[#C9A227] to-transparent" />
          <h2 className="font-serif text-xl sm:text-2xl font-bold uppercase tracking-wider text-[#0F325E] drop-shadow-xs">
            Certidão de Apresentação de Criança
          </h2>
          <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent via-[#C9A227] to-transparent" />
        </div>
        <p className="font-serif italic text-xs text-slate-700 max-w-lg mx-auto pt-1 bg-[#F3EEDB] border-l-3 border-[#C9A227] p-1.5 rounded-r">
          "Trouxeram-lhe, então, algumas crianças, para que lhes impusesse as mãos e orasse..."
          (Mateus 19:13 - Bíblia ARC)
        </p>
      </div>

      {/* Corpo do Documento */}
      <div className="relative z-10 bg-white/70 backdrop-blur-xs rounded-xl p-6 sm:p-8 border border-[#C9A227]/40 shadow-xs space-y-5 text-sm sm:text-base leading-relaxed text-slate-800">
        <p className="indent-8 text-justify font-serif">
          Certificamos solenemente que, em culto de louvor e adoração ao Todo-Poderoso realizado no
          templo da <strong>{config.nomeIgreja || 'Igreja'}</strong>, foi apresentada ao Senhor
          Jesus Cristo a criança:
        </p>

        {/* Destaque com o Nome da Criança */}
        <div className="text-center py-3 border-y-2 border-[#C9A227]/40 bg-white/60 rounded-lg">
          <span className="font-serif text-2xl sm:text-3xl font-extrabold text-[#1E3A5F] block tracking-wide">
            {nomeCrianca || 'Nome da Criança'}
          </span>
          <span className="text-xs font-sans text-slate-600 block mt-1">
            Nascido(a) em:{' '}
            <strong className="text-[#1E3A5F]">
              {dataNascimento ? formatarDataBr(dataNascimento) : 'Data não informada'}
            </strong>
          </span>
        </div>

        {/* Filiação */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm pt-1">
          <div className="p-2.5 rounded-lg bg-white/80 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Pai</span>
            <span className="font-serif font-bold text-[#1E3A5F] text-sm">
              {nomePai || 'Não informado'}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-white/80 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Mãe</span>
            <span className="font-serif font-bold text-[#1E3A5F] text-sm">
              {nomeMae || 'Não informada'}
            </span>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-justify font-serif">
          Tendo sido impetrada sobre a sua vida a oração pastoral de consagração e bênção para que
          cresça em graça, estatura e sabedoria diante de Deus e dos homens (Lucas 2:52).
        </p>
      </div>

      {/* Assinaturas */}
      <div className="relative z-10 pt-10 grid grid-cols-1 sm:grid-cols-2 gap-8 text-center text-xs">
        <div>
          <div className="w-56 border-t border-slate-800 mx-auto mb-1.5" />
          <p className="font-bold text-sm text-[#1E3A5F] font-serif">{pastorOficiante}</p>
          <p className="text-[10px] text-slate-600 font-sans uppercase tracking-wider font-semibold">
            Pastor Oficiante • {config.siglaIgreja || 'Igreja'}
          </p>
        </div>

        <div>
          <div className="w-56 border-t border-slate-800 mx-auto mb-1.5" />
          <p className="font-bold text-sm text-[#1E3A5F] font-serif">
            {nomePai || nomeMae || 'Pais / Responsáveis'}
          </p>
          <p className="text-[10px] text-slate-600 font-sans uppercase tracking-wider font-semibold">
            Assinatura dos Responsáveis
          </p>
        </div>
      </div>

      {/* Data e Local */}
      <div className="relative z-10 text-center pt-6 text-[11px] text-slate-600 font-sans">
        {config.cidadeUf || 'Localidade'}, apresentada ao Senhor em{' '}
        <strong className="text-[#0F325E]">
          {dataApresentacao
            ? formatarDataBr(dataApresentacao)
            : formatarDataBr(new Date().toISOString().slice(0, 10))}
        </strong>
        .
      </div>

      <div className="relative z-10 mt-4 pt-2 border-t border-dashed border-[#C9A227]/70 text-center text-[9px] uppercase tracking-wider text-[#8C6D15] font-sans font-semibold">
        {config.nomeIgreja || 'Igreja'} • {config.enderecoIgreja || ''}
      </div>
    </div>
  )
}

export default CertificadoApresentacaoVisual
