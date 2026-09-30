migrate(
  (app) => {
    // Idempotente: ajustar eventos do calendário para meio-dia UTC (12:00:00.000Z)
    // para blindar contra qualquer engine ou visualizador que tente converter meia-noite UTC (00:00:00) para fuso local.
    // Além disso, corrige qualquer data_termino inconsistente no evento 'Dia da biblia' (ex: 2026-09-12 -> 2026-12-12).
    const records = app.findRecordsByFilter('calendario', "id != ''", 'created', 200, 0)
    for (const rec of records) {
      let changed = false
      const dInicio = rec.getString('data_inicio')
      const dTermino = rec.getString('data_termino')

      // Se início estiver com 00:00:00, ajusta para 12:00:00
      if (dInicio && dInicio.includes('00:00:00')) {
        const ymd = dInicio.slice(0, 10)
        rec.set('data_inicio', `${ymd} 12:00:00.000Z`)
        changed = true
      }

      // Caso específico do evento 'Dia da biblia' cujo término ficou registrado em setembro por engano
      if (rec.getString('titulo') === 'Dia da biblia') {
        const inicioYmd = (rec.getString('data_inicio') || '').slice(0, 10)
        if (inicioYmd === '2026-12-12') {
          rec.set('data_inicio', '2026-12-12 12:00:00.000Z')
          rec.set('data_termino', '2026-12-12 12:00:00.000Z')
          changed = true
        }
      } else if (dTermino && dTermino.includes('00:00:00')) {
        const ymd = dTermino.slice(0, 10)
        rec.set('data_termino', `${ymd} 12:00:00.000Z`)
        changed = true
      }

      if (changed) {
        app.save(rec)
      }
    }
  },
  (app) => {
    // down: no-op
  },
)
