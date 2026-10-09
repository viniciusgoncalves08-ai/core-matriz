"use client";
import { reminderLabels, type ReminderInput } from "./reminder-schema";
export function ReminderFields({ input, onChange, disabled, showStatus = true }: { input: ReminderInput; onChange: (value: ReminderInput) => void; disabled: boolean; showStatus?: boolean }) {
  return <>
    <label>Lembrete<input required minLength={2} maxLength={200} value={input.title} disabled={disabled} onChange={event => onChange({ ...input, title: event.target.value })} /></label>
    <div className="work-fields"><label>Data · Brasília<input type="date" required value={input.date} disabled={disabled} onChange={event => onChange({ ...input, date: event.target.value })} /></label><label>Hora · Brasília<input type="time" required value={input.time} disabled={disabled} onChange={event => onChange({ ...input, time: event.target.value })} /></label></div>
    {showStatus && <label>Situação<select value={input.status} disabled={disabled} onChange={event => onChange({ ...input, status: event.target.value as ReminderInput["status"] })}>{Object.entries(reminderLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
    <p className="muted">Horário de Brasília. O aviso aparece dentro do app quando vencer; não envia push, e-mail nem executa o conteúdo do lembrete. Ao reagendar, escolha uma data futura e a situação Agendado.</p>
  </>;
}
