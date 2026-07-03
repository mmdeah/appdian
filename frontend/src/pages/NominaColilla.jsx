import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { nominaApi } from '../api/client'
import './NominaColilla.css'

const COP = n => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)

function FilaDet({ label, valor, bold, sub }) {
  return (
    <tr className={bold ? 'tr-bold' : sub ? 'tr-sub' : ''}>
      <td>{label}</td>
      <td className="td-right">{COP(valor)}</td>
    </tr>
  )
}

function periodoLabel(p) {
  if (!p) return ''
  const [y, m] = p.split('-')
  return new Date(y, m - 1, 1).toLocaleString('es-CO', { month: 'long', year: 'numeric' })
}

export default function NominaColilla() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    nominaApi.colilla(id)
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="col-loading"><div className="spinner" /></div>
  if (!data)   return <div className="col-loading">No encontrado</div>

  const { detalle: d, empresa: emp, periodo } = data

  return (
    <div className="colilla-page">
      {/* Botones solo visibles en pantalla, no en impresión */}
      <div className="col-acciones no-print">
        <button className="btn-back-col" onClick={() => navigate(-1)}>← Volver</button>
        <button className="btn-imprimir" onClick={() => window.print()}>
          🖨️ Imprimir / Guardar PDF
        </button>
      </div>

      {/* Colilla */}
      <div className="colilla">
        {/* Encabezado */}
        <div className="col-head">
          <div className="col-empresa">
            <h2 className="col-empresa-nombre">{emp?.nombre}</h2>
            <p className="col-empresa-nit">NIT: {emp?.nit}</p>
            {emp?.direccion && <p className="col-empresa-dir">{emp.direccion}</p>}
          </div>
          <div className="col-titulo-box">
            <h1 className="col-titulo">COMPROBANTE DE PAGO</h1>
            <p className="col-periodo">Período: {periodoLabel(periodo)}</p>
          </div>
        </div>

        <hr className="col-hr" />

        {/* Datos del empleado */}
        <div className="col-empleado-grid">
          <div><span className="col-field-label">Empleado</span><span className="col-field-val">{d.nombre_empleado}</span></div>
          <div><span className="col-field-label">Identificación</span><span className="col-field-val">{d.num_doc}</span></div>
          <div><span className="col-field-label">Cargo</span><span className="col-field-val">{d.cargo}</span></div>
          <div><span className="col-field-label">Salario base</span><span className="col-field-val">{COP(d.salario_base)}</span></div>
          <div><span className="col-field-label">Días trabajados</span><span className="col-field-val">{d.dias_trabajados}</span></div>
        </div>

        <hr className="col-hr" />

        {/* Tablas devengos / deducciones */}
        <div className="col-tablas">
          {/* Devengos */}
          <div className="col-tabla-wrap">
            <h3 className="col-tabla-titulo devengos">DEVENGOS</h3>
            <table className="col-tabla">
              <tbody>
                <FilaDet label="Salario básico"         valor={d.salario} />
                {d.auxilio_transporte > 0 && <FilaDet label="Auxilio de transporte" valor={d.auxilio_transporte} />}
                {d.horas_extras > 0       && <FilaDet label="Horas extras"          valor={d.horas_extras} />}
                {d.bonificaciones > 0     && <FilaDet label="Bonificaciones"         valor={d.bonificaciones} />}
                <tr className="tr-total devengos-total">
                  <td>TOTAL DEVENGADO</td>
                  <td className="td-right">{COP(d.total_devengado)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Deducciones */}
          <div className="col-tabla-wrap">
            <h3 className="col-tabla-titulo deducciones">DEDUCCIONES</h3>
            <table className="col-tabla">
              <tbody>
                <FilaDet label="Salud (4%)"        valor={d.ded_salud} />
                <FilaDet label="Pensión (4%)"      valor={d.ded_pension} />
                {d.ded_retencion > 0 && <FilaDet label="Retención en la fuente" valor={d.ded_retencion} />}
                {d.ded_otros > 0     && <FilaDet label="Otros descuentos"       valor={d.ded_otros} />}
                <tr className="tr-total deducciones-total">
                  <td>TOTAL DEDUCCIONES</td>
                  <td className="td-right">{COP(d.total_deducciones)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Neto */}
        <div className="col-neto">
          <span className="col-neto-label">NETO A PAGAR</span>
          <span className="col-neto-val">{COP(d.neto_pagar)}</span>
        </div>

        <hr className="col-hr" />

        {/* Aportes empleador */}
        <div className="col-aportes">
          <h3 className="col-tabla-titulo">APORTES EMPLEADOR (referencia)</h3>
          <div className="aportes-grid">
            <div><span>Salud (8.5%)</span><span>{COP(d.ap_salud)}</span></div>
            <div><span>Pensión (12%)</span><span>{COP(d.ap_pension)}</span></div>
            <div><span>ARL</span><span>{COP(d.ap_arl)}</span></div>
            <div><span>SENA (2%)</span><span>{COP(d.ap_sena)}</span></div>
            <div><span>ICBF (3%)</span><span>{COP(d.ap_icbf)}</span></div>
            <div><span>Caja comp. (4%)</span><span>{COP(d.ap_caja)}</span></div>
            <div className="aportes-total"><span>TOTAL APORTES</span><span>{COP(d.total_aportes)}</span></div>
          </div>
        </div>

        {/* Provisiones */}
        <div className="col-provisiones">
          <h3 className="col-tabla-titulo">PROVISIONES DEL MES</h3>
          <div className="aportes-grid">
            <div><span>Prima servicios</span><span>{COP(d.prov_prima)}</span></div>
            <div><span>Cesantías</span><span>{COP(d.prov_cesantias)}</span></div>
            <div><span>Int. cesantías</span><span>{COP(d.prov_int_cesantias)}</span></div>
            <div><span>Vacaciones</span><span>{COP(d.prov_vacaciones)}</span></div>
          </div>
        </div>

        {/* Pie */}
        <div className="col-pie">
          <div className="col-firma">
            <div className="col-firma-linea" />
            <p>Firma empleador</p>
          </div>
          <div className="col-firma">
            <div className="col-firma-linea" />
            <p>Firma empleado / Recibí conforme</p>
          </div>
        </div>

        <p className="col-generado">Generado por AppDian · {new Date().toLocaleDateString('es-CO')}</p>
      </div>
    </div>
  )
}
